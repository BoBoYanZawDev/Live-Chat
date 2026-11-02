import { summarizeReactions } from '../mappers/index.js';
import type { MessageRepository } from '../repositories/message.repository.js';
import type { ReactionRepository } from '../repositories/reaction.repository.js';
import type { AuthActor, ReactionUpdate } from '../types/index.js';
import { HttpError } from '../utils/HttpError.js';
import type { RealtimeService } from './realtime.service.js';

export class ReactionService {
  constructor(
    private readonly reactions: ReactionRepository,
    private readonly messages: MessageRepository,
    private readonly realtime: RealtimeService,
  ) {}

  async toggle(actor: AuthActor, messageId: string, emoji: string): Promise<ReactionUpdate> {
    const message = await this.messages.findById(messageId);
    const customerId = message?.conversation.customerId;
    // Customers may only react inside their own conversation; hide other messages' existence.
    if (!message || (actor.type === 'CUSTOMER' && customerId !== actor.customer.id)) {
      throw HttpError.notFound('Message not found');
    }

    const actorId = actor.type === 'OPERATOR' ? actor.operator.id : actor.customer.id;
    await this.reactions.toggle(messageId, actor.type, actorId, emoji);
    const update = {
      conversationId: message.conversationId,
      messageId,
      reactions: summarizeReactions(await this.reactions.findByMessage(messageId)),
    };
    this.realtime.reactionUpdated(update, message.conversation.customerId);
    return update;
  }
}
