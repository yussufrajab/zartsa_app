import express from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import { env } from './config/env';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { routes } from './routes';
import { setupSocketIO } from './socket';
import { startAutoUnclaimJob } from './jobs/auto-unclaim';

import './processors/push.processor';
import './processors/sms.processor';
import './processors/email.processor';

const app = express();
const httpServer = createServer(app);

// Trust first proxy for correct IP in rate limiting behind reverse proxy
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.tile.openstreetmap.org", "https://unpkg.com"],
      connectSrc: ["'self'", "ws:", "wss:", "https://*.tile.openstreetmap.org"],
      fontSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

setupSocketIO(httpServer);

httpServer.listen(env.PORT, () => {
  logger.info(`ZARTSA API running on port ${env.PORT} [${env.NODE_ENV}]`);
  startAutoUnclaimJob().catch((err) => logger.error('Failed to start auto-unclaim job', { error: (err as Error).message }));
});

export default app;