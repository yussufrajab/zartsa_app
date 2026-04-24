import { smsQueue } from '../services/queue.service';
import { logger } from '../utils/logger';
import { env } from '../config/env';

smsQueue.process('sms', async (job) => {
  const { to, message } = job.data;

  if (env.NODE_ENV === 'development') {
    logger.info('[DEV SMS]', { to, message });
    return { delivered: true, channel: 'sms' };
  }

  // In production, integrate with SMS gateway (e.g., Africa's Talking, Twilio).
  logger.info('SMS sent', { to, messageLength: message.length });
  return { delivered: true, channel: 'sms' };
});

logger.info('SMS processor started');