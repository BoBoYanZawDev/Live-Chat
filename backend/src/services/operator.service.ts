import type { Operator, OperatorRole } from '../generated/prisma/client.js';
import type { OperatorRepository } from '../repositories/operator.repository.js';
import { HttpError } from '../utils/HttpError.js';
import { hashPassword } from './auth.service.js';
import type { RealtimeService } from './realtime.service.js';

export class OperatorService {
  constructor(
    private readonly operators: OperatorRepository,
    private readonly realtime: RealtimeService,
  ) {}

  list() {
    return this.operators.findAll();
  }

  async create(data: { email: string; name: string; password: string; role: OperatorRole }) {
    if (await this.operators.findByEmail(data.email)) throw HttpError.conflict('An operator with that email already exists');
    return this.operators.create({
      email: data.email,
      name: data.name,
      role: data.role,
      passwordHash: await hashPassword(data.password),
    });
  }

  async update(
    id: string,
    changes: { name?: string; role?: OperatorRole; isActive?: boolean; password?: string },
    by: Operator,
  ) {
    const target = await this.operators.findById(id);
    if (!target) throw HttpError.notFound('Operator not found');

    const losesAdmin =
      target.role === 'ADMIN' && target.isActive && (changes.role === 'OPERATOR' || changes.isActive === false);
    if (losesAdmin && (await this.operators.countActiveAdmins()) <= 1) {
      throw HttpError.badRequest('There must be at least one active admin');
    }
    if (target.id === by.id && changes.isActive === false) {
      throw HttpError.badRequest("You can't deactivate your own account");
    }

    const { password, ...rest } = changes;
    // Deactivation or a password reset revokes the operator's JWTs everywhere.
    const revokeTokens = changes.isActive === false || !!password;
    const updated = await this.operators.update(id, {
      ...rest,
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
      revokeTokens,
    });
    if (revokeTokens) this.realtime.disconnectOperator(id);
    return updated;
  }
}
