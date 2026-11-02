import type { OperatorRole } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';

export class OperatorRepository {
  count() {
    return prisma.operator.count();
  }

  findAll() {
    return prisma.operator.findMany({ orderBy: [{ role: 'asc' }, { name: 'asc' }] });
  }

  findById(id: string) {
    return prisma.operator.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return prisma.operator.findUnique({ where: { email } });
  }

  countActiveAdmins() {
    return prisma.operator.count({ where: { role: 'ADMIN', isActive: true } });
  }

  create(data: { email: string; name: string; passwordHash: string; role: OperatorRole }) {
    return prisma.operator.create({ data });
  }

  update(
    id: string,
    data: { name?: string; role?: OperatorRole; isActive?: boolean; passwordHash?: string; revokeTokens?: boolean },
  ) {
    const { revokeTokens, ...rest } = data;
    return prisma.operator.update({
      where: { id },
      data: { ...rest, ...(revokeTokens ? { tokenVersion: { increment: 1 } } : {}) },
    });
  }
}
