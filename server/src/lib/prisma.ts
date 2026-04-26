import { PrismaClient } from '../generated/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env.js';

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export const prisma = new PrismaClient({ adapter });