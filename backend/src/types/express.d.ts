import type { AuthActor } from './index.js';

declare global {
  namespace Express {
    interface Request {
      actor?: AuthActor;
    }
  }
}

export {};
