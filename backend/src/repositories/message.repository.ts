import type { Prisma, SenderType } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { messageInclude } from '../mappers/index.js';

export type AttachmentInput = Omit<Prisma.AttachmentCreateManyMessageInput, 'id' | 'createdAt' | 'position'>;

export class MessageRepository {
  /** Returns up to `limit` messages older than `before` (message id), oldest first. */
  async findByConversation(conversationId: string, limit: number, before?: string) {
    const rows = await prisma.message.findMany({
      where: { conversationId },
      include: messageInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(before ? { cursor: { id: before }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    return { items: rows.slice(0, limit).reverse(), hasMore };
  }

  findById(id: string) {
    return prisma.message.findUnique({
      where: { id },
      select: { id: true, conversationId: true, conversation: { select: { customerId: true } } },
    });
  }

  create(data: {
    conversationId: string;
    senderType: SenderType;
    customerId?: string;
    operatorId?: string;
    content: string;
    attachments: AttachmentInput[];
  }) {
    const { attachments, ...rest } = data;
    return prisma.message.create({
      data: {
        ...rest,
        attachments: attachments.length
          ? { createMany: { data: attachments.map((a, position) => ({ ...a, position })) } }
          : undefined,
      },
      include: messageInclude,
    });
  }
}
