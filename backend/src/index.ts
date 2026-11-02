import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { authService, mediaService } from './container.js';
import { prisma } from './lib/prisma.js';
import { createSocketServer } from './socket/index.js';

await mediaService.init();
const createdAdmin = await authService.ensureInitialAdmin();
if (createdAdmin) {
  console.log(`Created initial admin "${createdAdmin}" (password from ADMIN_PASSWORD). Change it after first login.`);
}

const httpServer = createServer(createApp());
createSocketServer(httpServer);

httpServer.listen(env.port, () => {
  console.log(`Chat server listening on http://localhost:${env.port}`);
});

const shutdown = async () => {
  httpServer.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
