import type { Request, Response } from 'express';
import { operatorService } from '../container.js';
import { toOperatorDto } from '../mappers/index.js';
import { getOperator } from '../middlewares/auth.js';
import { createOperatorSchema, updateOperatorSchema } from '../validators/index.js';

export const operatorController = {
  async list(_req: Request, res: Response) {
    res.json((await operatorService.list()).map(toOperatorDto));
  },

  async create(req: Request, res: Response) {
    const data = createOperatorSchema.parse(req.body);
    res.status(201).json(toOperatorDto(await operatorService.create(data)));
  },

  async update(req: Request<{ id: string }>, res: Response) {
    const changes = updateOperatorSchema.parse(req.body);
    res.json(toOperatorDto(await operatorService.update(req.params.id, changes, getOperator(req))));
  },
};
