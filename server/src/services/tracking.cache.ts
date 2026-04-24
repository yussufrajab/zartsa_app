import { getRedis } from './redis.service';
import type { BusPosition } from '@zartsa/shared';

const CACHE_KEY = 'tracking:buses';
const CACHE_TTL_SECONDS = 300;

export async function cacheBusPosition(position: Omit<BusPosition, 'id'>): Promise<void> {
  const redis = getRedis();
  await redis.hset(CACHE_KEY, position.vehiclePlate, JSON.stringify(position));
  await redis.expire(CACHE_KEY, CACHE_TTL_SECONDS);
}

export async function getCachedBusPositions(): Promise<BusPosition[]> {
  const redis = getRedis();
  const data = await redis.hgetall(CACHE_KEY);
  if (!data || Object.keys(data).length === 0) return [];

  const positions: BusPosition[] = [];
  for (const [, value] of Object.entries(data)) {
    try {
      const parsed = JSON.parse(value as string);
      positions.push({ id: `cached:${parsed.vehiclePlate}`, ...parsed });
    } catch {
      // Skip malformed entries
    }
  }
  return positions;
}

export async function clearBusPositionCache(): Promise<void> {
  const redis = getRedis();
  await redis.del(CACHE_KEY);
}

export async function removeCachedBusPosition(vehiclePlate: string): Promise<void> {
  const redis = getRedis();
  await redis.hdel(CACHE_KEY, vehiclePlate);
}