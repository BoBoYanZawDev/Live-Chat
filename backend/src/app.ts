import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { router } from './routes/index.js';

export function createApp() {
  const app = express();
  app.use(cors({ origin: env.clientOrigin }));
  app.use(express.json());
  // Uploaded files get unique names, so they can be cached forever.
  app.use('/uploads', express.static(env.uploadDir, { immutable: true, maxAge: '365d', fallthrough: false }));
  app.use('/api', router);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
