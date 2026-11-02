import type { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ConversationSummary,
  Message,
  PresenceSnapshot,
  ReactionUpdate,
  ReadUpdate,
  ServerToClientEvents,
  SocketData,
  TypingUpdate,
} from '../types/index.js';

export type ChatServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

/** Every operator socket joins this channel: the inbox is shared, Messenger Page style. */
export const OPERATORS_CHANNEL = 'operators';
/** Every customer socket joins this channel (for operator presence). */
export const CUSTOMERS_CHANNEL = 'customers';
export const customerChannel = (customerId: string) => `customer:${customerId}`;
export const operatorChannel = (operatorId: string) => `operator:${operatorId}`;

/** Thin wrapper so domain services can broadcast without knowing about socket.io. */
export class RealtimeService {
  private io: ChatServer | null = null;

  attach(io: ChatServer) {
    this.io = io;
  }

  /** Delivers to all operators plus the conversation's customer. */
  private toConversation(customerId: string) {
    return this.io?.to([OPERATORS_CHANNEL, customerChannel(customerId)]);
  }

  messageCreated(message: Message, customerId: string) {
    this.toConversation(customerId)?.emit('message:new', message);
  }

  reactionUpdated(update: ReactionUpdate, customerId: string) {
    this.toConversation(customerId)?.emit('reaction:update', update);
  }

  readUpdated(update: ReadUpdate, customerId: string) {
    this.toConversation(customerId)?.emit('read:update', update);
  }

  conversationUpdated(conversation: ConversationSummary) {
    this.io?.to(OPERATORS_CHANNEL).emit('conversation:updated', conversation);
  }

  /** Typing goes to everyone in the conversation except the socket that is typing. */
  typingUpdated(update: TypingUpdate, customerId: string, exceptSocketId: string) {
    this.io?.to([OPERATORS_CHANNEL, customerChannel(customerId)]).except(exceptSocketId).emit('typing:update', update);
  }

  /** Kicks a deactivated operator's open sockets. */
  disconnectOperator(operatorId: string) {
    this.io?.in(operatorChannel(operatorId)).disconnectSockets(true);
  }

  /** Operators get the full snapshot; customers only learn which operators are online. */
  presenceChanged(snapshot: PresenceSnapshot) {
    this.io?.to(OPERATORS_CHANNEL).emit('presence:update', snapshot);
    this.io?.to(CUSTOMERS_CHANNEL).emit('presence:update', { operators: snapshot.operators, customerIds: [] });
  }
}
