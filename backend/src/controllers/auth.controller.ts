import type { Request, Response } from 'express';
import { authService } from '../container.js';
import { toCustomerConversation, toCustomerDto, toOperatorDto } from '../mappers/index.js';
import { getActor } from '../middlewares/auth.js';
import type { CustomerLoginResponse, OperatorLoginResponse } from '../types/index.js';
import { customerLoginSchema, operatorLoginSchema } from '../validators/index.js';

export const authController = {
  async operatorLogin(req: Request, res: Response<OperatorLoginResponse>) {
    const { email, password } = operatorLoginSchema.parse(req.body);
    const { operator, token } = await authService.operatorLogin(email, password);
    res.status(201).json({ token, operator: toOperatorDto(operator) });
  },

  async customerLogin(req: Request, res: Response<CustomerLoginResponse>) {
    const { name, phone } = customerLoginSchema.parse(req.body);
    const { customer, conversation, token } = await authService.customerLogin(name, phone);
    res.status(201).json({ token, customer: toCustomerDto(customer), conversation: toCustomerConversation(conversation) });
  },

  me(req: Request, res: Response) {
    const actor = getActor(req);
    res.json(
      actor.type === 'OPERATOR'
        ? { type: 'OPERATOR', operator: toOperatorDto(actor.operator) }
        : { type: 'CUSTOMER', customer: toCustomerDto(actor.customer) },
    );
  },

  /** JWTs are stateless: the client drops its token. Kept so apps have one place to hook sign-out. */
  logout(_req: Request, res: Response) {
    res.status(204).end();
  },
};
