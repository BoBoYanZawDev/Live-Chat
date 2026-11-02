import type { Prisma } from '../generated/prisma/client.js';
import type {
  Customer,
  ConversationSummary,
  CustomerConversation,
  Message,
  Operator,
  ReactionSummary,
} from '../types/index.js';

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export function toOperatorDto(o: Prisma.OperatorGetPayload<object>): Operator {
  return {
    id: o.id,
    email: o.email,
    name: o.name,
    role: o.role,
    isActive: o.isActive,
    createdAt: o.createdAt.toISOString(),
  };
}

export function toCustomerDto(c: Prisma.CustomerGetPayload<object>): Customer {
  return { id: c.id, name: c.name, phone: c.phone, createdAt: c.createdAt.toISOString() };
}

export const conversationInclude = {
  customer: true,
  assignee: { select: { id: true, name: true } },
} satisfies Prisma.ConversationInclude;

export type ConversationWithRelations = Prisma.ConversationGetPayload<{ include: typeof conversationInclude }>;

export function toConversationSummary(c: ConversationWithRelations): ConversationSummary {
  return {
    id: c.id,
    status: c.status,
    customer: toCustomerDto(c.customer),
    assignee: c.assignee,
    lastMessageAt: iso(c.lastMessageAt),
    lastMessagePreview: c.lastMessagePreview,
    lastMessageSenderType: c.lastMessageSenderType,
    unreadCount: c.unreadByOperators,
    customerLastReadAt: iso(c.customerLastReadAt),
    operatorLastReadAt: iso(c.operatorLastReadAt),
    createdAt: c.createdAt.toISOString(),
  };
}

export function toCustomerConversation(c: Prisma.ConversationGetPayload<object>): CustomerConversation {
  return {
    id: c.id,
    unreadCount: c.unreadByCustomer,
    operatorLastReadAt: iso(c.operatorLastReadAt),
    customerLastReadAt: iso(c.customerLastReadAt),
  };
}

export const messageInclude = {
  customer: { select: { id: true, name: true } },
  operator: { select: { id: true, name: true } },
  attachments: { orderBy: { position: 'asc' } },
  reactions: { select: { emoji: true, actorType: true, actorId: true }, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.MessageInclude;

export type MessageWithRelations = Prisma.MessageGetPayload<{ include: typeof messageInclude }>;

/** Groups raw reaction rows into one entry per emoji, in first-used order. */
export function summarizeReactions(rows: { emoji: string; actorType: string; actorId: string }[]): ReactionSummary[] {
  const byEmoji = new Map<string, string[]>();
  for (const { emoji, actorType, actorId } of rows) {
    byEmoji.set(emoji, [...(byEmoji.get(emoji) ?? []), `${actorType}:${actorId}`]);
  }
  return [...byEmoji].map(([emoji, actorKeys]) => ({ emoji, count: actorKeys.length, actorKeys }));
}

export function toMessageDto(m: MessageWithRelations): Message {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderType: m.senderType,
    sender: m.senderType === 'OPERATOR' ? m.operator : m.senderType === 'CUSTOMER' ? m.customer : null,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    attachments: m.attachments.map(({ messageId: _m, createdAt: _c, position: _p, ...a }) => a),
    reactions: summarizeReactions(m.reactions),
  };
}

/** Short inbox preview, e.g. "📷 Photo" for attachment-only messages. */
export function messagePreview(content: string, attachments: { type: 'IMAGE' | 'VIDEO' }[]) {
  if (content) return content.length > 120 ? `${content.slice(0, 117)}...` : content;
  const videos = attachments.filter((a) => a.type === 'VIDEO').length;
  const photos = attachments.length - videos;
  if (videos && photos) return `📎 ${attachments.length} attachments`;
  if (videos) return videos > 1 ? `🎬 ${videos} videos` : '🎬 Video';
  return photos > 1 ? `📷 ${photos} photos` : '📷 Photo';
}
