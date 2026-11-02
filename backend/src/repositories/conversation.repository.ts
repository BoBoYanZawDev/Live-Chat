import type { Prisma, SenderType } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { conversationInclude } from '../mappers/index.js';
import type { InboxFilter } from '../types/index.js';

export class ConversationRepository {
  findById(id: string) {
    return prisma.conversation.findUnique({ where: { id }, include: conversationInclude });
  }

  findByCustomerId(customerId: string) {
    return prisma.conversation.findUnique({ where: { customerId }, include: conversationInclude });
  }

  ensureForCustomer(customerId: string) {
    return prisma.conversation.upsert({
      where: { customerId },
      create: { customerId },
      update: {},
      include: conversationInclude,
    });
  }

  /** Inbox: conversations that have messages, newest activity first. */
  async list(opts: { filter: InboxFilter; operatorId: string; search?: string; cursor?: string; limit: number }) {
    const where: Prisma.ConversationWhereInput = { lastMessageAt: { not: null } };
    if (opts.filter === 'done') where.status = 'DONE';
    else where.status = 'OPEN';
    if (opts.filter === 'unread') where.unreadByOperators = { gt: 0 };
    if (opts.filter === 'mine') where.assigneeId = opts.operatorId;
    if (opts.search) {
      where.customer = { OR: [{ name: { contains: opts.search } }, { phone: { contains: opts.search } }] };
    }

    const rows = await prisma.conversation.findMany({
      where,
      include: conversationInclude,
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      take: opts.limit + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > opts.limit;
    const items = rows.slice(0, opts.limit);
    return { items, nextCursor: hasMore ? items.at(-1)!.id : null };
  }

  /**
   * Updates inbox metadata after a new message. A sender implicitly has read everything,
   * the other side gets +1 unread, and a customer message re-opens a DONE conversation.
   */
  recordMessage(id: string, msg: { senderType: SenderType; preview: string; at: Date }) {
    const fromCustomer = msg.senderType === 'CUSTOMER';
    return prisma.conversation.update({
      where: { id },
      data: {
        lastMessageAt: msg.at,
        lastMessagePreview: msg.preview,
        lastMessageSenderType: msg.senderType,
        ...(fromCustomer
          ? {
              status: 'OPEN',
              unreadByOperators: { increment: 1 },
              unreadByCustomer: 0,
              customerLastReadAt: msg.at,
            }
          : {
              unreadByCustomer: { increment: 1 },
              unreadByOperators: 0,
              operatorLastReadAt: msg.at,
            }),
      },
      include: conversationInclude,
    });
  }

  markReadByOperators(id: string, at: Date) {
    return prisma.conversation.update({
      where: { id },
      data: { unreadByOperators: 0, operatorLastReadAt: at },
      include: conversationInclude,
    });
  }

  markReadByCustomer(id: string, at: Date) {
    return prisma.conversation.update({
      where: { id },
      data: { unreadByCustomer: 0, customerLastReadAt: at },
      include: conversationInclude,
    });
  }

  update(id: string, data: { status?: 'OPEN' | 'DONE'; assigneeId?: string | null }) {
    return prisma.conversation.update({ where: { id }, data, include: conversationInclude });
  }
}
