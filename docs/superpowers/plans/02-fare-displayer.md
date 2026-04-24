# ZARTSA Fare Displayer Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Smart Fare Displayer (FR-01) allowing citizens to search official ZARTSA-approved fare tables for Daladala (intra-city) and Shamba (inter-city) routes, showing base fare, surcharge, total cost, and effective date — no authentication required.

**Architecture:** Fare data is served from PostgreSQL (FareTable model) with Redis caching (24h TTL for fare lists, 5min for individual lookups). The server exposes two public endpoints: search and detail. The client renders a search page with route type toggle, departure/destination dropdowns, and a results table.

**Tech Stack:** Express 5, Prisma 7, Redis 7, Next.js 16, React 19, Tailwind 4, Zod, i18next

---

## File Structure

```
server/src/
├── services/
│   └── fare.service.ts           # Fare lookup, search, caching
├── routes/
│   └── fares.routes.ts           # GET /api/fares/*
shared/src/
├── types/
│   └── fare.ts                   # Fare type definitions
├── schemas/
│   └── fare.schema.ts            # Zod search schema
└── constants/
    └── fare-routes.ts            # Known routes/departures
client/src/
├── app/
│   └── fares/
│       └── page.tsx              # Fare search + results page
└── i18n/
    ├── sw.json                   # (modify) Add fare translations
    └── en.json                   # (modify) Add fare translations
```

---

### Task 1: Fare Types, Constants, and Zod Schemas

**Files:**
- Create: `shared/src/types/fare.ts`
- Create: `shared/src/schemas/fare.schema.ts`
- Create: `shared/src/constants/fare-routes.ts`
- Modify: `shared/src/index.ts`

- [ ] **Step 1: Write fare types**

```typescript
// shared/src/types/fare.ts
export type RouteType = 'daladala' | 'shamba';

export interface FareEntry {
  id: string;
  routeType: RouteType;
  departure: string;
  destination: string;
  baseFare: number;
  surcharge: number;
  currency: string;
  effectiveDate: string;
}

export interface FareSearchResult {
  departure: string;
  destination: string;
  baseFare: number;
  surcharge: number;
  totalFare: number;
  currency: string;
  effectiveDate: string;
}
```

- [ ] **Step 2: Write fare Zod schemas**

```typescript
// shared/src/schemas/fare.schema.ts
import { z } from 'zod';

export const fareSearchSchema = z.object({
  routeType: z.enum(['daladala', 'shamba']),
  departure: z.string().min(1, 'Departure is required'),
  destination: z.string().min(1, 'Destination is required'),
});

export type FareSearchInput = z.infer<typeof fareSearchSchema>;
```

- [ ] **Step 3: Write fare route constants**

```typescript
// shared/src/constants/fare-routes.ts
export const DALADALA_DEPARTURES = [
  'Stone Town',
  'Malindi',
  'Darajani',
  'Kariakoo',
  'Amaan',
] as const;

export const SHAMBA_DEPARTURES = [
  'Stone Town',
  'Malindi',
] as const;

export const DALADALA_DESTINATIONS: Record<string, string[]> = {
  'Stone Town': ['Fuoni', 'Mwanakwerekwe', 'Kiembe Samaki', 'Mikunguni', 'Chukwani'],
  'Malindi': ['Fuoni', 'Mwanakwerekwe', 'Stone Town'],
  'Darajani': ['Kiembe Samaki', 'Stone Town', 'Mikunguni'],
  'Kariakoo': ['Mwanakwerekwe', 'Fuoni'],
  'Amaan': ['Stone Town', 'Mwanakwerekwe'],
};

export const SHAMBA_DESTINATIONS: Record<string, string[]> = {
  'Stone Town': ['Paje', 'Jambiani', 'Nungwi', 'Kendwa', 'Matemwe', 'Michamvi', 'Uroa', 'Dongwe', 'Bwejuu'],
  'Malindi': ['Paje', 'Nungwi', 'Jambiani'],
};
```

- [ ] **Step 4: Update shared barrel export**

Add to `shared/src/index.ts`:

```typescript
export * from './types/fare';
export * from './schemas/fare.schema';
export * from './constants/fare-routes';
```

- [ ] **Step 5: Commit**

```bash
git add shared/
git commit -m "feat(fares): add fare types, search schema, and route constants"
```

---

### Task 2: Fare Service (Server)

**Files:**
- Create: `server/src/services/fare.service.ts`

- [ ] **Step 1: Write fare service with Redis caching**

```typescript
// server/src/services/fare.service.ts
import { PrismaClient } from '@prisma/client';
import { cacheGet, cacheSet } from './redis.service';
import { logger } from '../utils/logger';
import type { RouteType, FareSearchResult } from '@zartsa/shared';

const prisma = new PrismaClient();
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
    where: routeType ? { routeType } : undefined,
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
```

- [ ] **Step 2: Commit**

```bash
git add server/src/services/fare.service.ts
git commit -m "feat(fares): add fare service with search, detail lookup, and Redis caching"
```

---

### Task 3: Fare Routes (Server)

**Files:**
- Create: `server/src/routes/fares.routes.ts`
- Modify: `server/src/routes/index.ts` — wire fare routes

- [ ] **Step 1: Write fare routes (public, no auth, rate limited)**

```typescript
// server/src/routes/fares.routes.ts
import { Router } from 'express';
import { rateLimit } from '../middleware/rateLimit';
import { searchFares, getAllFares, getFareDetail } from '../services/fare.service';
import type { RouteType } from '@zartsa/shared';

export const faresRoutes = Router();

// All fare endpoints are public but rate-limited
faresRoutes.use(rateLimit('fares', 50, 3600000));

// Search fares by route type, departure, destination
faresRoutes.get('/search', async (req, res, next) => {
  try {
    const routeType = req.query.routeType as RouteType;
    const departure = req.query.departure as string;
    const destination = req.query.destination as string;

    if (!routeType || !departure || !destination) {
      return res.json({ status: 'ok', data: [] });
    }

    if (!['daladala', 'shamba'].includes(routeType)) {
      return res.status(400).json({ status: 'error', code: 'VALIDATION_ERROR', message: 'Invalid route type' });
    }

    const results = await searchFares(routeType, departure, destination);
    res.json({ status: 'ok', data: results });
  } catch (err) { next(err); }
});

// Get all fares (optionally filtered by route type)
faresRoutes.get('/', async (req, res, next) => {
  try {
    const routeType = req.query.routeType as RouteType | undefined;
    const results = await getAllFares(routeType);
    res.json({ status: 'ok', data: results });
  } catch (err) { next(err); }
});

// Get fare detail for a specific route
faresRoutes.get('/:routeType/:departure/:destination', async (req, res, next) => {
  try {
    const { routeType, departure, destination } = req.params;
    const result = await getFareDetail(routeType as RouteType, decodeURIComponent(departure), decodeURIComponent(destination));
    if (!result) {
      return res.status(404).json({ status: 'error', code: 'NOT_FOUND', message: 'Fare not found for this route' });
    }
    res.json({ status: 'ok', data: result });
  } catch (err) { next(err); }
});
```

- [ ] **Step 2: Wire fare routes into main router**

Add to `server/src/routes/index.ts`:

```typescript
import { faresRoutes } from './fares.routes';

// Add to router:
router.use('/fares', faresRoutes);
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/fares.routes.ts server/src/routes/index.ts
git commit -m "feat(fares): add public fare search and detail routes with rate limiting"
```

---

### Task 4: Client Fare Search Page

**Files:**
- Modify: `client/src/app/fares/page.tsx` — replace placeholder with full implementation

- [ ] **Step 1: Write the fare search page**

```tsx
// client/src/app/fares/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { formatTZS, formatDate } from '@/lib/utils';
import { DALADALA_DEPARTURES, SHAMBA_DEPARTURES, DALADALA_DESTINATIONS, SHAMBA_DESTINATIONS } from '@zartsa/shared';
import type { RouteType, FareSearchResult } from '@zartsa/shared';
import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';

export default function FaresPage() {
  const { t, i18n } = useTranslation();
  const [routeType, setRouteType] = useState<RouteType>('daladala');
  const [departure, setDeparture] = useState('');
  const [destination, setDestination] = useState('');
  const [results, setResults] = useState<FareSearchResult[]>([]);
  const [allFares, setAllFares] = useState<FareSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const departures = routeType === 'daladala' ? DALADALA_DEPARTURES : SHAMBA_DEPARTURES;
  const destinationsMap = routeType === 'daladala' ? DALADALA_DESTINATIONS : SHAMBA_DESTINATIONS;
  const destinations = departure ? (destinationsMap[departure] ?? []) : [];

  useEffect(() => {
    api.get<{ data: FareSearchResult[] }>(`/fares?routeType=${routeType}`)
      .then((res) => setAllFares(res.data))
      .catch(() => setAllFares([]));
  }, [routeType]);

  const handleSearch = async () => {
    if (!departure || !destination) return;
    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await api.get<{ data: FareSearchResult[] }>(
        `/fares/search?routeType=${routeType}&departure=${encodeURIComponent(departure)}&destination=${encodeURIComponent(destination)}`
      );
      setResults(res.data);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const formatAmount = (amount: number) => formatTZS(amount);
  const lang = i18n.language as 'sw' | 'en';

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/" className="rounded-md p-1 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">{t('fare.title')}</h1>
      </div>

      {/* Route Type Toggle */}
      <div className="mb-4 flex rounded-lg border overflow-hidden">
        <button
          onClick={() => { setRouteType('daladala'); setDeparture(''); setDestination(''); setHasSearched(false); }}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${routeType === 'daladala' ? 'bg-zartsa-green text-white' : 'bg-white text-gray-700'}`}
        >
          {t('fare.daladala')}
        </button>
        <button
          onClick={() => { setRouteType('shamba'); setDeparture(''); setDestination(''); setHasSearched(false); }}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${routeType === 'shamba' ? 'bg-zartsa-green text-white' : 'bg-white text-gray-700'}`}
        >
          {t('fare.shamba')}
        </button>
      </div>

      {/* Search Form */}
      <div className="mb-6 space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">{t('fare.from')}</label>
          <select value={departure} onChange={(e) => { setDeparture(e.target.value); setDestination(''); }}
            className="w-full rounded-md border px-3 py-2 text-sm">
            <option value="">{t('fare.from')}</option>
            {departures.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('fare.to')}</label>
          <select value={destination} onChange={(e) => setDestination(e.target.value)} disabled={!departure}
            className="w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50">
            <option value="">{t('fare.to')}</option>
            {destinations.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <button onClick={handleSearch} disabled={isSearching || !departure || !destination}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-zartsa-green px-4 py-2 text-sm text-white disabled:opacity-50">
          <Search className="h-4 w-4" />
          {t('fare.search')}
        </button>
      </div>

      {/* Search Results */}
      {hasSearched && (
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-semibold">{t('fare.searchResults')}</h2>
          {isSearching ? (
            <p className="text-sm text-gray-500">{t('common.loading')}</p>
          ) : results.length === 0 ? (
            <p className="text-sm text-gray-500">{t('common.noResults')}</p>
          ) : (
            <div className="space-y-2">
              {results.map((f, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <p className="font-medium">{f.departure} → {f.destination}</p>
                  <div className="mt-1 space-y-0.5 text-sm text-gray-600">
                    <p>{t('fare.baseFare')}: {formatAmount(f.baseFare)}</p>
                    <p>{t('fare.surcharge')}: {formatAmount(f.surcharge)}</p>
                    <p className="font-semibold text-zartsa-green">{t('fare.total')}: {formatAmount(f.totalFare)}</p>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {t('fare.effectiveDate')}: {formatDate(f.effectiveDate, lang)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Fares Table */}
      <div>
        <h2 className="mb-2 text-sm font-semibold">{routeType === 'daladala' ? t('fare.daladala') : t('fare.shamba')} — {t('fare.allFares')}</h2>
        {allFares.length === 0 ? (
          <p className="text-sm text-gray-500">{t('common.loading')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500">
                  <th className="pb-1 pr-2">{t('fare.from')}</th>
                  <th className="pb-1 pr-2">{t('fare.to')}</th>
                  <th className="pb-1 pr-2 text-right">{t('fare.total')}</th>
                </tr>
              </thead>
              <tbody>
                {allFares.map((f, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-1.5 pr-2">{f.departure}</td>
                    <td className="py-1.5 pr-2">{f.destination}</td>
                    <td className="py-1.5 pr-2 text-right font-medium">{formatAmount(f.totalFare)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add fare i18n translations**

Add to `client/src/i18n/sw.json` (merge into existing):

```json
"fare": {
  "title": "Nauli Rasmi",
  "from": "Kutoka",
  "to": "Kwenda",
  "search": "Tafuta nauli",
  "searchResults": "Matokeo ya utafutaji",
  "baseFare": "Nauli ya msingi",
  "surcharge": "Ada ya nyongeza",
  "total": "Jumla",
  "effectiveDate": "Tarehe ya matumizi",
  "routeType": "Aina ya njia",
  "daladala": "Daladala",
  "shamba": "Shamba",
  "allFares": "Nauli zote"
}
```

Add to `client/src/i18n/en.json` (merge into existing):

```json
"fare": {
  "title": "Official Fares",
  "from": "From",
  "to": "To",
  "search": "Search fares",
  "searchResults": "Search results",
  "baseFare": "Base fare",
  "surcharge": "Surcharge",
  "total": "Total",
  "effectiveDate": "Effective date",
  "routeType": "Route type",
  "daladala": "Daladala",
  "shamba": "Shamba",
  "allFares": "All fares"
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/app/fares/page.tsx client/src/i18n/
git commit -m "feat(fares): add fare search page with route type toggle, search, and all-fares table"
```

---

### Task 5: Seed Additional Fare Data and Verify

**Files:**
- Modify: `server/prisma/seed.ts` — add more fare entries

- [ ] **Step 1: Add more fare data to seeder**

Add more entries to the `fares` array in `server/prisma/seed.ts`:

```typescript
const fares = [
  // Existing entries...
  { routeType: 'daladala', departure: 'Stone Town', destination: 'Fuoni', baseFare: 400, surcharge: 0, effectiveDate: new Date('2026-01-01') },
  { routeType: 'daladala', departure: 'Stone Town', destination: 'Mwanakwerekwe', baseFare: 500, surcharge: 0, effectiveDate: new Date('2026-01-01') },
  { routeType: 'daladala', departure: 'Stone Town', destination: 'Kiembe Samaki', baseFare: 400, surcharge: 0, effectiveDate: new Date('2026-01-01') },
  { routeType: 'daladala', departure: 'Stone Town', destination: 'Mikunguni', baseFare: 400, surcharge: 0, effectiveDate: new Date('2026-01-01') },
  { routeType: 'daladala', departure: 'Stone Town', destination: 'Chukwani', baseFare: 500, surcharge: 0, effectiveDate: new Date('2026-01-01') },
  { routeType: 'daladala', departure: 'Malindi', departure: 'Malindi', destination: 'Fuoni', baseFare: 300, surcharge: 0, effectiveDate: new Date('2026-01-01') },
  { routeType: 'daladala', departure: 'Malindi', destination: 'Stone Town', baseFare: 300, surcharge: 0, effectiveDate: new Date('2026-01-01') },
  { routeType: 'daladala', departure: 'Malindi', destination: 'Mwanakwerekwe', baseFare: 400, surcharge: 0, effectiveDate: new Date('2026-01-01') },
  { routeType: 'shamba', departure: 'Stone Town', destination: 'Paje', baseFare: 2500, surcharge: 200, effectiveDate: new Date('2026-01-01') },
  { routeType: 'shamba', departure: 'Stone Town', destination: 'Jambiani', baseFare: 3000, surcharge: 200, effectiveDate: new Date('2026-01-01') },
  { routeType: 'shamba', departure: 'Stone Town', destination: 'Nungwi', baseFare: 3500, surcharge: 300, effectiveDate: new Date('2026-01-01') },
  { routeType: 'shamba', departure: 'Stone Town', destination: 'Kendwa', baseFare: 3500, surcharge: 300, effectiveDate: new Date('2026-01-01') },
  { routeType: 'shamba', departure: 'Stone Town', destination: 'Matemwe', baseFare: 3000, surcharge: 200, effectiveDate: new Date('2026-01-01') },
  { routeType: 'shamba', departure: 'Stone Town', destination: 'Michamvi', baseFare: 2500, surcharge: 200, effectiveDate: new Date('2026-01-01') },
  { routeType: 'shamba', departure: 'Stone Town', destination: 'Uroa', baseFare: 2500, surcharge: 200, effectiveDate: new Date('2026-01-01') },
  { routeType: 'shamba', departure: 'Stone Town', destination: 'Dongwe', baseFare: 3000, surcharge: 200, effectiveDate: new Date('2026-01-01') },
  { routeType: 'shamba', departure: 'Stone Town', destination: 'Bwejuu', baseFare: 3000, surcharge: 200, effectiveDate: new Date('2026-01-01') },
  { routeType: 'shamba', departure: 'Malindi', destination: 'Paje', baseFare: 2500, surcharge: 200, effectiveDate: new Date('2026-01-01') },
  { routeType: 'shamba', departure: 'Malindi', destination: 'Nungwi', baseFare: 3500, surcharge: 300, effectiveDate: new Date('2026-01-01') },
];
```

- [ ] **Step 2: Re-run seeder**

Run: `cd /home/yusuf/zartsa/server && npx tsx prisma/seed.ts`
Expected: "Seeding complete."

- [ ] **Step 3: Verify fare search endpoint**

Run: `curl -s "http://localhost:5000/api/fares/search?routeType=shamba&departure=Stone%20Town&destination=Nungwi" | head`
Expected: JSON response with fare data

- [ ] **Step 4: Commit**

```bash
git add server/prisma/seed.ts
git commit -m "feat(fares): add comprehensive fare seed data for all Zanzibar routes"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- [x] Displays official ZARTSA-approved fare tables — Task 2, 3
- [x] Shamba (inter-city) and Daladala (intra-city) routes — Task 1, 4
- [x] Search by departure/destination — Task 4
- [x] Shows base fare, surcharge, total cost — Task 4
- [x] Effective date displayed — Task 4
- [x] No authentication required — Task 3 (no auth middleware)
- [x] Rate limited 50 req/hour/IP — Task 3
- [x] Redis caching for performance — Task 2

**2. Placeholder scan:** No TBD, TODO, or "implement later" patterns found.

**3. Type consistency:**
- `RouteType = 'daladala' | 'shamba'` matches Prisma FareTable.routeType values
- `FareSearchResult` used consistently between server service and client page
- `formatTZS()` utility from foundation used for currency display
- API response shape `{ status: 'ok', data: ... }` consistent with foundation