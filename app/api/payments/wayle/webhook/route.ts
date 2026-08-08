import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getWayleConfig } from '@/lib/wayle/config'
import {
  verifyWebhookSignature,
  WAYLE_SIGNATURE_HEADER,
} from '@/lib/wayle/signature'
import { normaliseWebhookPayload, isAcceptedStatus } from '@/lib/wayle/client'

/**
 * Wayle payment webhook.
 *
 * Contract notes that drive the shape of this handler:
 *
 * - Wayle delivers AT LEAST ONCE. Fulfilment therefore claims the intent
 *   atomically (PENDING -> PROCESSING) inside the transaction; a duplicate
 *   delivery matches 0 rows and returns 200 having changed nothing.
 * - Any non-2xx tells Wayle to retry. So a payment that legitimately did not
 *   complete still returns 200 — only genuinely unverifiable requests get 401.
 * - The amount is validated against the figure stored when the link was
 *   created, never against a recomputed price.
 */
export async function POST(request: NextRequest) {
  // Read the RAW body first. Verifying a re-serialised object would compare
  // different bytes and every signature would fail.
  const rawBody = await request.text()
  const signature = request.headers.get(WAYLE_SIGNATURE_HEADER)

  let webhookSecret: string
  try {
    webhookSecret = getWayleConfig().webhookSecret
  } catch (error) {
    // No secret configured: refuse rather than accept an unverifiable webhook.
    console.error('Wayle webhook rejected — configuration error', error)
    return NextResponse.json(
      { error: 'Payment webhook is not configured' },
      { status: 500 }
    )
  }

  if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
    console.warn('Wayle webhook rejected — invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Malformed JSON' }, { status: 400 })
  }

  const event = normaliseWebhookPayload(payload)

  if (!event.referenceId) {
    return NextResponse.json({ error: 'Missing referenceId' }, { status: 400 })
  }

  const intent = await prisma.paymentIntent.findUnique({
    where: { referenceId: event.referenceId },
    include: { order: { include: { items: true } } },
  })

  if (!intent) {
    // Signature was valid, so this is genuinely ours but unknown — do not ask
    // Wayle to retry forever.
    console.error('Wayle webhook for unknown reference', event.referenceId)
    return NextResponse.json({ received: true }, { status: 200 })
  }

  // Already settled — idempotent no-op.
  if (intent.status === 'PAID' || intent.status === 'FAILED') {
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 })
  }

  // ── Payment did not complete ────────────────────────────────────────────
  if (!isAcceptedStatus(event.status)) {
    await prisma.$transaction(async (tx) => {
      const claim = await tx.paymentIntent.updateMany({
        where: { id: intent.id, status: 'PENDING' },
        data: {
          status: 'FAILED',
          failureReason: `PROVIDER_STATUS_${event.status ?? 'UNKNOWN'}`,
        },
      })
      if (claim.count === 0) return

      await tx.order.update({
        where: { id: intent.orderId },
        data: { paymentStatus: 'FAILED', status: 'CANCELLED' },
      })

      // Release the stock reserved when the link was created.
      for (const item of intent.order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      }
    })

    return NextResponse.json({ received: true }, { status: 200 })
  }

  // ── Payment completed — validate the amount before fulfilling ───────────
  if (!Number.isFinite(event.amount) || event.amount !== intent.amountIqd) {
    // NEEDS MANUAL RECONCILIATION: the signature was valid, so money may have
    // genuinely moved for a different amount than we asked for. We refuse to
    // fulfil, but we must still release the stock we reserved — otherwise it
    // sits held forever (the expiry sweep only reclaims PENDING intents).
    console.error(
      'Wayle webhook amount mismatch — refusing to fulfil, MANUAL REVIEW REQUIRED',
      {
        referenceId: event.referenceId,
        orderId: intent.orderId,
        expected: intent.amountIqd,
        received: event.amount,
      }
    )

    await prisma.$transaction(async (tx) => {
      const claim = await tx.paymentIntent.updateMany({
        where: { id: intent.id, status: 'PENDING' },
        data: { status: 'FAILED', failureReason: 'AMOUNT_MISMATCH' },
      })
      if (claim.count === 0) return

      await tx.order.update({
        where: { id: intent.orderId },
        data: { paymentStatus: 'FAILED', status: 'CANCELLED' },
      })

      for (const item of intent.order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      }
    })

    return NextResponse.json(
      { error: 'Amount mismatch' },
      { status: 200 } // acknowledged; retrying would not help
    )
  }

  await prisma.$transaction(async (tx) => {
    // The condition IS the lock. Under READ COMMITTED two concurrent
    // deliveries would both read PENDING, but only one updateMany matches.
    const claim = await tx.paymentIntent.updateMany({
      where: { id: intent.id, status: 'PENDING' },
      data: { status: 'PROCESSING' },
    })
    if (claim.count === 0) return // another delivery owns it

    const completedAt = event.completedAt ? new Date(event.completedAt) : new Date()

    await tx.paymentIntent.update({
      where: { id: intent.id },
      data: {
        status: 'PAID',
        providerPaymentId: event.paymentId ?? intent.providerPaymentId,
        paymentMethodUsed: event.paymentMethod ?? null,
        completedAt,
      },
    })

    await tx.order.update({
      where: { id: intent.orderId },
      data: {
        paymentStatus: 'PAID',
        paidAt: completedAt,
        // Paid orders enter the delivery pipeline as CONFIRMED. Stock was
        // already reserved at link creation, so there is nothing to decrement.
        status: 'CONFIRMED',
      },
    })
  })

  return NextResponse.json({ received: true }, { status: 200 })
}
