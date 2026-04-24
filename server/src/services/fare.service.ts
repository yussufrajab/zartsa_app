import { prisma } from '../lib/prisma';
import { cacheGet, cacheSet } from './redis.service';
import { logger } from '../utils/logger';
import type { RouteType, FareSearchResult } from '@zartsa/shared';

const FARE_LIST_CACHE_TTL = 86400; // 24 hours
const FARE_DETAIL_CACHE_TTL = 300;  // 5 minutes

export async function searchFares(routeType: RouteType, departure: string, destination: string): Promise<FareSearchResult[]> {
  const cacheKey = `fares:${routeType}:${departure}:${destination}`;
  const cached = await cacheGet<FareSearchResult[]>(cacheKey);
  if (cached) return cached;

  const fares = await prisma.fareTable.findMany({
    where: {
      routeType,
      departure: { contains: departure, mode: 'insensitive' },
      destination: { contains: destination, mode: 'insensitive' },
      effectiveDate: { lte: new Date() },
    },
    orderBy: { effectiveDate: 'desc' },
  });

  const results: FareSearchResult[] = fares.map((f) => ({
    departure: f.departure,
    destination: f.destination,
    baseFare: Number(f.baseFare),
    surcharge: Number(f.surcharge),
    totalFare: Number(f.baseFare) + Number(f.surcharge),
    currency: f.currency,
    effectiveDate: f.effectiveDate.toISOString(),
  }));

  if (results.length > 0) {
    await cacheSet(cacheKey, results, FARE_DETAIL_CACHE_TTL);
  }

  return results;
}

export async function getAllFares(routeType?: RouteType): Promise<FareSearchResult[]> {
  const cacheKey = `fares:all:${routeType ?? 'all'}`;
  const cached = await cacheGet<FareSearchResult[]>(cacheKey);
  if (cached) return cached;

  const fares = await prisma.fareTable.findMany({
    where: {
      ...(routeType ? { routeType } : {}),
      effectiveDate: { lte: new Date() },
    },
    orderBy: [{ routeType: 'asc' }, { departure: 'asc' }, { destination: 'asc' }],
  });

  const results: FareSearchResult[] = fares.map((f) => ({
    departure: f.departure,
    destination: f.destination,
    baseFare: Number(f.baseFare),
    surcharge: Number(f.surcharge),
    totalFare: Number(f.baseFare) + Number(f.surcharge),
    currency: f.currency,
    effectiveDate: f.effectiveDate.toISOString(),
  }));

  await cacheSet(cacheKey, results, FARE_LIST_CACHE_TTL);
  return results;
}

export async function getFareDetail(routeType: RouteType, departure: string, destination: string): Promise<FareSearchResult | null> {
  const cacheKey = `fares:detail:${routeType}:${departure}:${destination}`;
  const cached = await cacheGet<FareSearchResult>(cacheKey);
  if (cached) return cached;

  const fare = await prisma.fareTable.findUnique({
    where: { routeType_departure_destination: { routeType, departure, destination } },
  });

  if (!fare || fare.effectiveDate > new Date()) return null;

  const result: FareSearchResult = {
    departure: fare.departure,
    destination: fare.destination,
    baseFare: Number(fare.baseFare),
    surcharge: Number(fare.surcharge),
    totalFare: Number(fare.baseFare) + Number(fare.surcharge),
    currency: fare.currency,
    effectiveDate: fare.effectiveDate.toISOString(),
  };

  await cacheSet(cacheKey, result, FARE_DETAIL_CACHE_TTL);
  return result;
}