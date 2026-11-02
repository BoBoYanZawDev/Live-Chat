import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import {
  authService,
  conversationService,
  messageService,
  presenceService,
  reactionService,
  realtimeService,
} from '../container.js';
import {
  CUSTOMERS_CHANNEL,
  OPERATORS_CHANNEL,
  customerChannel,
  operatorChannel,
  type ChatServer,
} from '../services/realtime.service.js';
import { HttpError } from '../utils/HttpError.js';
import { reactionSchema, textMessageSchema } from '../validators/index.js';

const errorMessage = (err: unknown) => {
  if (err instanceof ZodError) return err.issues[0]?.message ?? 'Validation failed';
  if (err instanceof HttpError) return err.message;
  console.error(err);
  return 'Something went wrong';
};

export function createSocketServer(httpServer: HttpServer) {
  const io: ChatServer = new Server(httpServer, {
    cors: { origin: env.clientOrigin },
  });

  realtimeService.attach(io);

  io.use(async (socket, next) => {
    try {
      socket.data.actor = await authService.authenticate(socket.handshake.auth?.token);
      next();
    } catch (err) {
      next(new Error(errorMessage(err)));
    }
  });

  io.on('connection', (socket) => {
    const { actor } = socket.data;
    // Joins are synchronous with the default in-memory adapter; handlers below must register without awaiting.
    if (actor.type === 'OPERATOR') void socket.join([OPERATORS_CHANNEL, operatorChannel(actor.operator.id)]);
    else void socket.join([CUSTOMERS_CHANNEL, customerChannel(actor.customer.id)]);

    if (presenceService.connect(actor, socket.id)) realtimeService.presenceChanged(presenceService.snapshot());
    else {
      // Someone opening another tab still needs the current snapshot.
      const snapshot = presenceService.snapshot();
      socket.emit('presence:update', actor.type === 'OPERATOR' ? snapshot : { ...snapshot, customerIds: [] });
    }

    const broadcastTyping = async (conversationId: string | undefined, isTyping: boolean) => {
      try {
        const conversation = await conversationService.resolve(actor, conversationId);
        const update = presenceService.setTyping(conversation.id, actor, isTyping);
        realtimeService.typingUpdated(update, conversation.customerId, socket.id);
      } catch {
        // Typing is best-effort; ignore bad conversation ids.
      }
    };

    socket.on('message:send', async (payload, ack) => {
      try {
        const { content } = textMessageSchema.parse({ content: payload?.content });
        const message = await messageService.send(actor, payload?.conversationId, content);
        void broadcastTyping(message.conversationId, false);
        ack({ ok: true, message });
      } catch (err) {
        ack({ ok: false, error: errorMessage(err) });
      }
    });

    socket.on('reaction:toggle', async (payload, ack) => {
      try {
        const { emoji } = reactionSchema.parse({ emoji: payload?.emoji });
        ack({ ok: true, ...(await reactionService.toggle(actor, payload.messageId, emoji)) });
      } catch (err) {
        ack({ ok: false, error: errorMessage(err) });
      }
    });

    socket.on('conversation:read', async (payload, ack) => {
      try {
        await conversationService.markRead(actor, payload?.conversationId);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: errorMessage(err) });
      }
    });

    socket.on('typing:start', (payload) => void broadcastTyping(payload?.conversationId, true));
    socket.on('typing:stop', (payload) => void broadcastTyping(payload?.conversationId, false));

    socket.on('disconnect', async () => {
      if (!presenceService.disconnect(actor, socket.id)) return;
      for (const update of presenceService.clearTyping(actor)) {
        const conversation = await conversationService.getById(update.conversationId).catch(() => null);
        if (conversation) realtimeService.typingUpdated(update, conversation.customerId, socket.id);
      }
      realtimeService.presenceChanged(presenceService.snapshot());
    });
  });

  return io;
}
