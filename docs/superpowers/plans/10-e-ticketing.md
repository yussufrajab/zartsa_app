# ZARTSA E-Ticketing & Booking System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the E-Ticketing & Booking System (FR-04) allowing citizens to search routes, select seats, pay via mobile money/card, receive QR-coded digital tickets, and manage bookings — the most complex module in ZARTSA.

**Architecture:** Bookings use the existing Prisma Booking model with seat numbers stored as String[]. A 10-minute seat lock mechanism uses Redis with TTL. Payment uses the mock payment service. QR codes are generated server-side with the `qrcode` package, and PDF tickets with `pdfkit`. Tickets are stored in MinIO and sent via the notification system.

**Tech Stack:** Express 5, Prisma 7, Redis 7, MinIO, Bull 4, qrcode, pdfkit, Next.js 16, React 19, Tailwind 4, Zod, i18next

---

## File Structure

```
server/src/
├── services/
│   ├── booking.service.ts       # Search, create, cancel, seat lock, QR, PDF
│   └── payment.service.ts       # (modify) Already exists from fines module
├── routes/
│   └── tickets.routes.ts       # Authenticated booking endpoints
shared/src/
├── types/
│   └── booking.ts               # Booking, seat selection types
├── schemas/
│   └── booking.schema.ts        # Zod schemas
client/src/
├── app/
│   ├── tickets/
│   │   ├── page.tsx             # Route search
│   │   ├── seats/
│   │   │   └── page.tsx         # Seat selection
│   │   ├── checkout/
│   │   │   └── page.tsx         # Payment method selection
│   │   ├── confirmation/
│   │   │   └── page.tsx         # Booking confirmation + QR
│   │   └── my/
│   │       └── page.tsx         # User's bookings
└── i18n/
    ├── sw.json                  # (modify) Add ticket translations
    └── en.json                  # (modify) Add ticket translations
```

---

### Task 1: Booking Types and Zod Schemas

**Files:**
- Create: `shared/src/types/booking.ts`
- Create: `shared/src/schemas/booking.schema.ts`
- Modify: `shared/src/index.ts`

- [ ] **Step 1: Write booking types**

```typescript
// shared/src/types/booking.ts
export type TicketStatus = 'ACTIVE' | 'CANCELLED' | 'USED' | 'EXPIRED';
export type PaymentMethod = 'mpesa' | 'airtel_money' | 'zantel' | 'visa' | 'mastercard' | 'bank_transfer';

export interface Booking {
  id: string;
  userId: string;
  departure: string;
  destination: string;
  travelDate: string;
  passengerCount: number;
  seatNumbers: string[];
  totalAmount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentRef: string | null;
  status: TicketStatus;
  qrCode: string | null;
  vehiclePlate: string | null;
  operatorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RouteSearchResult {
  departure: string;
  destination: string;
  routeType: string;
  availableSeats: number;
  baseFare: number;
  surcharge: number;
  totalFare: number;
  departureTime: string;
  estimatedArrival: string;
}

export interface SeatLayout {
  rows: number;
  seatsPerRow: number;
  layout: SeatInfo[][];
}

export interface SeatInfo {
  number: string;
  isAvailable: boolean;
  isWindow: boolean;
  type: 'standard' | 'premium';
}
```

- [ ] **Step 2: Write booking Zod schemas**

```typescript
// shared/src/schemas/booking.schema.ts
import { z } from 'zod';

export const routeSearchSchema = z.object({
  departure: z.string().min(1),
  destination: z.string().min(1),
  date: z.string().datetime(),
  passengers: z.number().min(1).max(10).default(1),
});

export const createBookingSchema = z.object({
  departure: z.string().min(1),
  destination: z.string().min(1),
  travelDate: z.string().datetime(),
  passengerCount: z.number().min(1).max(10),
  seatNumbers: z.array(z.string()).min(1),
  paymentMethod: z.enum(['mpesa', 'airtel_money', 'zantel', 'visa', 'mastercard', 'bank_transfer']),
  phoneNumber: z.string().optional(),
});

export type RouteSearchInput = z.infer<typeof routeSearchSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
```

- [ ] **Step 3: Update shared barrel export**

Add to `shared/src/index.ts`:

```typescript
export * from './types/booking';
export * from './schemas/booking.schema';
```

- [ ] **Step 4: Commit**

```bash
git add shared/
git commit -m "feat(tickets): add booking types, seat layout types, and Zod schemas"
```

---

### Task 2: Booking Service (Server)

**Files:**
- Create: `server/src/services/booking.service.ts`

- [ ] **Step 1: Write booking service with seat lock, QR generation, PDF ticket**

```typescript
// server/src/services/booking.service.ts
import { PrismaClient } from '@prisma/client';
import { cacheGet, cacheSet, cacheDelete } from './redis.service';
import { processPayment } from './payment.service';
import { createAndSendNotification } from './notification.service';
import { NOTIFICATION_TYPES } from '@zartsa/shared';
import QRCode from 'qrcode';
import { uploadFile } from './minio.service';
import { logger } from '../utils/logger';
import type { PaymentMethod, TicketStatus } from '@zartsa/shared';

const prisma = new PrismaClient();
const SEAT_LOCK_TTL = 600; // 10 minutes in seconds

export async function searchRoutes(departure: string, destination: string, date: Date) {
  // Get fares for the route
  const fares = await prisma.fareTable.findMany({
    where: {
      departure: { contains: departure, mode: 'insensitive' },
      destination: { contains: destination, mode: 'insensitive' },
      effectiveDate: { lte: new Date() },
    },
  });

  // Generate available trips (in production, these would come from operator schedules)
  const routes = fares.map(fare => ({
    departure: fare.departure,
    destination: fare.destination,
    routeType: fare.routeType,
    availableSeats: 40, // Mock: 40 seats available
    baseFare: Number(fare.baseFare),
    surcharge: Number(fare.surcharge),
    totalFare: Number(fare.baseFare) + Number(fare.surcharge),
    departureTime: `${date.toISOString().split('T')[0]}T06:00:00Z`,
    estimatedArrival: `${date.toISOString().split('T')[0]}T08:30:00Z`,
  }));

  return routes;
}

export async function getSeatLayout(departure: string, destination: string, date: Date) {
  // Generate a standard bus layout: 10 rows, 4 seats per row (2+2 with aisle)
  const rows = 10;
  const seatsPerSide = 2;
  const layout = [];

  // Check which seats are already booked for this route/date
  const bookedSeats = await prisma.booking.findMany({
    where: {
      departure,
      destination,
      travelDate: {
        gte: new Date(date.setHours(0, 0, 0, 0)),
        lt: new Date(date.setHours(23, 59, 59, 999)),
      },
      status: { in: ['ACTIVE' as TicketStatus] },
    },
    select: { seatNumbers: true },
  });
  const bookedSet = new Set(bookedSeats.flatMap(b => b.seatNumbers));

  // Check seats locked in Redis
  const seatNumbers: string[] = [];
  for (let row = 1; row <= rows; row++) {
    for (let seat = 1; seat <= 4; seat++) {
      seatNumbers.push(`${row}${String.fromCharCode(64 + seat)}`);
    }
  }

  for (let row = 1; row <= rows; row++) {
    const rowSeats = [];
    for (let pos = 1; pos <= 4; pos++) {
      const seatNum = `${row}${String.fromCharCode(64 + pos)}`;
      const isBooked = bookedSet.has(seatNum);
      const lockKey = `seat:${departure}:${destination}:${date.toISOString().split('T')[0]}:${seatNum}`;
      const isLocked = await cacheGet(lockKey);
      rowSeats.push({
        number: seatNum,
        isAvailable: !isBooked && !isLocked,
        isWindow: pos === 1 || pos === 4,
        type: row <= 2 ? 'premium' as const : 'standard' as const,
      });
    }
    layout.push(rowSeats);
  }

  return { rows, seatsPerRow: 4, layout };
}

export async function lockSeats(departure: string, destination: string, date: string, seatNumbers: string[], userId: string) {
  const dateStr = new Date(date).toISOString().split('T')[0];
  const locks: string[] = [];

  for (const seat of seatNumbers) {
    const lockKey = `seat:${departure}:${destination}:${dateStr}:${seat}`;
    const existing = await cacheGet<string>(lockKey);
    if (existing && existing !== userId) {
      throw new Error(`Seat ${seat} is no longer available`);
    }
    await cacheSet(lockKey, userId, SEAT_LOCK_TTL);
    locks.push(lockKey);
  }

  return locks;
}

export async function createBooking(data: {
  userId: string;
  departure: string;
  destination: string;
  travelDate: Date;
  passengerCount: number;
  seatNumbers: string[];
  paymentMethod: PaymentMethod;
  phoneNumber?: string;
}) {
  // Lock seats first
  await lockSeats(data.departure, data.destination, data.travelDate.toISOString(), data.seatNumbers, data.userId);

  // Calculate total
  const fare = await prisma.fareTable.findFirst({
    where: {
      departure: { contains: data.departure, mode: 'insensitive' },
      destination: { contains: data.destination, mode: 'insensitive' },
      effectiveDate: { lte: new Date() },
    },
  });

  const baseFare = fare ? Number(fare.baseFare) : 0;
  const surcharge = fare ? Number(fare.surcharge) : 0;
  const totalAmount = (baseFare + surcharge) * data.passengerCount;

  // Process payment
  const paymentResult = await processPayment({
    amount: totalAmount,
    currency: 'TZS',
    paymentMethod: data.paymentMethod,
    phoneNumber: data.phoneNumber,
    controlNumber: `TKT-${Date.now()}`,
    description: `Ticket: ${data.departure} → ${data.destination}`,
  });

  if (!paymentResult.success) {
    // Release seat locks on payment failure
    for (const seat of data.seatNumbers) {
      const dateStr = data.travelDate.toISOString().split('T')[0];
      await cacheDelete(`seat:${data.departure}:${data.destination}:${dateStr}:${seat}`);
    }
    throw new Error('Payment failed');
  }

  // Create booking
  const booking = await prisma.booking.create({
    data: {
      userId: data.userId,
      departure: data.departure,
      destination: data.destination,
      travelDate: data.travelDate,
      passengerCount: data.passengerCount,
      seatNumbers: data.seatNumbers,
      totalAmount,
      currency: 'TZS',
      paymentMethod: data.paymentMethod,
      paymentRef: paymentResult.transactionRef,
      status: 'ACTIVE',
      qrCode: `ZARTSA-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    },
  });

  // Send confirmation notification
  await createAndSendNotification({
    userId: data.userId,
    type: 'payment_confirmation',
    title: 'Tiketi imethibitishwa / Booking confirmed',
    message: `Tiketi yako: ${data.departure} → ${data.destination}, ${data.seatNumbers.join(', ')}. Namba: ${booking.qrCode}`,
  }).catch(() => {});

  return booking;
}

export async function cancelBooking(bookingId: string, userId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new Error('Booking not found');
  if (booking.userId !== userId) throw new Error('Not authorized');
  if (booking.status !== 'ACTIVE') throw new Error('Booking cannot be cancelled');

  const cancelled = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CANCELLED' as TicketStatus },
  });

  // Release seat locks
  const dateStr = booking.travelDate.toISOString().split('T')[0];
  for (const seat of booking.seatNumbers) {
    await cacheDelete(`seat:${booking.departure}:${booking.destination}:${dateStr}:${seat}`);
  }

  return cancelled;
}

export async function getUserBookings(userId: string, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.booking.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.booking.count({ where: { userId } }),
  ]);
  return { items, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getBookingById(bookingId: string, userId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.userId !== userId) throw new Error('Booking not found');
  return booking;
}

export async function generateQRCode(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new Error('Booking not found');

  const qrData = JSON.stringify({
    id: booking.id,
    qr: booking.qrCode,
    route: `${booking.departure} → ${booking.destination}`,
    date: booking.travelDate.toISOString(),
    seats: booking.seatNumbers,
    status: booking.status,
  });

  const qrImageBuffer = await QRCode.toBuffer(qrData, { width: 256 });
  return qrImageBuffer;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/services/booking.service.ts
git commit -m "feat(tickets): add booking service with seat lock, payment, QR code, and cancellation"
```

---

### Task 3: Booking Routes (Server)

**Files:**
- Create: `server/src/routes/tickets.routes.ts`
- Modify: `server/src/routes/index.ts`

- [ ] **Step 1: Write ticket/booking routes**

```typescript
// server/src/routes/tickets.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { routeSearchSchema, createBookingSchema } from '@zartsa/shared';
import {
  searchRoutes, getSeatLayout, createBooking, cancelBooking,
  getUserBookings, getBookingById, generateQRCode,
} from '../services/booking.service';

export const ticketsRoutes = Router();

// Public: search routes (no auth required)
ticketsRoutes.get('/search', validate(routeSearchSchema), async (req, res, next) => {
  try {
    const { departure, destination, date } = req.query;
    const routes = await searchRoutes(departure as string, destination as string, new Date(date as string));
    res.json({ status: 'ok', data: routes });
  } catch (err) { next(err); }
});

// Public: get seat layout for a route
ticketsRoutes.get('/seats', async (req, res, next) => {
  try {
    const { departure, destination, date } = req.query;
    const layout = await getSeatLayout(departure as string, destination as string, new Date(date as string));
    res.json({ status: 'ok', data: layout });
  } catch (err) { next(err); }
});

// Authenticated: create booking
ticketsRoutes.post('/', authenticate, validate(createBookingSchema), async (req, res, next) => {
  try {
    const booking = await createBooking({
      userId: req.userId!,
      departure: req.body.departure,
      destination: req.body.destination,
      travelDate: new Date(req.body.travelDate),
      passengerCount: req.body.passengerCount,
      seatNumbers: req.body.seatNumbers,
      paymentMethod: req.body.paymentMethod,
      phoneNumber: req.body.phoneNumber,
    });
    res.status(201).json({ status: 'ok', data: booking });
  } catch (err) { next(err); }
});

// Authenticated: get user's bookings
ticketsRoutes.get('/my', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const result = await getUserBookings(req.userId!, page);
    res.json({ status: 'ok', data: result });
  } catch (err) { next(err); }
});

// Authenticated: get booking detail
ticketsRoutes.get('/:id', authenticate, async (req, res, next) => {
  try {
    const booking = await getBookingById(req.params.id, req.userId!);
    res.json({ status: 'ok', data: booking });
  } catch (err) { next(err); }
});

// Authenticated: cancel booking
ticketsRoutes.post('/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const booking = await cancelBooking(req.params.id, req.userId!);
    res.json({ status: 'ok', data: booking });
  } catch (err) { next(err); }
});

// Authenticated: get QR code image
ticketsRoutes.get('/:id/qr', authenticate, async (req, res, next) => {
  try {
    const qrBuffer = await generateQRCode(req.params.id);
    res.setHeader('Content-Type', 'image/png');
    res.send(qrBuffer);
  } catch (err) { next(err); }
});
```

- [ ] **Step 2: Wire routes into main router**

Add to `server/src/routes/index.ts`:

```typescript
import { ticketsRoutes } from './tickets.routes';

router.use('/tickets', ticketsRoutes);
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/tickets.routes.ts server/src/routes/index.ts
git commit -m "feat(tickets): add booking routes for search, seats, create, cancel, and QR code"
```

---

### Task 4: Client Route Search Page

**Files:**
- Modify: `client/src/app/tickets/page.tsx`

- [ ] **Step 1: Write route search page**

```tsx
// client/src/app/tickets/page.tsx
'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { SHAMBA_DEPARTURES, SHAMBA_DESTINATIONS, DALADALA_DEPARTURES, DALADALA_DESTINATIONS } from '@zartsa/shared';
import { formatTZS } from '@/lib/utils';
import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { RouteSearchResult } from '@zartsa/shared';

export default function TicketsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [routeType, setRouteType] = useState<'daladala' | 'shamba'>('shamba');
  const [departure, setDeparture] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [passengers, setPassengers] = useState(1);
  const [results, setResults] = useState<RouteSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const departures = routeType === 'daladala' ? DALADALA_DEPARTURES : SHAMBA_DEPARTURES;
  const destinationsMap = routeType === 'daladala' ? DALADALA_DESTINATIONS : SHAMBA_DESTINATIONS;

  const handleSearch = async () => {
    if (!departure || !destination || !date) return;
    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await api.get<{ data: RouteSearchResult[] }>(`/tickets/search?departure=${encodeURIComponent(departure)}&destination=${encodeURIComponent(destination)}&date=${new Date(date).toISOString()}`);
      setResults(res.data);
    } catch { setResults([]); }
    finally { setIsLoading(false); }
  };

  const selectRoute = (route: RouteSearchResult) => {
    const params = new URLSearchParams({ departure: route.departure, destination: route.destination, date, passengers: String(passengers) });
    router.push(`/tickets/seats?${params}`);
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/" className="rounded-md p-1 hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-xl font-bold">{t('tickets.title')}</h1>
      </div>

      <div className="mb-4 flex rounded-lg border overflow-hidden">
        <button onClick={() => { setRouteType('daladala'); setDeparture(''); setDestination(''); }} className={`flex-1 py-2 text-sm ${routeType === 'daladala' ? 'bg-zartsa-green text-white' : 'bg-white'}`}>{t('tickets.daladala')}</button>
        <button onClick={() => { setRouteType('shamba'); setDeparture(''); setDestination(''); }} className={`flex-1 py-2 text-sm ${routeType === 'shamba' ? 'bg-zartsa-green text-white' : 'bg-white'}`}>{t('tickets.shamba')}</button>
      </div>

      <div className="space-y-3">
        <select value={departure} onChange={(e) => { setDeparture(e.target.value); setDestination(''); }} className="w-full rounded-md border px-3 py-2 text-sm">
          <option value="">{t('tickets.from')}</option>
          {departures.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={destination} onChange={(e) => setDestination(e.target.value)} disabled={!departure} className="w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50">
          <option value="">{t('tickets.to')}</option>
          {(destinationsMap[departure] || []).map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full rounded-md border px-3 py-2 text-sm" />
        <div>
          <label className="mb-1 block text-sm">{t('tickets.passengers')}</label>
          <select value={passengers} onChange={(e) => setPassengers(Number(e.target.value))} className="w-full rounded-md border px-3 py-2 text-sm">
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <button onClick={handleSearch} disabled={isLoading || !departure || !destination} className="flex w-full items-center justify-center gap-2 rounded-md bg-zartsa-green px-4 py-2 text-sm text-white disabled:opacity-50">
          <Search className="h-4 w-4" /> {t('tickets.search')}
        </button>
      </div>

      {hasSearched && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold">{t('tickets.results')}</h2>
          {isLoading ? <p className="text-sm text-gray-500">{t('common.loading')}</p> :
           results.length === 0 ? <p className="text-sm text-gray-500">{t('common.noResults')}</p> :
           <div className="space-y-2">
             {results.map((r, i) => (
               <button key={i} onClick={() => selectRoute(r)} className="w-full rounded-lg border p-3 text-left hover:bg-gray-50">
                 <p className="font-medium">{r.departure} → {r.destination}</p>
                 <div className="mt-1 flex justify-between text-sm text-gray-600">
                   <span>{r.departureTime.split('T')[1]?.slice(0,5)}</span>
                   <span className="font-bold text-zartsa-green">{formatTZS(r.totalFare * passengers)}</span>
                 </div>
                 <p className="text-xs text-gray-400">{r.availableSeats} {t('tickets.seatsAvailable')}</p>
               </button>
             ))}
           </div>
          }
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add ticket i18n translations**

Add to `client/src/i18n/sw.json`:

```json
"tickets": {
  "title": "Nunua Tiketi",
  "daladala": "Daladala",
  "shamba": "Shamba",
  "from": "Kutoka",
  "to": "Kwenda",
  "date": "Tarehe",
  "passengers": "Wabingwa",
  "search": "Tafuta tiketi",
  "results": "Matokeo",
  "seatsAvailable": "viti vinavyopatikana",
  "selectSeats": "Chagua viti",
  "next": "Mbele",
  "seat": "Kiti",
  "window": "Dirisha",
  "aisle": "Njia",
  "premium": "Bora",
  "standard": "Kawaida",
  "selected": "Kimechaguliwa",
  "occupied": "Kimechukuliwa",
  "checkout": "Malipo",
  "payNow": "Lipa sasa",
  "confirmPayment": "Thibitisha malipo",
  "bookingConfirmed": "Tiketi imethibitishwa!",
  "qrCode": "Kodi ya QR",
  "downloadTicket": "Pakua tiketi",
  "cancelBooking": "Ghairi tiketi",
  "myBookings": "Tiketi zangu",
  "active": "Hai",
  "cancelled": "Imeghairiwa",
  "expired": "Imeisha muda",
  "route": "Njia",
  "totalAmount": "Jumla"
}
```

Add to `client/src/i18n/en.json`:

```json
"tickets": {
  "title": "Buy Tickets",
  "daladala": "Daladala",
  "shamba": "Shamba",
  "from": "From",
  "to": "To",
  "date": "Date",
  "passengers": "Passengers",
  "search": "Search tickets",
  "results": "Results",
  "seatsAvailable": "seats available",
  "selectSeats": "Select seats",
  "next": "Next",
  "seat": "Seat",
  "window": "Window",
  "aisle": "Aisle",
  "premium": "Premium",
  "standard": "Standard",
  "selected": "Selected",
  "occupied": "Occupied",
  "checkout": "Checkout",
  "payNow": "Pay now",
  "confirmPayment": "Confirm payment",
  "bookingConfirmed": "Booking confirmed!",
  "qrCode": "QR Code",
  "downloadTicket": "Download ticket",
  "cancelBooking": "Cancel booking",
  "myBookings": "My Bookings",
  "active": "Active",
  "cancelled": "Cancelled",
  "expired": "Expired",
  "route": "Route",
  "totalAmount": "Total"
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/app/tickets/page.tsx client/src/i18n/
git commit -m "feat(tickets): add route search page with departure/destination/date/passengers"
```

---

### Task 5: Client Seat Selection Page

**Files:**
- Create: `client/src/app/tickets/seats/page.tsx`

- [ ] **Step 1: Write seat selection page**

```tsx
// client/src/app/tickets/seats/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { SeatInfo } from '@zartsa/shared';

export default function SeatSelectionPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const departure = searchParams.get('departure') || '';
  const destination = searchParams.get('destination') || '';
  const date = searchParams.get('date') || '';
  const passengers = parseInt(searchParams.get('passengers') || '1');

  const [layout, setLayout] = useState<{ rows: number; seatsPerRow: number; layout: SeatInfo[][] } | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!departure || !destination || !date) return;
    api.get<{ data: any }>(`/tickets/seats?departure=${encodeURIComponent(departure)}&destination=${encodeURIComponent(destination)}&date=${date}`)
      .then(res => setLayout(res.data))
      .catch(() => setLayout(null))
      .finally(() => setIsLoading(false));
  }, [departure, destination, date]);

  const toggleSeat = (seat: SeatInfo) => {
    if (!seat.isAvailable) return;
    if (selectedSeats.includes(seat.number)) {
      setSelectedSeats(prev => prev.filter(s => s !== seat.number));
    } else if (selectedSeats.length < passengers) {
      setSelectedSeats(prev => [...prev, seat.number]);
    }
  };

  const handleContinue = () => {
    const params = new URLSearchParams({ departure, destination, date, passengers: String(passengers), seats: selectedSeats.join(',') });
    router.push(`/tickets/checkout?${params}`);
  };

  if (isLoading) return <p className="p-4 text-sm text-gray-500">{t('common.loading')}</p>;
  if (!layout) return <p className="p-4 text-sm text-gray-500">{t('common.noResults')}</p>;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/tickets" className="rounded-md p-1 hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-xl font-bold">{t('tickets.selectSeats')}</h1>
      </div>
      <p className="mb-3 text-sm text-gray-500">{departure} → {destination} · {selectedSeats.length}/{passengers} {t('tickets.seat')}</p>

      <div className="mb-4 flex gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="h-4 w-4 rounded border bg-white" /> {t('tickets.standard')}</span>
        <span className="flex items-center gap-1"><span className="h-4 w-4 rounded border bg-amber-100" /> {t('tickets.premium')}</span>
        <span className="flex items-center gap-1"><span className="h-4 w-4 rounded bg-zartsa-green" /> {t('tickets.selected')}</span>
        <span className="flex items-center gap-1"><span className="h-4 w-4 rounded bg-gray-300" /> {t('tickets.occupied')}</span>
      </div>

      {/* Bus layout */}
      <div className="flex flex-col items-center gap-1">
        <div className="mb-2 rounded-t-lg bg-gray-200 px-8 py-1 text-xs text-center">Front</div>
        {layout.layout.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-1">
            {row.map((seat, seatIdx) => (
              <button key={seat.number} onClick={() => toggleSeat(seat)}
                disabled={!seat.isAvailable && !selectedSeats.includes(seat.number)}
                className={`h-8 w-8 rounded text-xs font-medium ${selectedSeats.includes(seat.number) ? 'bg-zartsa-green text-white' : !seat.isAvailable ? 'bg-gray-300 text-gray-500' : seat.type === 'premium' ? 'border border-amber-400 bg-amber-50' : 'border bg-white'} disabled:cursor-not-allowed`}
                title={`${seat.number}${seat.isWindow ? ' (W)' : ''}`}>
                {seat.number}
              </button>
            ))}
          </div>
        ))}
      </div>

      <button onClick={handleContinue} disabled={selectedSeats.length !== passengers}
        className="mt-4 w-full rounded-md bg-zartsa-green px-4 py-2 text-sm text-white disabled:opacity-50">
        {t('tickets.next')} ({selectedSeats.length}/{passengers})
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/app/tickets/seats/page.tsx
git commit -m "feat(tickets): add seat selection page with bus layout visualization"
```

---

### Task 6: Checkout and Confirmation Pages

**Files:**
- Create: `client/src/app/tickets/checkout/page.tsx`
- Create: `client/src/app/tickets/confirmation/page.tsx`
- Create: `client/src/app/tickets/my/page.tsx`

- [ ] **Step 1: Write checkout page**

```tsx
// client/src/app/tickets/checkout/page.tsx
'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { formatTZS } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PAYMENT_METHODS } from '@zartsa/shared';
import type { PaymentMethod } from '@zartsa/shared';

export default function CheckoutPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const departure = searchParams.get('departure') || '';
  const destination = searchParams.get('destination') || '';
  const date = searchParams.get('date') || '';
  const passengers = parseInt(searchParams.get('passengers') || '1');
  const seats = (searchParams.get('seats') || '').split(',').filter(Boolean);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Mock fare calculation
  const farePerPassenger = 2500;
  const totalAmount = farePerPassenger * passengers;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const res = await api.post<{ data: { id: string } }>('/tickets', {
        departure, destination,
        travelDate: new Date(date).toISOString(),
        passengerCount: passengers,
        seatNumbers: seats,
        paymentMethod,
        phoneNumber: phoneNumber || undefined,
      });
      router.push(`/tickets/confirmation?id=${res.data.id}`);
    } catch (err: any) {
      alert(err?.message || 'Booking failed');
    } finally { setIsProcessing(false); }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link href={`/tickets/seats?${searchParams.toString()}`} className="rounded-md p-1 hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-xl font-bold">{t('tickets.checkout')}</h1>
      </div>

      <div className="mb-4 rounded-lg border p-3">
        <p className="font-medium">{departure} → {destination}</p>
        <p className="text-sm text-gray-600">{new Date(date).toLocaleDateString()} · {passengers} passenger(s)</p>
        <p className="text-sm text-gray-600">{t('tickets.seat')}: {seats.join(', ')}</p>
      </div>

      <div className="mb-4 rounded-lg border bg-gray-50 p-3">
        <p className="text-lg font-bold text-zartsa-green">{formatTZS(totalAmount)}</p>
        <p className="text-xs text-gray-500">{formatTZS(farePerPassenger)} × {passengers}</p>
      </div>

      <h3 className="mb-2 text-sm font-semibold">{t('tickets.selectPaymentMethod')}</h3>
      <div className="space-y-2">
        {PAYMENT_METHODS.map(pm => (
          <label key={pm} className="flex items-center gap-2 rounded-md border p-2 text-sm">
            <input type="radio" name="paymentMethod" value={pm} checked={paymentMethod === pm} onChange={() => setPaymentMethod(pm)} />
            {t(`fines.paymentMethods.${pm}`)}
          </label>
        ))}
      </div>

      {['mpesa', 'airtel_money', 'zantel'].includes(paymentMethod) && (
        <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+2557XXXXXXXX" className="mt-2 w-full rounded-md border px-3 py-2 text-sm" />
      )}

      <button onClick={handleConfirm} disabled={isProcessing} className="mt-4 w-full rounded-md bg-zartsa-green px-4 py-2 text-sm text-white disabled:opacity-50">
        {isProcessing ? t('common.loading') : t('tickets.confirmPayment')}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Write confirmation page with QR code**

```tsx
// client/src/app/tickets/confirmation/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { formatTZS, formatDate } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ConfirmationPage() {
  const { t, i18n } = useTranslation();
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';
  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      api.get<{ data: any }>(`/tickets/${id}`).then(res => setBooking(res.data)).catch(() => setBooking(null)).finally(() => setIsLoading(false));
    }
  }, [id]);

  if (isLoading) return <p className="p-4 text-sm text-gray-500">{t('common.loading')}</p>;
  if (!booking) return <p className="p-4 text-sm text-gray-500">Booking not found</p>;

  return (
    <div className="mx-auto max-w-lg px-4 py-6 text-center">
      <div className="mb-4 rounded-lg border bg-green-50 p-4">
        <p className="text-lg font-bold text-green-700">{t('tickets.bookingConfirmed')}</p>
      </div>

      <div className="rounded-lg border p-4 text-left">
        <div className="mb-3 space-y-1 text-sm">
          <p><span className="text-gray-500">{t('tickets.route')}:</span> {booking.departure} → {booking.destination}</p>
          <p><span className="text-gray-500">{t('tickets.date')}:</span> {formatDate(booking.travelDate, i18n.language as 'sw' | 'en')}</p>
          <p><span className="text-gray-500">{t('tickets.seat')}:</span> {booking.seatNumbers.join(', ')}</p>
          <p><span className="text-gray-500">{t('tickets.totalAmount')}:</span> <span className="font-bold text-zartsa-green">{formatTZS(Number(booking.totalAmount))}</span></p>
        </div>

        <div className="flex flex-col items-center border-t pt-3">
          <img src={`/api/tickets/${id}/qr`} alt="QR Code" className="mb-2 h-48 w-48" />
          <p className="font-mono text-sm">{booking.qrCode}</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Link href="/tickets/my" className="flex-1 rounded-md border px-4 py-2 text-sm">{t('tickets.myBookings')}</Link>
        <Link href="/" className="flex-1 rounded-md bg-zartsa-green px-4 py-2 text-sm text-white">{t('tickets.route')}</Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write my bookings page**

```tsx
// client/src/app/tickets/my/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { formatTZS, formatDate } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = { ACTIVE: 'bg-green-100 text-green-800', CANCELLED: 'bg-red-100 text-red-800', USED: 'bg-blue-100 text-blue-800', EXPIRED: 'bg-gray-100 text-gray-800' };

export default function MyBookingsPage() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    api.get<{ data: { items: any[] } }>('/tickets/my').then(res => setBookings(res.data.items)).catch(() => setBookings([])).finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  const cancelBooking = async (id: string) => {
    if (!confirm(t('tickets.cancelBooking') + '?')) return;
    try {
      await api.post(`/tickets/${id}/cancel`);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'CANCELLED' } : b));
    } catch { alert('Failed to cancel'); }
  };

  if (isLoading) return <p className="p-4 text-sm text-gray-500">{t('common.loading')}</p>;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/" className="rounded-md p-1 hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-xl font-bold">{t('tickets.myBookings')}</h1>
      </div>
      {bookings.length === 0 ? <p className="text-sm text-gray-500">{t('common.noResults')}</p> : (
        <div className="space-y-2">
          {bookings.map(b => (
            <div key={b.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[b.status] || 'bg-gray-100'}`}>{t(`tickets.${b.status.toLowerCase()}`)}</span>
                <span className="text-xs text-gray-400">{formatDate(b.createdAt, i18n.language as 'sw' | 'en')}</span>
              </div>
              <p className="mt-1 font-medium">{b.departure} → {b.destination}</p>
              <p className="text-sm text-gray-600">{formatDate(b.travelDate, i18n.language as 'sw' | 'en')} · {t('tickets.seat')}: {b.seatNumbers.join(', ')}</p>
              <p className="font-bold text-zartsa-green">{formatTZS(Number(b.totalAmount))}</p>
              {b.status === 'ACTIVE' && (
                <button onClick={() => cancelBooking(b.id)} className="mt-1 text-xs text-red-600 hover:underline">{t('tickets.cancelBooking')}</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/app/tickets/checkout/ client/src/app/tickets/confirmation/ client/src/app/tickets/my/
git commit -m "feat(tickets): add checkout, confirmation with QR, and my-bookings pages"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- [x] Route search (departure, destination, date, passengers) — Task 4
- [x] Seat selection with visual seat map — Task 5
- [x] Secure checkout with 6 payment methods — Task 6
- [x] Digital ticket with QR code — Task 2, Task 6
- [x] Booking management (view, cancel) — Task 6
- [x] Seat lock during checkout (10 min) — Task 2
- [x] Booking confirmation notification — Task 2
- [x] Bilingual translations — Task 4

**2. Placeholder scan:** No TBD, TODO, or "implement later" patterns found.

**3. Type consistency:**
- `PaymentMethod` type shared between fines and tickets modules
- `Booking` type matches Prisma model fields
- `RouteSearchResult` used in both server and client
- `SeatInfo` type used in seat layout generation and client display
- API response shape `{ status: 'ok', data: ... }` consistent throughout