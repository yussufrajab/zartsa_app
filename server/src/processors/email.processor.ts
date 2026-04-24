import { emailQueue } from '../services/queue.service';
import { logger } from '../utils/logger';

emailQueue.process('email', async (job) => {
  const { to, subject, body } = job.data;

  // In production, integrate with email service (e.g., SendGrid, AWS SES).
  // For now, log in development.
  logger.info('[DEV EMAIL]', { to, subject, bodyLength: body.length });

  return { delivered: true, channel: 'email' };
});

logger.info('Email processor started');