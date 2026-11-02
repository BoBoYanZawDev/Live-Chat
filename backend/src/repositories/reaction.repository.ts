import type { ActorType } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';

export class ReactionRepository {
  /** One reaction per actor: repeat to remove, pick another emoji to replace. */
  async toggle(messageId: string, actorType: ActorType, actorId: string, emoji: string) {
    return prisma.$transaction(async (tx) => {
      // Serialize toggles, including concurrent requests before any reaction exists.
      await tx.$queryRaw`SELECT id FROM Message WHERE id = ${messageId} FOR UPDATE`;
      const key = { messageId, actorType, actorId };
      const existing = await tx.reaction.findUnique({ where: { messageId_actorType_actorId: key } });
      if (existing?.emoji === emoji) {
        await tx.reaction.delete({ where: { id: existing.id } });
        return false;
      }
      await tx.reaction.upsert({
        where: { messageId_actorType_actorId: key },
        create: { ...key, emoji },
        update: { emoji },
      });
      return true;
    });
  }

  findByMessage(messageId: string) {
    return prisma.reaction.findMany({
      where: { messageId },
      select: { emoji: true, actorType: true, actorId: true },
      orderBy: { createdAt: 'asc' },
    });
  }
}
