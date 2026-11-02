import type { Request, Response } from 'express';
import { conversationService } from '../container.js';
import { toConversationSummary, toCustomerConversation } from '../mappers/index.js';
import { getActor, getOperator } from '../middlewares/auth.js';
import { inboxQuerySchema, updateConversationSchema } from '../validators/index.js';

export const conversationController = {
  /** Operator inbox. */
  async list(req: Request, res: Response) {
    const query = inboxQuerySchema.parse(req.query);
    res.json(await conversationService.inbox({ ...query, operatorId: getOperator(req).id }));
  },

  async get(req: Request<{ id: string }>, res: Response) {
    res.json(toConversationSummary(await conversationService.getById(req.params.id)));
  },

  async update(req: Request<{ id: string }>, res: Response) {
    res.json(await conversationService.update(req.params.id, updateConversationSchema.parse(req.body)));
  },

  async markRead(req: Request<{ id?: string }>, res: Response) {
    await conversationService.markRead(getActor(req), req.params.id);
    res.status(204).end();
  },

  /** Customer app: their own conversation. */
  async mine(req: Request, res: Response) {
    const actor = getActor(req);
    if (actor.type !== 'CUSTOMER') return res.status(403).end();
    res.json(toCustomerConversation(await conversationService.getForCustomer(actor.customer.id)));
  },
};
