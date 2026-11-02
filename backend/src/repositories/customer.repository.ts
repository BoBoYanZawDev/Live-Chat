import { prisma } from '../lib/prisma.js';

export class CustomerRepository {
  findById(id: string) {
    return prisma.customer.findUnique({ where: { id } });
  }

  /** Phone number is the customer's identity; the name is refreshed on every login. */
  upsertByPhone(phone: string, name: string) {
    return prisma.customer.upsert({ where: { phone }, create: { phone, name }, update: { name } });
  }
}
