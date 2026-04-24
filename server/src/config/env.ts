import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_ACCESS_KEY: z.string(),
  MINIO_SECRET_KEY: z.string(),
  MINIO_BUCKET: z.string().default('zartsa'),
  ZIMS_API_URL: z.string().url(),
  ZIMS_API_KEY: z.string(),
  SMS_GATEWAY_URL: z.string().optional(),
  SMS_GATEWAY_KEY: z.string().optional(),
  CLIENT_URL: z.string().default('http://localhost:3000'),
  OTP_EXPIRES_IN: z.coerce.number().default(300),
  RATE_LIMIT_MAX: z.coerce.number().default(50),
  RATE_LIMIT_WINDOW: z.coerce.number().default(3600000),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;