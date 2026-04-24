import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { routes } from './routes';

import './processors/push.processor';
import './processors/sms.processor';
import './processors/email.processor';

const app = express();

app.use(helmet());
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.listen(env.PORT, () => {
  logger.info(`ZARTSA API running on port ${env.PORT} [${env.NODE_ENV}]`);
});

export default app;