import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import type { ConversationRepository } from '../repositories/conversation.repository.js';
import type { CustomerRepository } from '../repositories/customer.repository.js';
import type { OperatorRepository } from '../repositories/operator.repository.js';
import type { AuthActor } from '../types/index.js';
import { HttpError } from '../utils/HttpError.js';
import type { TokenService } from './token.service.js';

export const hashPassword = (password: string) => bcrypt.hash(password, 10);

/** Compared against when the email is unknown, so response time doesn't reveal which emails exist. */
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

export class AuthService {
  constructor(
    private readonly operators: OperatorRepository,
    private readonly customers: CustomerRepository,
    private readonly conversations: ConversationRepository,
    private readonly tokens: TokenService,
  ) {}

  async operatorLogin(email: string, password: string) {
    const operator = await this.operators.findByEmail(email);
    const valid = await bcrypt.compare(password, operator?.passwordHash ?? DUMMY_HASH);
    if (!operator || !valid) throw HttpError.unauthorized('Invalid email or password');
    if (!operator.isActive) throw HttpError.forbidden('This account has been deactivated');
    const token = this.tokens.sign({ sub: operator.id, typ: 'OPERATOR', ver: operator.tokenVersion });
    return { operator, token };
  }

  async customerLogin(name: string, phone: string) {
    const customer = await this.customers.upsertByPhone(phone, name);
    const conversation = await this.conversations.ensureForCustomer(customer.id);
    const token = this.tokens.sign({ sub: customer.id, typ: 'CUSTOMER', ver: customer.tokenVersion });
    return { customer, conversation, token };
  }

  /**
   * Verifies the JWT, then loads the account so deactivation and tokenVersion bumps
   * take effect immediately (a pure stateless check couldn't revoke tokens).
   */
  async authenticate(token: string | undefined): Promise<AuthActor> {
    if (!token) throw HttpError.unauthorized('Missing token');
    const claims = this.tokens.verify(token);

    if (claims.typ === 'OPERATOR') {
      const operator = await this.operators.findById(claims.sub);
      if (!operator || operator.tokenVersion !== claims.ver) throw HttpError.unauthorized('Token revoked');
      if (!operator.isActive) throw HttpError.unauthorized('This account has been deactivated');
      return { type: 'OPERATOR', operator };
    }

    const customer = await this.customers.findById(claims.sub);
    if (!customer || customer.tokenVersion !== claims.ver) throw HttpError.unauthorized('Token revoked');
    return { type: 'CUSTOMER', customer };
  }

  /** Creates the first admin from env on a fresh database. */
  async ensureInitialAdmin() {
    if ((await this.operators.count()) > 0) return null;
    const { email, password, name } = env.initialAdmin;
    await this.operators.create({ email, name, role: 'ADMIN', passwordHash: await hashPassword(password) });
    return email;
  }
}
