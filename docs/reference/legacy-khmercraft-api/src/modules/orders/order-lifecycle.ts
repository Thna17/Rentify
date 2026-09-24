import { OrderStatus } from '../../../models/Order';

export type Actor = 'BUYER' | 'SELLER' | 'ADMIN';

/**
 * Legal status moves, and who may make them.
 *
 * Encoded as data rather than scattered `if` statements so the whole lifecycle
 * is readable in one place — and so an illegal move is impossible to express
 * rather than merely discouraged.
 *
 *   PENDING ──accept──▶ CONFIRMED ──ship──▶ SHIPPED ──deliver──▶ DELIVERED
 *      │                    │
 *      └──── cancel ────────┴──▶ CANCELLED
 *
 * DELIVERED and CANCELLED are terminal: nothing moves out of them.
 */
const TRANSITIONS: Record<OrderStatus, Partial<Record<OrderStatus, Actor[]>>> = {
  PENDING: {
    // The seller accepting the order is the "seller accept" step.
    CONFIRMED: ['SELLER', 'ADMIN'],
    // Either side may walk away before it is accepted.
    CANCELLED: ['BUYER', 'SELLER', 'ADMIN'],
  },
  CONFIRMED: {
    SHIPPED: ['SELLER', 'ADMIN'],
    // After acceptance the buyer can no longer cancel unilaterally — the
    // seller may already be packing. Only the seller or an admin can.
    CANCELLED: ['SELLER', 'ADMIN'],
  },
  SHIPPED: {
    DELIVERED: ['SELLER', 'ADMIN'],
  },
  DELIVERED: {},
  CANCELLED: {},
};

/** Statuses that mean stock should go back on the shelf. */
export const RELEASES_STOCK: OrderStatus[] = ['CANCELLED'];

export const isTerminal = (status: OrderStatus): boolean =>
  Object.keys(TRANSITIONS[status]).length === 0;

export const canTransition = (
  from: OrderStatus,
  to: OrderStatus,
  actor: Actor,
): boolean => Boolean(TRANSITIONS[from][to]?.includes(actor));

/** What this actor could do next — drives the buttons the UI offers. */
export const allowedTransitions = (
  from: OrderStatus,
  actor: Actor,
): OrderStatus[] =>
  (Object.entries(TRANSITIONS[from]) as [OrderStatus, Actor[]][])
    .filter(([, actors]) => actors.includes(actor))
    .map(([status]) => status);
