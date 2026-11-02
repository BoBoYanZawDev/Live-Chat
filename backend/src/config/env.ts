import 'dotenv/config';
import path from 'node:path';

const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
};

export const env = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  databaseUrl: required('DATABASE_URL'),
  jwt: {
    secret: required('JWT_SECRET'),
    /** Any `ms`-style duration, e.g. "12h", "30d". */
    operatorTtl: process.env.OPERATOR_TOKEN_TTL ?? '12h',
    customerTtl: process.env.CUSTOMER_TOKEN_TTL ?? '30d',
  },
  uploadDir: path.resolve(process.env.UPLOAD_DIR ?? 'uploads'),
  maxImageBytes: Number(process.env.MAX_IMAGE_MB ?? 15) * 1024 * 1024,
  maxVideoBytes: Number(process.env.MAX_VIDEO_MB ?? 100) * 1024 * 1024,
  maxFilesPerMessage: 10,
  /** First-run admin account, created only when no operators exist yet. */
  initialAdmin: {
    email: process.env.ADMIN_EMAIL ?? 'admin@example.com',
    password: process.env.ADMIN_PASSWORD ?? 'admin12345',
    name: process.env.ADMIN_NAME ?? 'Admin',
  },
};
