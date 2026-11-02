import type { Customer, Operator } from '../generated/prisma/client.js';

export type * from '../contracts.js';

/** Authenticated party on a request or socket (DB rows, not wire DTOs). */
export type AuthActor = { type: 'OPERATOR'; operator: Operator } | { type: 'CUSTOMER'; customer: Customer };

export interface SocketData {
  actor: AuthActor;
}

export const actorKey = (actor: AuthActor) =>
  actor.type === 'OPERATOR' ? `OPERATOR:${actor.operator.id}` : `CUSTOMER:${actor.customer.id}`;

export const actorName = (actor: AuthActor) => (actor.type === 'OPERATOR' ? actor.operator.name : actor.customer.name);
