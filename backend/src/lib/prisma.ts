import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { env } from '../config/env.js';
import { PrismaClient } from '../generated/prisma/client.js';

// The MariaDB driver speaks the MySQL protocol; it expects a mariadb:// URL.
const adapter = new PrismaMariaDb(
  env.databaseUrl.replace(/^mysql:\/\//, 'mariadb://') +
    (env.databaseUrl.includes('?') ? '&' : '?') +
    'allowPublicKeyRetrieval=true',
);

export const prisma = new PrismaClient({ adapter });
