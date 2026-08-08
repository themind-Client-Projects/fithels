import type { OrderStatus } from '@prisma/client'

/**
 * Allowed order status transitions.
 *
 * Orders move forward through fulfilment and may be cancelled at any point
 * before delivery. CANCELLED and DELIVERED are TERMINAL, and that is a
 * correctness requirement rather than a policy preference:
 *
 * - Cancelling releases the order's reserved stock. Nothing re-reserves it when
 *   an order moves back OUT of cancelled, so a cancel → un-cancel → cancel loop
 *   credited the same units on every pass and minted inventory that does not
 *   exist. Making CANCELLED terminal removes the loop entirely.
 * - Cancelling a DELIVERED order would return goods to stock that have already
 *   physically left the building.
 *
 * Reversing a status is therefore deliberately impossible. Correcting a genuine
 * mistake means creating a new order, which keeps stock honest.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'PROCESSING', 'IN_DELIVERY', 'DELIVERED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'IN_DELIVERY', 'DELIVERED', 'CANCELLED'],
  PROCESSING: ['IN_DELIVERY', 'DELIVERED', 'CANCELLED'],
  IN_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
}

/** Statuses that can never be left once entered. */
export const TERMINAL_ORDER_STATUSES: OrderStatus[] = ['DELIVERED', 'CANCELLED']

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return TERMINAL_ORDER_STATUSES.includes(status)
}

/**
 * Re-selecting the current status is a no-op, not an error — the dashboard
 * saves the whole form, so an unchanged status arrives on every save.
 */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true
  return ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

/** Statuses an admin may choose next, excluding the one already set. */
export function allowedNextStatuses(from: OrderStatus): OrderStatus[] {
  return ORDER_STATUS_TRANSITIONS[from] ?? []
}
