import { ConversationRepository } from './repositories/conversation.repository.js';
import { CustomerRepository } from './repositories/customer.repository.js';
import { MessageRepository } from './repositories/message.repository.js';
import { OperatorRepository } from './repositories/operator.repository.js';
import { ReactionRepository } from './repositories/reaction.repository.js';
import { AuthService } from './services/auth.service.js';
import { ConversationService } from './services/conversation.service.js';
import { MediaService } from './services/media.service.js';
import { MessageService } from './services/message.service.js';
import { OperatorService } from './services/operator.service.js';
import { PresenceService } from './services/presence.service.js';
import { ReactionService } from './services/reaction.service.js';
import { RealtimeService } from './services/realtime.service.js';
import { TokenService } from './services/token.service.js';

const operatorRepository = new OperatorRepository();
const customerRepository = new CustomerRepository();
const conversationRepository = new ConversationRepository();
const messageRepository = new MessageRepository();
const reactionRepository = new ReactionRepository();

export const realtimeService = new RealtimeService();
export const presenceService = new PresenceService();
export const mediaService = new MediaService();
export const tokenService = new TokenService();
export const authService = new AuthService(operatorRepository, customerRepository, conversationRepository, tokenService);
export const operatorService = new OperatorService(operatorRepository, realtimeService);
export const conversationService = new ConversationService(conversationRepository, operatorRepository, realtimeService);
export const messageService = new MessageService(
  messageRepository,
  conversationRepository,
  conversationService,
  mediaService,
  realtimeService,
);
export const reactionService = new ReactionService(reactionRepository, messageRepository, realtimeService);
