/**
 * API + socket contract shared by the backend, the operator portal (frontend/) and the customer app (mobile/).
 * Type-only: the clients import it with `import type`, so it must not import runtime code.
 * Dates are ISO strings on the wire.
 */

export type OperatorRole = 'ADMIN' | 'OPERATOR';
export type ConversationStatus = 'OPEN' | 'DONE';
export type SenderType = 'CUSTOMER' | 'OPERATOR' | 'SYSTEM';
export type ActorType = 'CUSTOMER' | 'OPERATOR';

export interface Operator {
  id: string;
  email: string;
  name: string;
  role: OperatorRole;
  isActive: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  /** Path relative to the API origin, e.g. /uploads/abc.webp */
  url: string;
  thumbnailUrl: string | null;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  originalName: string;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  /** "OPERATOR:<id>" / "CUSTOMER:<id>" keys of everyone who reacted. */
  actorKeys: string[];
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: SenderType;
  /** Display info for the sender. Customers see operators' names too (like a Page inbox signature). */
  sender: { id: string; name: string } | null;
  content: string;
  attachments: Attachment[];
  reactions: ReactionSummary[];
  createdAt: string;
}

export interface MessagePage {
  items: Message[];
  nextCursor: string | null;
}

/** What operators see in the inbox list. */
export interface ConversationSummary {
  id: string;
  status: ConversationStatus;
  customer: Customer;
  assignee: Pick<Operator, 'id' | 'name'> | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastMessageSenderType: SenderType | null;
  /** Customer messages operators haven't read yet. */
  unreadCount: number;
  customerLastReadAt: string | null;
  operatorLastReadAt: string | null;
  createdAt: string;
}

export interface ConversationPage {
  items: ConversationSummary[];
  nextCursor: string | null;
}

export type InboxFilter = 'all' | 'unread' | 'mine' | 'done';

/** What the customer app sees about its own conversation. */
export interface CustomerConversation {
  id: string;
  /** Operator messages the customer hasn't read yet. */
  unreadCount: number;
  operatorLastReadAt: string | null;
  customerLastReadAt: string | null;
}

export type Actor = { type: 'OPERATOR'; operator: Operator } | { type: 'CUSTOMER'; customer: Customer };

export interface OperatorLoginResponse {
  token: string;
  operator: Operator;
}

export interface CustomerLoginResponse {
  token: string;
  customer: Customer;
  conversation: CustomerConversation;
}

export interface ReactionUpdate {
  conversationId: string;
  messageId: string;
  reactions: ReactionSummary[];
}

export interface ReadUpdate {
  conversationId: string;
  reader: ActorType;
  lastReadAt: string;
}

export interface TypingUpdate {
  conversationId: string;
  /** Names of everyone currently typing in the conversation. */
  typing: { actorType: ActorType; id: string; name: string }[];
}

export interface PresenceSnapshot {
  /** Online operators (customers use this to show "Support is online"). */
  operators: Pick<Operator, 'id' | 'name'>[];
  /** Online customer ids (sent to operators only). */
  customerIds: string[];
}

type Ack<T> = (res: ({ ok: true } & T) | { ok: false; error: string }) => void;

export interface ServerToClientEvents {
  'message:new': (message: Message) => void;
  'reaction:update': (payload: ReactionUpdate) => void;
  'read:update': (payload: ReadUpdate) => void;
  'typing:update': (payload: TypingUpdate) => void;
  /** Operators only: a conversation's inbox row changed. */
  'conversation:updated': (conversation: ConversationSummary) => void;
  'presence:update': (snapshot: PresenceSnapshot) => void;
}

export interface ClientToServerEvents {
  /** Customers may omit conversationId; the server uses their own conversation. */
  'message:send': (payload: { conversationId?: string; content: string }, ack: Ack<{ message: Message }>) => void;
  'reaction:toggle': (payload: { messageId: string; emoji: string }, ack: Ack<ReactionUpdate>) => void;
  'conversation:read': (payload: { conversationId?: string }, ack?: Ack<object>) => void;
  'typing:start': (payload: { conversationId?: string }) => void;
  'typing:stop': (payload: { conversationId?: string }) => void;
}
