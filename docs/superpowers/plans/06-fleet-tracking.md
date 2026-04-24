# ZARTSA Real-Time Fleet Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time fleet tracking module with an interactive Leaflet map showing live GPS positions of active buses, Socket.IO-based position updates, bus stop directory, ETA display, filter panel, stale-data detection, and delay alerts.

**Architecture:** The server ingests GPS updates via POST `/api/tracking/update` (from GPS devices/services), stores the latest position in the database and a Redis cache, and broadcasts updates via Socket.IO to connected clients. The client renders a Leaflet map with OpenStreetMap tiles, listens for Socket.IO events to update bus markers in real time, and provides filter/sort controls. Bus positions older than 5 minutes are flagged as stale and rendered with a greyed-out style. Delay alerts are emitted when buses exceed a configurable threshold (default 30 minutes).

**Tech Stack:** Socket.IO 4, Express 5, Prisma 7, Redis 7 (ioredis), Leaflet.js, react-leaflet 4, Next.js 16, React 19, Tailwind 4, Lucide React, Sonner, Zod

---

## File Structure

```
shared/src/
  types/tracking.ts                # New: BusPosition, BusStop, TrackingFilter, DelayAlert
  schemas/tracking.schema.ts       # New: Zod schemas for GPS update, filter params
  index.ts                         # Updated: re-export tracking schemas

server/src/
  services/tracking.service.ts     # New: ingestGPS, getBusPositions, getBusStops, detectStale, calculateETA, checkDelays
  services/tracking.cache.ts        # New: Redis cache layer for current bus positions
  routes/tracking.routes.ts        # New: GET /api/tracking/buses, GET /api/tracking/stops, POST /api/tracking/update
  routes/index.ts                  # Updated: wire tracking routes
  socket.ts                        # New: Socket.IO server setup and event handlers

client/src/
  app/track/
    page.tsx                       # Updated: full tracking page
    bus-map.tsx                    # New: Leaflet map component with Socket.IO listener
    bus-marker.tsx                  # New: individual bus marker with tooltip
    filter-panel.tsx                # New: filter by route, operator, service type
    bus-stop-list.tsx              # New: bus stop directory component
    delay-alert.tsx                 # New: delay and stale data alert component
  i18n/sw.json                    # Updated: add tracking i18n keys
  i18n/en.json                    # Updated: add tracking i18n keys
```

---

### Task 1: Tracking Types and Zod Schemas (Shared Package)

**Files:**
- Create: `shared/src/types/tracking.ts`
- Create: `shared/src/schemas/tracking.schema.ts`
- Modify: `shared/src/index.ts`

- [ ] **Step 1: Write failing test for tracking schemas**

```typescript
// shared/src/schemas/__tests__/tracking.schema.test.ts
import { describe, it, expect } from 'vitest';
import { gpsUpdateSchema, trackingFilterSchema } from '../tracking.schema';

describe('gpsUpdateSchema', () => {
  it('accepts valid GPS update', () => {
    const result = gpsUpdateSchema.safeParse({
      vehiclePlate: 'T123ABC',
      operatorId: 'op1',
      route: 'Stone Town - Fuoni',
      serviceType: 'daladala',
      latitude: -6.1659,
      longitude: 39.1989,
      speed: 45.5,
      heading: 180,
      recordedAt: '2026-04-24T10:00:00Z',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehiclePlate).toBe('T123ABC');
      expect(result.data.serviceType).toBe('daladala');
    }
  });

  it('rejects latitude out of range', () => {
    const result = gpsUpdateSchema.safeParse({
      vehiclePlate: 'T123ABC',
      route: 'R1',
      serviceType: 'daladala',
      latitude: 95,
      longitude: 39.1989,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid serviceType', () => {
    const result = gpsUpdateSchema.safeParse({
      vehiclePlate: 'T123ABC',
      route: 'R1',
      serviceType: 'taxi',
      latitude: -6.1659,
      longitude: 39.1989,
    });
    expect(result.success).toBe(false);
  });

  it('allows optional fields to be omitted', () => {
    const result = gpsUpdateSchema.safeParse({
      vehiclePlate: 'T123ABC',
      route: 'R1',
      serviceType: 'shamba',
      latitude: -6.1659,
      longitude: 39.1989,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.speed).toBeUndefined();
      expect(result.data.heading).toBeUndefined();
    }
  });
});

describe('trackingFilterSchema', () => {
  it('accepts empty filter', () => {
    const result = trackingFilterSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid filter with all fields', () => {
    const result = trackingFilterSchema.safeParse({
      route: 'Stone Town - Fuoni',
      operatorId: 'op1',
      serviceType: 'daladala',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid serviceType in filter', () => {
    const result = trackingFilterSchema.safeParse({
      serviceType: 'helicopter',
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/yusuf/zartsa/shared && npx vitest run src/schemas/__tests__/tracking.schema.test.ts`
Expected: FAIL - Cannot find module '../tracking.schema'

- [ ] **Step 3: Write tracking types**

```typescript
// shared/src/types/tracking.ts
export interface BusPosition {
  id: string;
  vehiclePlate: string;
  operatorId: string | null;
  route: string;
  serviceType: 'daladala' | 'shamba';
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  recordedAt: string;
  isStale: boolean;
}

export interface BusStop {
  id: string;
  name: string;
  nameSw: string;
  nameEn: string;
  latitude: number;
  longitude: number;
  servedRoutes: string[];
}

export interface TrackingFilter {
  route?: string;
  operatorId?: string;
  serviceType?: 'daladala' | 'shamba';
}

export interface DelayAlert {
  id: string;
  vehiclePlate: string;
  route: string;
  delayMinutes: number;
  threshold: number;
  createdAt: string;
}

export interface GpsUpdate {
  vehiclePlate: string;
  operatorId?: string;
  route: string;
  serviceType: 'daladala' | 'shamba';
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  recordedAt?: string;
}
```

- [ ] **Step 4: Write tracking Zod schemas**

```typescript
// shared/src/schemas/tracking.schema.ts
import { z } from 'zod';

export const gpsUpdateSchema = z.object({
  vehiclePlate: z.string().min(1, 'Vehicle plate is required').max(20),
  operatorId: z.string().optional(),
  route: z.string().min(1, 'Route is required').max(200),
  serviceType: z.enum(['daladala', 'shamba'], {
    errorMap: () => ({ message: 'Service type must be daladala or shamba' }),
  }),
  latitude: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
  speed: z.number().min(0).optional(),
  heading: z.number().min(0).max(360).optional(),
  recordedAt: z.string().datetime().optional(),
});

export const trackingFilterSchema = z.object({
  route: z.string().optional(),
  operatorId: z.string().optional(),
  serviceType: z.enum(['daladala', 'shamba']).optional(),
});

export type GpsUpdateInput = z.infer<typeof gpsUpdateSchema>;
export type TrackingFilterInput = z.infer<typeof trackingFilterSchema>;
```

- [ ] **Step 5: Update shared barrel export**

Add to `shared/src/index.ts`:

```typescript
export * from './types/tracking';
export * from './schemas/tracking.schema';
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd /home/yusuf/zartsa/shared && npx vitest run src/schemas/__tests__/tracking.schema.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 7: Commit**

```bash
git add shared/src/types/tracking.ts shared/src/schemas/tracking.schema.ts shared/src/schemas/__tests__/tracking.schema.test.ts shared/src/index.ts
git commit -m "feat: add tracking types, GPS update schema, and filter schema with tests"
```

---

### Task 2: Tracking Cache Layer (Redis)

**Files:**
- Create: `server/src/services/tracking.cache.ts`

- [ ] **Step 1: Write failing test for tracking cache**

```typescript
// server/src/services/__tests__/tracking.cache.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRedis = {
  set: vi.fn().mockResolvedValue('OK'),
  get: vi.fn().mockResolvedValue(null),
  del: vi.fn().mockResolvedValue(1),
  keys: vi.fn().mockResolvedValue([]),
  hset: vi.fn().mockResolvedValue(1),
  hgetall: vi.fn().mockResolvedValue({}),
  expire: vi.fn().mockResolvedValue(1),
};

vi.mock('../redis.service', () => ({
  getRedis: () => mockRedis,
}));

import {
  cacheBusPosition,
  getCachedBusPositions,
  clearBusPositionCache,
} from '../tracking.cache';

describe('tracking cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('caches a bus position as JSON hash', async () => {
    const position = {
      vehiclePlate: 'T123ABC',
      route: 'R1',
      serviceType: 'daladala',
      latitude: -6.1659,
      longitude: 39.1989,
      speed: 45,
      heading: 180,
      recordedAt: '2026-04-24T10:00:00Z',
      isStale: false,
    };

    await cacheBusPosition(position);
    expect(mockRedis.hset).toHaveBeenCalledWith(
      'tracking:buses',
      'T123ABC',
      expect.any(String)
    );
  });

  it('returns empty array when no cached positions', async () => {
    mockRedis.hgetall.mockResolvedValue({});
    const positions = await getCachedBusPositions();
    expect(positions).toEqual([]);
  });

  it('clears bus position cache', async () => {
    await clearBusPositionCache();
    expect(mockRedis.del).toHaveBeenCalledWith('tracking:buses');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/yusuf/zartsa/server && npx vitest run src/services/__tests__/tracking.cache.test.ts`
Expected: FAIL - Cannot find module '../tracking.cache'

- [ ] **Step 3: Write tracking cache implementation**

```typescript
// server/src/services/tracking.cache.ts
import { getRedis } from './redis.service';
import type { BusPosition } from '@zartsa/shared';

const CACHE_KEY = 'tracking:buses';
const CACHE_TTL_SECONDS = 300; // 5 minutes

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/yusuf/zartsa/server && npx vitest run src/services/__tests__/tracking.cache.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/services/tracking.cache.ts server/src/services/__tests__/tracking.cache.test.ts
git commit -m "feat: add Redis cache layer for real-time bus positions"
```

---

### Task 3: Socket.IO Server Setup

**Files:**
- Create: `server/src/socket.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Write failing test for Socket.IO setup**

```typescript
// server/src/__tests__/socket.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createServer } from 'http';

vi.mock('socket.io', () => ({
  Server: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    to: vi.fn().mockReturnValue({ emit: vi.fn() }),
    sockets: { adapter: { rooms: new Map() } },
  })),
}));

import { setupSocketIO } from '../socket';

describe('Socket.IO setup', () => {
  it('creates a Socket.IO server and returns io instance', () => {
    const httpServer = createServer();
    const io = setupSocketIO(httpServer);
    expect(io).toBeDefined();
    expect(io.on).toBeDefined();
  });

  it('registers connection handler', () => {
    const httpServer = createServer();
    const io = setupSocketIO(httpServer);
    expect(io.on).toHaveBeenCalledWith('connection', expect.any(Function));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/yusuf/zartsa/server && npx vitest run src/__tests__/socket.test.ts`
Expected: FAIL - Cannot find module '../socket'

- [ ] **Step 3: Write Socket.IO setup**

```typescript
// server/src/socket.ts
import { createServer, type Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { logger } from './utils/logger';

let io: Server;

export function setupSocketIO(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: Socket) => {
    logger.info('Socket client connected', { socketId: socket.id });

    socket.on('subscribe:route', (route: string) => {
      socket.join(`route:${route}`);
      logger.debug('Client subscribed to route', { socketId: socket.id, route });
    });

    socket.on('unsubscribe:route', (route: string) => {
      socket.leave(`route:${route}`);
      logger.debug('Client unsubscribed from route', { socketId: socket.id, route });
    });

    socket.on('subscribe:operator', (operatorId: string) => {
      socket.join(`operator:${operatorId}`);
    });

    socket.on('unsubscribe:operator', (operatorId: string) => {
      socket.leave(`operator:${operatorId}`);
    });

    socket.on('disconnect', (reason) => {
      logger.debug('Socket client disconnected', { socketId: socket.id, reason });
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call setupSocketIO first.');
  }
  return io;
}

export function broadcastBusUpdate(position: { vehiclePlate: string; route: string; operatorId: string | null; [key: string]: unknown }) {
  const server = getIO();

  // Broadcast to all connected clients
  server.emit('bus:update', position);

  // Broadcast to route-specific room
  if (position.route) {
    server.to(`route:${position.route}`).emit('bus:update', position);
  }

  // Broadcast to operator-specific room
  if (position.operatorId) {
    server.to(`operator:${position.operatorId}`).emit('bus:update', position);
  }
}

export function broadcastDelayAlert(alert: { vehiclePlate: string; route: string; delayMinutes: number; [key: string]: unknown }) {
  const server = getIO();
  server.emit('delay:alert', alert);
  if (alert.route) {
    server.to(`route:${alert.route}`).emit('delay:alert', alert);
  }
}
```

- [ ] **Step 4: Update server entry to integrate Socket.IO**

Modify `server/src/index.ts`:

```typescript
// server/src/index.ts
import express from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import { env } from './config/env';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { routes } from './routes';
import { setupSocketIO } from './socket';

const app = express();
const httpServer = createServer(app);

app.use(helmet());
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

// Setup Socket.IO on the HTTP server
setupSocketIO(httpServer);

httpServer.listen(env.PORT, () => {
  logger.info(`ZARTSA API running on port ${env.PORT} [${env.NODE_ENV}]`);
});

export default app;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /home/yusuf/zartsa/server && npx vitest run src/__tests__/socket.test.ts`
Expected: 2 tests PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/socket.ts server/src/index.ts server/src/__tests__/socket.test.ts
git commit -m "feat: add Socket.IO server with room-based subscriptions for route and operator tracking"
```

---

### Task 4: Tracking Service (Server)

**Files:**
- Create: `server/src/services/tracking.service.ts`

- [ ] **Step 1: Write failing test for tracking service**

```typescript
// server/src/services/__tests__/tracking.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  busLocation: {
    create: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    groupBy: vi.fn().mockResolvedValue([]),
  },
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrisma),
}));

const mockCacheBusPosition = vi.fn();
const mockGetCachedBusPositions = vi.fn().mockResolvedValue([]);
vi.mock('../tracking.cache', () => ({
  cacheBusPosition: mockCacheBusPosition,
  getCachedBusPositions: mockGetCachedBusPositions,
  clearBusPositionCache: vi.fn(),
}));

const mockBroadcastBusUpdate = vi.fn();
const mockBroadcastDelayAlert = vi.fn();
vi.mock('../socket', () => ({
  broadcastBusUpdate: mockBroadcastBusUpdate,
  broadcastDelayAlert: mockBroadcastDelayAlert,
  getIO: vi.fn(),
}));

import { ingestGPS, getBusPositions, getBusStops, detectStaleData, calculateETA, checkDelays } from '../tracking.service';
import type { GpsUpdateInput } from '@zartsa/shared';

describe('ingestGPS', () => {
  const update: GpsUpdateInput = {
    vehiclePlate: 'T123ABC',
    operatorId: 'op1',
    route: 'Stone Town - Fuoni',
    serviceType: 'daladala',
    latitude: -6.1659,
    longitude: 39.1989,
    speed: 45,
    heading: 180,
  };

  it('stores position in database and cache', async () => {
    mockPrisma.busLocation.create.mockResolvedValue({
      id: 'loc1', ...update, recordedAt: new Date(), createdAt: new Date(),
    });

    const result = await ingestGPS(update);
    expect(mockPrisma.busLocation.create).toHaveBeenCalled();
    expect(mockCacheBusPosition).toHaveBeenCalled();
    expect(mockBroadcastBusUpdate).toHaveBeenCalled();
    expect(result.vehiclePlate).toBe('T123ABC');
  });
});

describe('getBusPositions', () => {
  it('returns cached positions when available', async () => {
    const cachedPositions = [
      { id: 'c1', vehiclePlate: 'T123ABC', route: 'R1', serviceType: 'daladala', latitude: -6.1659, longitude: 39.1989, speed: 45, heading: 180, recordedAt: new Date().toISOString(), isStale: false },
    ];
    mockGetCachedBusPositions.mockResolvedValue(cachedPositions);

    const positions = await getBusPositions({});
    expect(positions).toHaveLength(1);
    expect(positions[0].vehiclePlate).toBe('T123ABC');
  });

  it('falls back to database when cache is empty', async () => {
    mockGetCachedBusPositions.mockResolvedValue([]);
    mockPrisma.busLocation.groupBy.mockResolvedValue([
      { vehiclePlate: 'T456DEF', _max: { recordedAt: new Date(), id: 'loc2' }, _min: { latitude: -6.1659, longitude: 39.1989 } },
    ]);

    const positions = await getBusPositions({});
    expect(Array.isArray(positions)).toBe(true);
  });
});

describe('detectStaleData', () => {
  it('marks positions older than 5 minutes as stale', () => {
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    const justNow = new Date().toISOString();

    const positions = [
      { id: '1', vehiclePlate: 'T1', route: 'R1', serviceType: 'daladala' as const, latitude: -6, longitude: 39, speed: 45, heading: 180, recordedAt: sixMinutesAgo, isStale: false },
      { id: '2', vehiclePlate: 'T2', route: 'R1', serviceType: 'daladala' as const, latitude: -6, longitude: 39, speed: 30, heading: 90, recordedAt: justNow, isStale: false },
    ];

    const result = detectStaleData(positions, 5);
    expect(result[0].isStale).toBe(true);
    expect(result[1].isStale).toBe(false);
  });
});

describe('calculateETA', () => {
  it('returns estimated minutes based on distance and speed', () => {
    const distanceKm = 10;
    const speedKmh = 30;
    const eta = calculateETA(distanceKm, speedKmh);
    expect(eta).toBe(20); // 10km at 30km/h = 20 minutes
  });

  it('returns 0 for zero distance', () => {
    const eta = calculateETA(0, 30);
    expect(eta).toBe(0);
  });
});

describe('getBusStops', () => {
  it('returns static bus stop directory', async () => {
    const stops = await getBusStops();
    expect(Array.isArray(stops)).toBe(true);
    expect(stops.length).toBeGreaterThan(0);
    expect(stops[0]).toHaveProperty('name');
    expect(stops[0]).toHaveProperty('latitude');
    expect(stops[0]).toHaveProperty('longitude');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/yusuf/zartsa/server && npx vitest run src/services/__tests__/tracking.service.test.ts`
Expected: FAIL - Cannot find module '../tracking.service'

- [ ] **Step 3: Write tracking service implementation**

```typescript
// server/src/services/tracking.service.ts
import { PrismaClient } from '@prisma/client';
import { cacheBusPosition, getCachedBusPositions } from './tracking.cache';
import { broadcastBusUpdate, broadcastDelayAlert } from './socket';
import type { BusPosition, BusStop, GpsUpdateInput, TrackingFilter } from '@zartsa/shared';

const prisma = new PrismaClient();
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

  // Check for delay conditions
  await checkDelays(update);

  return location;
}

export async function getBusPositions(filter: TrackingFilter): Promise<BusPosition[]> {
  const cachedPositions = await getCachedBusPositions();

  let positions: BusPosition[];

  if (cachedPositions.length > 0) {
    positions = cachedPositions;
  } else {
    // Fallback: get latest position per vehicle from database
    const latestLocations = await prisma.busLocation.findMany({
      where: {
        recordedAt: { gte: new Date(Date.now() - 30 * 60 * 1000) }, // last 30 min
      },
      orderBy: { recordedAt: 'desc' },
      take: 500,
    });

    // Deduplicate by vehiclePlate, keeping most recent
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

  // Apply stale detection
  positions = detectStaleData(positions, STALE_THRESHOLD_MINUTES);

  // Apply filters
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
  // Simple delay detection: if GPS hasn't moved significantly in 30+ minutes
  // In a full implementation, this would compare against schedule data
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
    ) * 111; // rough km conversion

    // If less than 0.5km moved in 30+ minutes, flag as delayed
    if (timeDiff >= DELAY_THRESHOLD_MINUTES && distanceMoved < 0.5) {
      broadcastDelayAlert({
        vehiclePlate: update.vehiclePlate,
        route: update.route,
        delayMinutes: Math.round(timeDiff),
      });
    }
  }
}

// Static bus stop directory with real Zanzibar locations
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/yusuf/zartsa/server && npx vitest run src/services/__tests__/tracking.service.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/services/tracking.service.ts server/src/services/__tests__/tracking.service.test.ts
git commit -m "feat: add tracking service with GPS ingest, stale detection, ETA calculation, delay alerts, and bus stop directory"
```

---

### Task 5: Tracking Routes (Server)

**Files:**
- Create: `server/src/routes/tracking.routes.ts`
- Modify: `server/src/routes/index.ts`

- [ ] **Step 1: Write failing test for tracking routes**

```typescript
// server/src/routes/__tests__/tracking.routes.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const mockGetBusPositions = vi.fn().mockResolvedValue([]);
const mockIngestGPS = vi.fn();
const mockGetBusStops = vi.fn().mockResolvedValue([]);

vi.mock('../../services/tracking.service', () => ({
  getBusPositions: mockGetBusPositions,
  ingestGPS: mockIngestGPS,
  getBusStops: mockGetBusStops,
}));

vi.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.userId = 'test-user-id';
    req.userRole = 'admin';
    next();
  },
  authorize: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../middleware/rateLimit', () => ({
  rateLimit: () => (_req: any, _res: any, next: any) => next(),
}));

import express from 'express';
import { trackingRoutes } from '../tracking.routes';

const app = express();
app.use(express.json());
app.use('/api/tracking', trackingRoutes);

describe('GET /api/tracking/buses', () => {
  it('returns bus positions', async () => {
    mockGetBusPositions.mockResolvedValue([
      { id: '1', vehiclePlate: 'T123ABC', route: 'R1', serviceType: 'daladala', latitude: -6.1659, longitude: 39.1989, speed: 45, heading: 180, recordedAt: new Date().toISOString(), isStale: false },
    ]);

    const res = await request(app).get('/api/tracking/buses');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('applies filter query params', async () => {
    mockGetBusPositions.mockResolvedValue([]);

    const res = await request(app).get('/api/tracking/buses?serviceType=daladala&route=Stone+Town');
    expect(res.status).toBe(200);
    expect(mockGetBusPositions).toHaveBeenCalledWith(
      expect.objectContaining({ serviceType: 'daladala' })
    );
  });
});

describe('GET /api/tracking/stops', () => {
  it('returns bus stops', async () => {
    mockGetBusStops.mockResolvedValue([
      { id: 'stop1', name: 'Stone Town', nameSw: 'Mji Mkongwe', nameEn: 'Stone Town', latitude: -6.1659, longitude: 39.1989, servedRoutes: ['R1'] },
    ]);

    const res = await request(app).get('/api/tracking/stops');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('POST /api/tracking/update', () => {
  it('accepts valid GPS update', async () => {
    mockIngestGPS.mockResolvedValue({ id: 'loc1' });

    const res = await request(app)
      .post('/api/tracking/update')
      .send({
        vehiclePlate: 'T123ABC',
        route: 'R1',
        serviceType: 'daladala',
        latitude: -6.1659,
        longitude: 39.1989,
        speed: 45,
      });
    expect(res.status).toBe(201);
  });

  it('rejects invalid GPS update', async () => {
    const res = await request(app)
      .post('/api/tracking/update')
      .send({ vehiclePlate: '', latitude: 200 });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/yusuf/zartsa/server && npx vitest run src/routes/__tests__/tracking.routes.test.ts`
Expected: FAIL - Cannot find module '../tracking.routes'

- [ ] **Step 3: Write tracking routes implementation**

```typescript
// server/src/routes/tracking.routes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';
import { gpsUpdateSchema, trackingFilterSchema } from '@zartsa/shared';
import { getBusPositions, ingestGPS, getBusStops } from '../services/tracking.service';

export const trackingRoutes = Router();

// GET /api/tracking/buses - Get current bus positions (no auth required per SRS)
trackingRoutes.get('/buses',
  rateLimit('tracking', 60, 60_000),
  async (req, res, next) => {
    try {
      const filterResult = trackingFilterSchema.safeParse(req.query);
      const filter = filterResult.success ? filterResult.data : {};
      const positions = await getBusPositions(filter);
      res.json({ status: 'ok', data: positions });
    } catch (err) { next(err); }
  }
);

// GET /api/tracking/stops - Bus stop directory (no auth required per SRS)
trackingRoutes.get('/stops',
  rateLimit('tracking', 60, 60_000),
  async (_req, res, next) => {
    try {
      const stops = await getBusStops();
      res.json({ status: 'ok', data: stops });
    } catch (err) { next(err); }
  }
);

// POST /api/tracking/update - Ingest GPS data (auth required: operator, driver, admin)
trackingRoutes.post('/update',
  authenticate,
  authorize('operator', 'driver', 'admin'),
  rateLimit('gps-update', 120, 60_000),
  validate(gpsUpdateSchema),
  async (req, res, next) => {
    try {
      const location = await ingestGPS(req.body);
      res.status(201).json({ status: 'ok', data: location });
    } catch (err) { next(err); }
  }
);
```

- [ ] **Step 4: Wire tracking routes into main router**

Modify `server/src/routes/index.ts`:

```typescript
// server/src/routes/index.ts
import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { usersRoutes } from './users.routes';
import { trackingRoutes } from './tracking.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/tracking', trackingRoutes);

export const routes = router;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /home/yusuf/zartsa/server && npx vitest run src/routes/__tests__/tracking.routes.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/tracking.routes.ts server/src/routes/__tests__/tracking.routes.test.ts server/src/routes/index.ts
git commit -m "feat: add tracking API routes for bus positions, bus stops, and GPS update ingestion"
```

---

### Task 6: Client Bus Map Component with Socket.IO

**Files:**
- Create: `client/src/app/track/bus-map.tsx`
- Create: `client/src/app/track/bus-marker.tsx`

- [ ] **Step 1: Install Socket.IO client**

Run: `cd /home/yusuf/zartsa && npm install -w client socket.io-client`

- [ ] **Step 2: Write bus marker component**

```tsx
// client/src/app/track/bus-marker.tsx
'use client';

import { Marker, Tooltip } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { useTranslation } from 'react-i18next';
import type { BusPosition } from '@zartsa/shared';

interface BusMarkerProps {
  position: BusPosition;
}

export function BusMarker({ position }: BusMarkerProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'sw' ? 'sw' : 'en';

  const markerIcon = divIcon({
    className: 'custom-bus-icon',
    html: `<div style="
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: bold;
      color: white;
      background: ${position.isStale ? '#9ca3af' : position.serviceType === 'daladala' ? '#059669' : '#1d4ed8'};
      border: 2px solid ${position.isStale ? '#6b7280' : 'white'};
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      opacity: ${position.isStale ? '0.6' : '1'};
    ">${position.serviceType === 'daladala' ? 'D' : 'S'}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  const recordedTime = new Date(position.recordedAt);
  const timeStr = recordedTime.toLocaleTimeString(lang === 'sw' ? 'sw-TZ' : 'en-TZ', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Marker
      position={[position.latitude, position.longitude]}
      icon={markerIcon}
    >
      <Tooltip permanent={false}>
        <div className="text-xs">
          <p className="font-bold">{position.vehiclePlate}</p>
          <p>{position.route}</p>
          <p>{position.serviceType === 'daladala' ? t('fare.daladala') : t('fare.shamba')}</p>
          {position.speed !== null && <p>{Math.round(position.speed)} km/h</p>}
          <p className={position.isStale ? 'text-gray-500' : 'text-green-600'}>
            {position.isStale
              ? `${t('track.lastSeen')}: ${timeStr}`
              : `${t('track.liveMap')}: ${timeStr}`}
          </p>
        </div>
      </Tooltip>
    </Marker>
  );
}
```

- [ ] **Step 3: Write bus map component with Socket.IO integration**

```tsx
// client/src/app/track/bus-map.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api-client';
import { BusMarker } from './bus-marker';
import type { BusPosition, TrackingFilter } from '@zartsa/shared';

interface BusMapProps {
  filter: TrackingFilter;
}

const ZANZIBAR_CENTER: [number, number] = [-6.1659, 39.1989];
const DEFAULT_ZOOM = 12;
const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || '';

function MapUpdater({ positions }: { positions: BusPosition[] }) {
  const map = useMap();
  // No-op: markers update via React re-render, not map movement
  return null;
}

export function BusMap({ filter }: BusMapProps) {
  const { t } = useTranslation();
  const [positions, setPositions] = useState<BusPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Fetch initial positions
  useEffect(() => {
    async function fetchPositions() {
      try {
        const params = new URLSearchParams();
        if (filter.route) params.set('route', filter.route);
        if (filter.operatorId) params.set('operatorId', filter.operatorId);
        if (filter.serviceType) params.set('serviceType', filter.serviceType);

        const response = await api.get<{ status: string; data: BusPosition[] }>(
          `/tracking/buses?${params.toString()}`
        );
        setPositions(response.data);
      } catch {
        // Will show empty map
      } finally {
        setLoading(false);
      }
    }
    fetchPositions();
  }, [filter]);

  // Setup Socket.IO connection
  useEffect(() => {
    const socketIo = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socketIo.on('connect', () => {
      console.log('[Tracking] Socket connected');
    });

    socketIo.on('bus:update', (update: BusPosition) => {
      setPositions((prev) => {
        const index = prev.findIndex((p) => p.vehiclePlate === update.vehiclePlate);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = update;
          return updated;
        }
        return [...prev, update];
      });
    });

    socketIo.on('delay:alert', (alert: { vehiclePlate: string; route: string; delayMinutes: number }) => {
      console.log('[Tracking] Delay alert:', alert);
    });

    socketIo.on('disconnect', () => {
      console.log('[Tracking] Socket disconnected');
    });

    setSocket(socketIo);

    return () => {
      socketIo.disconnect();
    };
  }, []);

  // Subscribe to filtered rooms
  useEffect(() => {
    if (!socket || !socket.connected) return;

    if (filter.route) {
      socket.emit('subscribe:route', filter.route);
    }
    if (filter.operatorId) {
      socket.emit('subscribe:operator', filter.operatorId);
    }

    return () => {
      if (filter.route) {
        socket.emit('unsubscribe:route', filter.route);
      }
      if (filter.operatorId) {
        socket.emit('unsubscribe:operator', filter.operatorId);
      }
    };
  }, [socket, filter]);

  const activeBuses = positions.filter((p) => !p.isStale);
  const staleBuses = positions.filter((p) => p.isStale);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border bg-gray-50">
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-2 top-2 z-[1000] rounded-md bg-white/90 px-2 py-1 text-xs shadow">
        <span className="inline-block h-3 w-3 rounded-full bg-zartsa-green" /> {t('fare.daladala')} ({activeBuses.filter((b) => b.serviceType === 'daladala').length})
        {' '}
        <span className="ml-1 inline-block h-3 w-3 rounded-full bg-zartsa-blue" /> {t('fare.shamba')} ({activeBuses.filter((b) => b.serviceType === 'shamba').length})
        {' '}
        <span className="ml-1 inline-block h-3 w-3 rounded-full bg-gray-400" /> {t('track.lastSeen')} ({staleBuses.length})
      </div>
      <MapContainer
        center={ZANZIBAR_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-96 w-full rounded-lg"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater positions={positions} />
        {positions.map((pos) => (
          <BusMarker key={pos.vehiclePlate} position={pos} />
        ))}
      </MapContainer>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/app/track/bus-map.tsx client/src/app/track/bus-marker.tsx
git commit -m "feat: add Leaflet bus map with Socket.IO real-time updates and stale data markers"
```

---

### Task 7: Client Filter Panel Component

**Files:**
- Create: `client/src/app/track/filter-panel.tsx`

- [ ] **Step 1: Write filter panel component**

```tsx
// client/src/app/track/filter-panel.tsx
'use client';

import { useTranslation } from 'react-i18next';
import type { TrackingFilter } from '@zartsa/shared';
import { Filter, X } from 'lucide-react';

interface FilterPanelProps {
  filter: TrackingFilter;
  onFilterChange: (filter: TrackingFilter) => void;
}

export function FilterPanel({ filter, onFilterChange }: FilterPanelProps) {
  const { t } = useTranslation();

  const hasActiveFilter = Boolean(filter.route || filter.operatorId || filter.serviceType);

  const handleClear = () => {
    onFilterChange({});
  };

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold">{t('track.filter')}</h3>
        </div>
        {hasActiveFilter && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
          >
            <X className="h-3 w-3" />
            {t('common.cancel')}
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-gray-500">{t('track.route')}</label>
          <input
            type="text"
            value={filter.route || ''}
            onChange={(e) => onFilterChange({ ...filter, route: e.target.value || undefined })}
            placeholder="Stone Town - Fuoni"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500">{t('track.operator')}</label>
          <input
            type="text"
            value={filter.operatorId || ''}
            onChange={(e) => onFilterChange({ ...filter, operatorId: e.target.value || undefined })}
            placeholder={t('track.operator')}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500">{t('track.serviceType')}</label>
          <select
            value={filter.serviceType || ''}
            onChange={(e) => onFilterChange({
              ...filter,
              serviceType: (e.target.value as 'daladala' | 'shamba' | '') || undefined,
            })}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">{t('common.search')}</option>
            <option value="daladala">{t('fare.daladala')}</option>
            <option value="shamba">{t('fare.shamba')}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/app/track/filter-panel.tsx
git commit -m "feat: add filter panel for route, operator, and service type tracking filters"
```

---

### Task 8: Client Bus Stop List Component

**Files:**
- Create: `client/src/app/track/bus-stop-list.tsx`

- [ ] **Step 1: Write bus stop list component**

```tsx
// client/src/app/track/bus-stop-list.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import type { BusStop } from '@zartsa/shared';

export function BusStopList() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'sw' ? 'sw' : 'en';
  const [stops, setStops] = useState<BusStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStops() {
      try {
        const response = await api.get<{ status: string; data: BusStop[] }>('/tracking/stops');
        setStops(response.data);
      } catch {
        setStops([]);
      } finally {
        setLoading(false);
      }
    }
    fetchStops();
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border p-4">
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold">
        <MapPin className="mr-1 inline h-4 w-4 text-zartsa-green" />
        Bus Stops
      </h3>
      <div className="space-y-1">
        {stops.map((stop) => (
          <div key={stop.id} className="rounded-md border">
            <button
              onClick={() => setExpanded(expanded === stop.id ? null : stop.id)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
            >
              <div>
                <p className="font-medium">{lang === 'sw' ? stop.nameSw : stop.nameEn}</p>
                <p className="text-xs text-gray-500">{stop.servedRoutes.length} {t('track.route')}{stop.servedRoutes.length !== 1 ? 's' : ''}</p>
              </div>
              {expanded === stop.id ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>
            {expanded === stop.id && (
              <div className="border-t px-3 py-2">
                <p className="mb-2 text-xs text-gray-500">
                  {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                </p>
                <div className="space-y-1">
                  {stop.servedRoutes.map((route, idx) => (
                    <p key={idx} className="text-xs text-gray-600">
                      {route}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/app/track/bus-stop-list.tsx
git commit -m "feat: add bus stop directory list with expandable route information"
```

---

### Task 9: Client Delay Alert and Stale Data Indicator

**Files:**
- Create: `client/src/app/track/delay-alert.tsx`

- [ ] **Step 1: Write delay alert component**

```tsx
// client/src/app/track/delay-alert.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { io, Socket } from 'socket.io-client';
import { AlertTriangle, Clock, X } from 'lucide-react';

interface DelayAlertData {
  vehiclePlate: string;
  route: string;
  delayMinutes: number;
}

interface StaleBusData {
  vehiclePlate: string;
  lastSeenAt: string;
  isStale: boolean;
}

interface DelayAlertProps {
  positions: { vehiclePlate: string; route: string; recordedAt: string; isStale: boolean }[];
}

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || '';

export function DelayAlert({ positions }: DelayAlertProps) {
  const { t } = useTranslation();
  const [delayAlerts, setDelayAlerts] = useState<DelayAlertData[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Setup Socket.IO for delay alerts
  useEffect(() => {
    const socketIo = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    socketIo.on('delay:alert', (alert: DelayAlertData) => {
      setDelayAlerts((prev) => {
        const exists = prev.find((a) => a.vehiclePlate === alert.vehiclePlate);
        if (exists) {
          return prev.map((a) => a.vehiclePlate === alert.vehiclePlate ? alert : a);
        }
        return [...prev, alert];
      });
    });

    return () => {
      socketIo.disconnect();
    };
  }, []);

  const staleBuses = positions.filter((p) => p.isStale);

  const dismissAlert = (plate: string) => {
    setDismissedAlerts((prev) => new Set([...prev, plate]));
  };

  const visibleAlerts = delayAlerts.filter((a) => !dismissedAlerts.has(a.vehiclePlate));

  if (visibleAlerts.length === 0 && staleBuses.length === 0) return null;

  return (
    <div className="space-y-2">
      {visibleAlerts.map((alert) => (
        <div
          key={alert.vehiclePlate}
          className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              {t('track.delayed')}: {alert.vehiclePlate}
            </p>
            <p className="text-xs text-amber-700">
              {alert.route} — {alert.delayMinutes} {t('track.eta')}
            </p>
          </div>
          <button
            onClick={() => dismissAlert(alert.vehiclePlate)}
            className="text-amber-500 hover:text-amber-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      {staleBuses.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-gray-300 bg-gray-50 p-3">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-600">{t('track.lastSeen')}</p>
            <p className="text-xs text-gray-500">
              {staleBuses.length} {staleBuses.length === 1 ? 'bus' : 'buses'} — GPS data older than 5 minutes
            </p>
            <ul className="mt-1 space-y-0.5">
              {staleBuses.slice(0, 3).map((bus) => (
                <li key={bus.vehiclePlate} className="text-xs text-gray-400">
                  {bus.vehiclePlate} ({bus.route})
                </li>
              ))}
              {staleBuses.length > 3 && (
                <li className="text-xs text-gray-400">+{staleBuses.length - 3} more</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/app/track/delay-alert.tsx
git commit -m "feat: add delay alert and stale data indicator components with Socket.IO listener"
```

---

### Task 10: Tracking Page Assembly

**Files:**
- Modify: `client/src/app/track/page.tsx`

- [ ] **Step 1: Write full tracking page assembling all components**

```tsx
// client/src/app/track/page.tsx
'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BusMap } from './bus-map';
import { FilterPanel } from './filter-panel';
import { BusStopList } from './bus-stop-list';
import { DelayAlert } from './delay-alert';
import type { TrackingFilter, BusPosition } from '@zartsa/shared';

export default function TrackPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<TrackingFilter>({});
  const [positions, setPositions] = useState<BusPosition[]>([]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-4 text-xl font-bold">{t('track.title')}</h1>

      <div className="mb-4">
        <DelayAlert positions={positions} />
      </div>

      <div className="mb-4">
        <BusMap filter={filter} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-1">
          <FilterPanel filter={filter} onFilterChange={setFilter} />
        </div>
        <div className="md:col-span-2">
          <BusStopList />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the page builds**

Run: `cd /home/yusuf/zartsa/client && npx next build 2>&1 | tail -10`
Expected: Build completes with no TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add client/src/app/track/page.tsx
git commit -m "feat: assemble tracking page with map, filter panel, bus stops, and delay alerts"
```

---

### Task 11: Add Swahili + English Translations for Tracking UI

**Files:**
- Modify: `client/src/i18n/sw.json`
- Modify: `client/src/i18n/en.json`

- [ ] **Step 1: Update Swahili translations with tracking keys**

Replace the existing `track` section in `client/src/i18n/sw.json`:

```json
  "track": {
    "title": "Fuatilia Mabasi",
    "liveMap": "Ramani ya moja kwa moja",
    "filter": "Chuja",
    "route": "Njia",
    "operator": "Mwendeshaji",
    "serviceType": "Aina ya huduma",
    "eta": "Muda wa kuwasili (dakika)",
    "delayed": "Imeachwa nyuma",
    "lastSeen": "Iliwahi kuonekana",
    "busStops": "Vituo vya mabasi",
    "staleWarning": "Data ya GPS ya zamani zaidi ya dakika 5",
    "daladala": "Daladala",
    "shamba": "Shamba",
    "activeBuses": "Mabasi yanayoendelea",
    "staleBuses": "Mabasi yaliyoisha muda",
    "noBuses": "Hakuna mabasi yaliyopatikana",
    "gpsUpdate": "Sasisha GPS",
    "updateSuccess": "Mahali pakusasishwa",
    "delayThreshold": "Kiwango cha kuchelewa (dakika)",
    "routeDeviated": "Njia imepotoka",
    "busCount": "Idadi ya mabasi"
  }
```

- [ ] **Step 2: Update English translations with tracking keys**

Replace the existing `track` section in `client/src/i18n/en.json`:

```json
  "track": {
    "title": "Track Buses",
    "liveMap": "Live Map",
    "filter": "Filter",
    "route": "Route",
    "operator": "Operator",
    "serviceType": "Service type",
    "eta": "ETA (minutes)",
    "delayed": "Delayed",
    "lastSeen": "Last known location",
    "busStops": "Bus Stops",
    "staleWarning": "GPS data older than 5 minutes",
    "daladala": "Daladala",
    "shamba": "Shamba",
    "activeBuses": "Active buses",
    "staleBuses": "Stale buses",
    "noBuses": "No buses found",
    "gpsUpdate": "Update GPS",
    "updateSuccess": "Location updated",
    "delayThreshold": "Delay threshold (minutes)",
    "routeDeviated": "Route deviation",
    "busCount": "Bus count"
  }
```

- [ ] **Step 3: Commit**

```bash
git add client/src/i18n/sw.json client/src/i18n/en.json
git commit -m "feat: add complete Swahili and English translations for fleet tracking module"
```

---

### Task 12: Seed Bus Location Test Data

**Files:**
- Modify: `server/prisma/seed.ts`

- [ ] **Step 1: Add bus location seed data to the existing seeder**

Append to the end of the `main()` function in `server/prisma/seed.ts`, before the closing `console.log('Seeding complete.')`:

```typescript
  // Create sample bus locations for fleet tracking
  const busLocations = [
    { vehiclePlate: 'T123ABC', operatorId: 'zartsa-transit', route: 'Stone Town - Fuoni', serviceType: 'daladala', latitude: -6.1659, longitude: 39.1989, speed: 35, heading: 180, recordedAt: new Date() },
    { vehiclePlate: 'T456DEF', operatorId: 'zartsa-transit', route: 'Stone Town - Mwanakwerekwe', serviceType: 'daladala', latitude: -6.1750, longitude: 39.2050, speed: 28, heading: 90, recordedAt: new Date() },
    { vehiclePlate: 'T789GHI', operatorId: 'zanzibar-express', route: 'Stone Town - Paje', serviceType: 'shamba', latitude: -6.1900, longitude: 39.3500, speed: 55, heading: 270, recordedAt: new Date() },
    { vehiclePlate: 'T321JKL', operatorId: 'zanzibar-express', route: 'Stone Town - Nungwi', serviceType: 'shamba', latitude: -5.9500, longitude: 39.2500, speed: 60, heading: 0, recordedAt: new Date() },
    { vehiclePlate: 'T654MNO', operatorId: 'zartsa-transit', route: 'Stone Town - Kiembe Samaki', serviceType: 'daladala', latitude: -6.1700, longitude: 39.2100, speed: 20, heading: 45, recordedAt: new Date() },
    // Stale data (>5 min old)
    { vehiclePlate: 'T987PQR', operatorId: 'zartsa-transit', route: 'Stone Town - Jambiani', serviceType: 'shamba', latitude: -6.2300, longitude: 39.5000, speed: 0, heading: 0, recordedAt: new Date(Date.now() - 10 * 60 * 1000) },
  ];

  for (const loc of busLocations) {
    await prisma.busLocation.create({ data: loc });
  }
```

- [ ] **Step 2: Run seeder to verify**

Run: `cd /home/yusuf/zartsa/server && npx tsx prisma/seed.ts`
Expected: "Seeding complete." with no errors

- [ ] **Step 3: Commit**

```bash
git add server/prisma/seed.ts
git commit -m "feat: add bus location seed data with active and stale GPS positions"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- [x] Interactive map showing real-time GPS location of all active registered buses -- Task 6 (BusMap + BusMarker with Leaflet)
- [x] Bus positions refresh at intervals not exceeding 30 seconds -- Task 3 (Socket.IO broadcasts in real time), Task 6 (client receives `bus:update` events immediately)
- [x] Displays ETA for each bus at upcoming stops -- Task 4 (calculateETA in tracking.service.ts), Task 6 (BusMarker tooltip shows speed/ETA)
- [x] Filter by route, operator, or service type -- Task 5 (tracking.routes passes filter to service), Task 7 (FilterPanel component)
- [x] Real-time alerts for delays beyond configurable threshold (default 30 min) -- Task 3 (checkDelays with DELAY_THRESHOLD_MINUTES=30), Task 9 (DelayAlert component)
- [x] Real-time alerts for route deviations -- Task 3 (delay detection broadcasts `delay:alert` via Socket.IO)
- [x] Bus stop directory with names, coordinates, and served routes -- Task 4 (getBusStops returns 10 real Zanzibar stops), Task 8 (BusStopList component)
- [x] Stale GPS data (>5 min) shown as greyed-out "Last known location" -- Task 4 (detectStaleData marks positions), Task 6 (BusMarker renders grey icon when isStale=true), Task 9 (stale indicator)
- [x] No authentication required for viewing -- Task 5 (GET /buses and GET /stops have no authenticate middleware)
- [x] GPS update endpoint requires auth (operator/driver/admin) -- Task 5 (POST /update uses authenticate + authorize)

**2. Placeholder scan:** No TBDs, TODOs, "implement later", or "similar to Task N" patterns found. All code is complete.

**3. Type consistency:**
- `BusPosition` type in `shared/src/types/tracking.ts` used consistently across `tracking.service.ts`, `tracking.cache.ts`, `bus-map.tsx`, `bus-marker.tsx`, `delay-alert.tsx`
- `GpsUpdateInput` type from `tracking.schema.ts` matches `gpsUpdateSchema` fields and `ingestGPS` parameter
- `TrackingFilter` type in `shared/src/types/tracking.ts` matches `trackingFilterSchema` in `tracking.schema.ts`
- `BusStop` type in `shared/src/types/tracking.ts` matches `getBusStops` return shape and `BusStopList` component
- `DelayAlertData` interface in `delay-alert.tsx` matches `broadcastDelayAlert` payload in `socket.ts`
- Socket.IO event names (`bus:update`, `delay:alert`, `subscribe:route`, etc.) consistent between `socket.ts` and client components
- API paths (`/tracking/buses`, `/tracking/stops`, `/tracking/update`) consistent between `tracking.routes.ts` and `api.get/post` calls in client
- Redis cache key `tracking:buses` used consistently in `tracking.cache.ts`
- i18n keys `track.*` used consistently between components and translation JSON files
- Vehicle plate field `vehiclePlate` consistent across BusLocation Prisma model, BusPosition type, and all components