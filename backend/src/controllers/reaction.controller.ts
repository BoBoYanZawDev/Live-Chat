import type { Request, Response } from 'express';
import { reactionService } from '../container.js';
import { getActor } from '../middlewares/auth.js';
import { reactionSchema } from '../validators/index.js';

export const reactionController = {
  async toggle(req: Request<{ messageId: string }>, res: Response) {
    const { emoji } = reactionSchema.parse(req.body);
    res.json(await reactionService.toggle(getActor(req), req.params.messageId, emoji));
  },
};
