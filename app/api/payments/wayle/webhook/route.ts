import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getWayleConfig } from '@/lib/wayle/config'
import {
  verifyWebhookSignature,
  WAYLE_SIGNATURE_HEADER,
} from '@/lib/wayle/signature'
import { normaliseWebhookPayload, isAcceptedStatus } from '@/lib/wayle/client'
import { cancelOrderAndReleaseStock } from '@/lib/orders/stock'

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

  // ── Terminal states ─────────────────────────────────────────────────────
  //
  // PAID is a plain duplicate. FAILED and EXPIRED are not: we gave up on those
  // orders, cancelled them and released their stock. A COMPLETED event arriving
  // for one of them means the customer WAS charged for an order that no longer
  // exists — most commonly when a card is declined (we mark FAILED) and the
  // payer immediately retries on the same Wayle link with a different card.
  //
  // Swallowing that silently loses the customer's money with no trace, so it is
  // recorded for reconciliation. It deliberately does NOT auto-reinstate: the
  // released stock may since have been sold to someone else.
  const TERMINAL_STATUSES = ['PAID', 'FAILED', 'EXPIRED'] as const

  if ((TERMINAL_STATUSES as readonly string[]).includes(intent.status)) {
    const wasAbandonedByUs = intent.status !== 'PAID'

    if (wasAbandonedByUs && isAcceptedStatus(event.status)) {
      console.error(
        `PAYMENT RECEIVED AFTER ORDER WAS ${intent.status} — REFUND OR REINSTATE MANUALLY`,
        {
          referenceId: event.referenceId,
          orderId: intent.orderId,
          userId: intent.userId,
          amountIqd: intent.amountIqd,
          providerPaymentId: event.paymentId,
          previousFailureReason: intent.failureReason,
        }
      )
      await prisma.paymentIntent.updateMany({
        where: { id: intent.id, status: intent.status },
        data: {
          failureReason: `PAID_AFTER_${intent.status}_NEEDS_RECONCILIATION`,
          providerPaymentId: event.paymentId ?? intent.providerPaymentId,
          completedAt: event.completedAt ? new Date(event.completedAt) : new Date(),
        },
      })
    }

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
        data: { paymentStatus: 'FAILED' },
      })

      // Cancels and releases the reservation in one guarded step. If an admin
      // already cancelled this order by hand, the stock is back on the shelf
      // and this correctly does nothing rather than returning it twice.
      await cancelOrderAndReleaseStock(tx, intent.orderId)
    })

    return NextResponse.json({ received: true }, { status: 200 })
  }

  // ── Payment completed — validate the amount before fulfilling ───────────
  // An amount we cannot parse is NOT the same as an amount that is wrong.
  // Cancelling here would void an order the customer has already paid for, on
  // nothing more than a formatting quirk. Leave the intent PENDING so a
  // corrected redelivery can still fulfil it, and flag it for a human.
  if (!Number.isFinite(event.amount)) {
    console.error(
      'Wayle webhook has an unparseable amount — NOT fulfilling, NOT cancelling, NEEDS REVIEW',
      {
        referenceId: event.referenceId,
        orderId: intent.orderId,
        expected: intent.amountIqd,
        rawStatus: event.status,
      }
    )
    await prisma.paymentIntent.updateMany({
      where: { id: intent.id, status: 'PENDING' },
      data: { failureReason: 'AMOUNT_UNVERIFIABLE_NEEDS_REVIEW' },
    })
    return NextResponse.json({ received: true }, { status: 200 })
  }

  if (event.amount !== intent.amountIqd) {
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
        data: { paymentStatus: 'FAILED' },
      })

      await cancelOrderAndReleaseStock(tx, intent.orderId)
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

    // An admin may have cancelled this order while the payer was on Wayle's
    // page. Cancelling released its stock, so moving it back to CONFIRMED here
    // would resurrect an order holding no reservation — the same stock-minting
    // path that makes CANCELLED terminal elsewhere. Record the payment, leave
    // the cancellation standing, and flag it for a human.
    const orderRow = await tx.order.findUnique({
      where: { id: intent.orderId },
      select: { status: true },
    })
    const wasCancelled = orderRow?.status === 'CANCELLED'

    await tx.order.update({
      where: { id: intent.orderId },
      data: {
        paymentStatus: 'PAID',
        paidAt: completedAt,
        // Paid orders enter the delivery pipeline as CONFIRMED. Stock was
        // already reserved at link creation, so there is nothing to decrement.
        ...(wasCancelled ? {} : { status: 'CONFIRMED' }),
      },
    })

    if (wasCancelled) {
      console.error(
        'PAYMENT RECEIVED FOR AN ORDER CANCELLED BY STAFF — REFUND OR RE-CREATE MANUALLY',
        {
          referenceId: event.referenceId,
          orderId: intent.orderId,
          amountIqd: intent.amountIqd,
          providerPaymentId: event.paymentId,
        }
      )
      await tx.paymentIntent.update({
        where: { id: intent.id },
        data: { failureReason: 'PAID_BUT_ORDER_CANCELLED_NEEDS_RECONCILIATION' },
      })
    }
  })

  return NextResponse.json({ received: true }, { status: 200 })
}
