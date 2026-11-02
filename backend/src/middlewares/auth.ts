import type { NextFunction, Request, Response } from 'express';
import { authService } from '../container.js';
import type { AuthActor } from '../types/index.js';
import { HttpError } from '../utils/HttpError.js';

export const extractToken = (header?: string) =>
  header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;

/** Any signed-in operator or customer. */
export async function requireActor(req: Request, _res: Response, next: NextFunction) {
  req.actor = await authService.authenticate(extractToken(req.headers.authorization));
  next();
}

export async function requireOperator(req: Request, res: Response, next: NextFunction) {
  await requireActor(req, res, () => undefined);
  if (req.actor?.type !== 'OPERATOR') throw HttpError.forbidden('Operators only');
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  await requireOperator(req, res, () => undefined);
  if (req.actor?.type !== 'OPERATOR' || req.actor.operator.role !== 'ADMIN') throw HttpError.forbidden('Admins only');
  next();
}

export async function requireCustomer(req: Request, res: Response, next: NextFunction) {
  await requireActor(req, res, () => undefined);
  if (req.actor?.type !== 'CUSTOMER') throw HttpError.forbidden('Customers only');
  next();
}

export function getActor(req: Request): AuthActor {
  if (!req.actor) throw HttpError.unauthorized();
  return req.actor;
}

export function getOperator(req: Request) {
  const actor = getActor(req);
  if (actor.type !== 'OPERATOR') throw HttpError.forbidden('Operators only');
  return actor.operator;
}
