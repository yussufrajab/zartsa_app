import type { Request, Response, NextFunction } from 'express';
import { getRedis } from '../services/redis.service';
import { env } from '../config/env';
import { RateLimitError } from '../utils/errors';

export function rateLimit(keyPrefix: string, maxRequests?: number, windowMs?: number) {
  const max = maxRequests ?? env.RATE_LIMIT_MAX;
  const window = windowMs ?? env.RATE_LIMIT_WINDOW;

  return async (req: Request, _res: Response, next: NextFunction) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const key = `rl:${keyPrefix}:${ip}`;
    const redis = getRedis();

    const current = await redis.incr(key);
    if (current === 1) {
      await redis.pexpire(key, window);
    }

    if (current > max) {
      return next(new RateLimitError());
    }

    next();
  };
}