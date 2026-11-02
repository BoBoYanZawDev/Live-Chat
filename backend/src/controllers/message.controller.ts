import type { Request, Response } from 'express';
import { mediaService, messageService } from '../container.js';
import { getActor } from '../middlewares/auth.js';
import { listMessagesQuerySchema, sendMessageSchema } from '../validators/index.js';

/** Shared by operator routes (/conversations/:id/...) and customer routes (/customer/conversation/...). */
export const messageController = {
  async list(req: Request<{ id?: string }>, res: Response) {
    const { limit, before } = listMessagesQuerySchema.parse(req.query);
    res.json(await messageService.list(getActor(req), req.params.id, limit, before));
  },

  /** Multipart endpoint for messages with photos/videos (text-only messages usually go over the socket). */
  async create(req: Request<{ id?: string }>, res: Response) {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const parsed = sendMessageSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      await mediaService.discardTemp(files);
      throw parsed.error;
    }
    res.status(201).json(await messageService.send(getActor(req), req.params.id, parsed.data.content, files));
  },
};
