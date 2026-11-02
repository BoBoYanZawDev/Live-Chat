import type { Message as WireMessage } from '../../../backend/src/contracts';

// The wire contract lives in the backend so the portal, mobile app and server can't drift apart.
export type * from '../../../backend/src/contracts';

/** A message as held in the client cache; `pending` marks optimistic messages awaiting the server ack. */
export type ChatMessage = WireMessage & { pending?: boolean };
