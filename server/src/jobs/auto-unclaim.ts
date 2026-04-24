import { autoUnclaimOldItems } from '../services/lost-found.service';
import { logger } from '../utils/logger';

export async function startAutoUnclaimJob() {
  const INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  const runJob = async () => {
    try {
      const count = await autoUnclaimOldItems();
      logger.info(`Auto-unclaim job: ${count} items marked as unclaimed`);
    } catch (err) {
      logger.error('Auto-unclaim job failed', { error: (err as Error).message });
    }
  };

  // Run immediately on startup
  await runJob();

  // Then run every 24 hours
  setInterval(runJob, INTERVAL);
  logger.info('Auto-unclaim job scheduled (every 24 hours)');
}