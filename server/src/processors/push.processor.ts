import { pushQueue } from '../services/queue.service';
import { logger } from '../utils/logger';
import type { PushJobData } from '../services/queue.service';

pushQueue.process('push', async (job) => {
  const { userId, title, message, notificationId, type } = job.data as PushJobData & { notificationId: string; type: string };

  logger.info('Push notification sent', { userId, notificationId, type });

  // In production, this would send via Socket.IO or Firebase Cloud Messaging.
  // For now, we log and mark as delivered.
  // Socket.IO integration will be added in the fleet tracking module.

  return { notificationId, delivered: true };
});

logger.info('Push notification processor started');