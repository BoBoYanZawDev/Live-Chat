import { messagePreview, toConversationSummary, toMessageDto } from '../mappers/index.js';
import type { ConversationRepository } from '../repositories/conversation.repository.js';
import type { MessageRepository } from '../repositories/message.repository.js';
import type { AuthActor, MessagePage } from '../types/index.js';
import { HttpError } from '../utils/HttpError.js';
import type { ConversationService } from './conversation.service.js';
import type { MediaService } from './media.service.js';
import type { RealtimeService } from './realtime.service.js';

export class MessageService {
  constructor(
    private readonly messages: MessageRepository,
    private readonly conversations: ConversationRepository,
    private readonly conversationService: ConversationService,
    private readonly mediaService: MediaService,
    private readonly realtime: RealtimeService,
  ) {}

  async list(actor: AuthActor, conversationId: string | undefined, limit: number, before?: string): Promise<MessagePage> {
    const conversation = await this.conversationService.resolve(actor, conversationId);
    const { items, hasMore } = await this.messages.findByConversation(conversation.id, limit, before);
    return { items: items.map(toMessageDto), nextCursor: hasMore && items.length ? items[0].id : null };
  }

  async send(actor: AuthActor, conversationId: string | undefined, content: string, files: Express.Multer.File[] = []) {
    let conversation;
    try {
      conversation = await this.conversationService.resolve(actor, conversationId);
      if (!content && files.length === 0) throw HttpError.badRequest('Message cannot be empty');
    } catch (err) {
      await this.mediaService.discardTemp(files);
      throw err;
    }

    const attachments = await this.mediaService.processUploads(files);
    try {
      const row = await this.messages.create({
        conversationId: conversation.id,
        senderType: actor.type,
        ...(actor.type === 'OPERATOR' ? { operatorId: actor.operator.id } : { customerId: actor.customer.id }),
        content,
        attachments,
      });
      const message = toMessageDto(row);
      const updated = await this.conversations.recordMessage(conversation.id, {
        senderType: actor.type,
        preview: messagePreview(content, attachments),
        at: row.createdAt,
      });

      this.realtime.messageCreated(message, conversation.customerId);
      this.realtime.conversationUpdated(toConversationSummary(updated));
      return message;
    } catch (err) {
      await this.mediaService.discard(attachments);
      throw err;
    }
  }
}
