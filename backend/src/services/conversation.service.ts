import { toConversationSummary, toCustomerConversation } from '../mappers/index.js';
import type { ConversationRepository } from '../repositories/conversation.repository.js';
import type { OperatorRepository } from '../repositories/operator.repository.js';
import type { AuthActor, ConversationPage, InboxFilter } from '../types/index.js';
import { HttpError } from '../utils/HttpError.js';
import type { RealtimeService } from './realtime.service.js';

export class ConversationService {
  constructor(
    private readonly conversations: ConversationRepository,
    private readonly operators: OperatorRepository,
    private readonly realtime: RealtimeService,
  ) {}

  async inbox(opts: { filter: InboxFilter; operatorId: string; search?: string; cursor?: string; limit: number }): Promise<ConversationPage> {
    const { items, nextCursor } = await this.conversations.list(opts);
    return { items: items.map(toConversationSummary), nextCursor };
  }

  async getById(id: string) {
    const conversation = await this.conversations.findById(id);
    if (!conversation) throw HttpError.notFound('Conversation not found');
    return conversation;
  }

  async getForCustomer(customerId: string) {
    return this.conversations.ensureForCustomer(customerId);
  }

  /**
   * Resolves which conversation an actor is addressing and checks access:
   * operators can open any conversation, customers only their own.
   */
  async resolve(actor: AuthActor, conversationId?: string) {
    if (actor.type === 'CUSTOMER') {
      const own = await this.conversations.ensureForCustomer(actor.customer.id);
      if (conversationId && conversationId !== own.id) throw HttpError.forbidden();
      return own;
    }
    if (!conversationId) throw HttpError.badRequest('conversationId is required');
    return this.getById(conversationId);
  }

  async update(id: string, changes: { status?: 'OPEN' | 'DONE'; assigneeId?: string | null }) {
    await this.getById(id);
    if (changes.assigneeId) {
      const assignee = await this.operators.findById(changes.assigneeId);
      if (!assignee?.isActive) throw HttpError.badRequest('Assignee must be an active operator');
    }
    const summary = toConversationSummary(await this.conversations.update(id, changes));
    this.realtime.conversationUpdated(summary);
    return summary;
  }

  async markRead(actor: AuthActor, conversationId?: string) {
    const conversation = await this.resolve(actor, conversationId);
    const at = new Date();
    const updated =
      actor.type === 'OPERATOR'
        ? await this.conversations.markReadByOperators(conversation.id, at)
        : await this.conversations.markReadByCustomer(conversation.id, at);

    this.realtime.readUpdated(
      { conversationId: conversation.id, reader: actor.type, lastReadAt: at.toISOString() },
      conversation.customerId,
    );
    this.realtime.conversationUpdated(toConversationSummary(updated));
    return actor.type === 'CUSTOMER' ? toCustomerConversation(updated) : toConversationSummary(updated);
  }
}
