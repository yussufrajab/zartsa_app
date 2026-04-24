import Queue from 'bull';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const smsQueue = new Queue('sms', env.REDIS_URL);
export const emailQueue = new Queue('email', env.REDIS_URL);
export const pushQueue = new Queue('push', env.REDIS_URL);
export const zimsSyncQueue = new Queue('zims-sync', env.REDIS_URL);

export interface SmsJobData {
  to: string;
  message: string;
}

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
}

export interface PushJobData {
  userId: string;
  title: string;
  message: string;
}

export interface ZimsSyncJobData {
  fineId: string;
  action: 'payment' | 'dispute';
}

[smsQueue, emailQueue, pushQueue, zimsSyncQueue].forEach(queue => {
  queue.on('error', (err) => logger.error(`Queue ${queue.name} error`, { error: err.message }));
  queue.on('failed', (_job, err) => logger.error(`Queue ${queue.name} job failed`, { error: err.message }));
});

// Processors will be added in the notifications module plan