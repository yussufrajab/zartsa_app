import { prisma } from '../lib/prisma';
import { cacheBusPosition, getCachedBusPositions } from './tracking.cache';
import { broadcastBusUpdate, broadcastDelayAlert } from '../socket';
import type { BusPosition, BusStop, GpsUpdateInput, TrackingFilter } from '@zartsa/shared';

const STALE_THRESHOLD_MINUTES = 5;
const DELAY_THRESHOLD_MINUTES = 30;

export async function ingestGPS(update: GpsUpdateInput) {
  const recordedAt = update.recordedAt ? new Date(update.recordedAt) : new Date();

  const location = await prisma.busLocation.create({
    data: {
      vehiclePlate: update.vehiclePlate,
      operatorId: update.operatorId || null,
      route: update.route,
      serviceType: update.serviceType,
      latitude: update.latitude,
      longitude: update.longitude,
      speed: update.speed || null,
      heading: update.heading || null,
      recordedAt,
    },
  });

  const position: Omit<BusPosition, 'id'> = {
    vehiclePlate: update.vehiclePlate,
    operatorId: update.operatorId || null,
    route: update.route,
    serviceType: update.serviceType,
    latitude: update.latitude,
    longitude: update.longitude,
    speed: update.speed || null,
    heading: update.heading || null,
    recordedAt: recordedAt.toISOString(),
    isStale: false,
  };

  await cacheBusPosition(position);
  broadcastBusUpdate({ ...position, id: location.id });
  await checkDelays(update);

  return location;
}

export async function getBusPositions(filter: TrackingFilter): Promise<BusPosition[]> {
  const cachedPositions = await getCachedBusPositions();

  let positions: BusPosition[];

  if (cachedPositions.length > 0) {
    positions = cachedPositions;
  } else {
    const latestLocations = await prisma.busLocation.findMany({
      where: {
        recordedAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
      },
      orderBy: { recordedAt: 'desc' },
      take: 500,
    });

    const seenPlates = new Set<string>();
    positions = [];
    for (const loc of latestLocations) {
      if (!seenPlates.has(loc.vehiclePlate)) {
        seenPlates.add(loc.vehiclePlate);
        positions.push({
          id: loc.id,
          vehiclePlate: loc.vehiclePlate,
          operatorId: loc.operatorId,
          route: loc.route,
          serviceType: loc.serviceType as 'daladala' | 'shamba',
          latitude: loc.latitude,
          longitude: loc.longitude,
          speed: loc.speed,
          heading: loc.heading,
          recordedAt: loc.recordedAt.toISOString(),
          isStale: false,
        });
      }
    }
  }

  positions = detectStaleData(positions, STALE_THRESHOLD_MINUTES);

  if (filter.route) {
    positions = positions.filter((p) => p.route.toLowerCase().includes(filter.route!.toLowerCase()));
  }
  if (filter.operatorId) {
    positions = positions.filter((p) => p.operatorId === filter.operatorId);
  }
  if (filter.serviceType) {
    positions = positions.filter((p) => p.serviceType === filter.serviceType);
  }

  return positions;
}

export function detectStaleData(positions: BusPosition[], thresholdMinutes: number): BusPosition[] {
  const now = Date.now();
  const thresholdMs = thresholdMinutes * 60 * 1000;

  return positions.map((position) => {
    const recordedTime = new Date(position.recordedAt).getTime();
    const isStale = now - recordedTime > thresholdMs;
    return { ...position, isStale };
  });
}

export function calculateETA(distanceKm: number, speedKmh: number): number {
  if (speedKmh <= 0 || distanceKm <= 0) return 0;
  return Math.round((distanceKm / speedKmh) * 60);
}

export async function checkDelays(update: GpsUpdateInput) {
  const recentPositions = await prisma.busLocation.findMany({
    where: {
      vehiclePlate: update.vehiclePlate,
      recordedAt: { gte: new Date(Date.now() - DELAY_THRESHOLD_MINUTES * 60 * 1000) },
    },
    orderBy: { recordedAt: 'desc' },
    take: 5,
  });

  if (recentPositions.length >= 2) {
    const oldest = recentPositions[recentPositions.length - 1];
    const newest = recentPositions[0];
    const timeDiff = (newest.recordedAt.getTime() - oldest.recordedAt.getTime()) / (1000 * 60);
    const distanceMoved = Math.sqrt(
      Math.pow(newest.latitude - oldest.latitude, 2) +
      Math.pow(newest.longitude - oldest.longitude, 2)
    ) * 111;

    if (timeDiff >= DELAY_THRESHOLD_MINUTES && distanceMoved < 0.5) {
      broadcastDelayAlert({
        vehiclePlate: update.vehiclePlate,
        route: update.route,
        delayMinutes: Math.round(timeDiff),
      });
    }
  }
}

const BUS_STOPS: BusStop[] = [
  { id: 'stop1', name: 'Stone Town Terminal', nameSw: 'Kituo cha Mji Mkongwe', nameEn: 'Stone Town Terminal', latitude: -6.1659, longitude: 39.1989, servedRoutes: ['Stone Town - Fuoni', 'Stone Town - Mwanakwerekwe', 'Stone Town - Kiembe Samaki', 'Stone Town - Paje', 'Stone Town - Nungwi', 'Stone Town - Jambiani'] },
  { id: 'stop2', name: 'Fuoni', nameSw: 'Fuoni', nameEn: 'Fuoni', latitude: -6.1780, longitude: 39.2150, servedRoutes: ['Stone Town - Fuoni'] },
  { id: 'stop3', name: 'Mwanakwerekwe', nameSw: 'Mwanakwerekwe', nameEn: 'Mwanakwerekwe', latitude: -6.1850, longitude: 39.2200, servedRoutes: ['Stone Town - Mwanakwerekwe'] },
  { id: 'stop4', name: 'Kiembe Samaki', nameSw: 'Kiembe Samaki', nameEn: 'Kiembe Samaki', latitude: -6.1700, longitude: 39.2100, servedRoutes: ['Stone Town - Kiembe Samaki'] },
  { id: 'stop5', name: 'Paje', nameSw: 'Paje', nameEn: 'Paje', latitude: -6.2250, longitude: 39.5100, servedRoutes: ['Stone Town - Paje'] },
  { id: 'stop6', name: 'Jambiani', nameSw: 'Jambiani', nameEn: 'Jambiani', latitude: -6.2400, longitude: 39.5400, servedRoutes: ['Stone Town - Jambiani'] },
  { id: 'stop7', name: 'Nungwi', nameSw: 'Nungwi', nameEn: 'Nungwi', latitude: -5.7200, longitude: 39.2900, servedRoutes: ['Stone Town - Nungwi'] },
  { id: 'stop8', name: 'Chukwani', nameSw: 'Chukwani', nameEn: 'Chukwani', latitude: -6.1900, longitude: 39.2300, servedRoutes: ['Stone Town - Mwanakwerekwe'] },
  { id: 'stop9', name: 'Mlandege', nameSw: 'Mlandege', nameEn: 'Mlandege', latitude: -6.1680, longitude: 39.1950, servedRoutes: ['Stone Town - Fuoni', 'Stone Town - Mwanakwerekwe'] },
  { id: 'stop10', name: 'Mkomanile', nameSw: 'Mkomanile', nameEn: 'Mkomanile', latitude: -6.1720, longitude: 39.2000, servedRoutes: ['Stone Town - Kiembe Samaki', 'Stone Town - Paje'] },
];

export async function getBusStops(): Promise<BusStop[]> {
  return BUS_STOPS;
}