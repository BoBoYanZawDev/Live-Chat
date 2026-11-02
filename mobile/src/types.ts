/**
 * Wire types shared with the backend. Type-only re-export: Babel erases it, so Metro never
 * has to resolve the file outside the mobile project root.
 */
export type {
  ActorType,
  Attachment,
  ClientToServerEvents,
  Customer,
  CustomerConversation,
  CustomerLoginResponse,
  Message,
  MessagePage,
  PresenceSnapshot,
  ReactionSummary,
  ReactionUpdate,
  ReadUpdate,
  SenderType,
  ServerToClientEvents,
  TypingUpdate,
} from '../../backend/src/contracts';

import type { Message } from '../../backend/src/contracts';

/** A message in the local cache; optimistic bubbles carry `pending`. */
export type ChatMessage = Message & { pending?: boolean };
