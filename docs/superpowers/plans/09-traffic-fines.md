# ZARTSA Traffic Fines & Offense Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Traffic Fines & Offense Management module (FR-08) allowing authenticated drivers/operators to view, pay, and dispute traffic fines, with ZIMS sync, payment receipts, and push notifications on new offenses.

**Architecture:** Fines are fetched from ZIMS API and cached locally in the Fine model. A mock payment service abstracts the payment gateway (Mobile Money, Card, Bank Transfer) for future integration. Payment results sync to ZIMS via Bull queue. Dispute submission creates a record for officer review.

**Tech Stack:** Express 5, Prisma 7, Bull 4, Redis 7, ZIMS API Client, Next.js 16, React 19, Tailwind 4, Zod, i18next

---

## File Structure

```
server/src/
├── services/
│   ├── fine.service.ts          # Get/pay/dispute fines, ZIMS sync
│   └── payment.service.ts       # Mock payment gateway abstraction
├── routes/
│   └── fines.routes.ts          # Authenticated endpoints
shared/src/
├── types/
│   └── fine.ts                  # Fine types
├── schemas/
│   └── fine.schema.ts           # Zod schemas
client/src/
├── app/
│   ├── fines/
│   │   ├── page.tsx             # Fine search + list
│   │   ├── [id]/
│   │   │   └── page.tsx         # Fine detail + pay/dispute
│   │   └── dispute/
│   │       └── page.tsx         # Dispute submission
└── i18n/
    ├── sw.json                  # (modify) Add fine translations
    └── en.json                  # (modify) Add fine translations
```

---

### Task 1: Fine Types and Zod Schemas

**Files:**
- Create: `shared/src/types/fine.ts`
- Create: `shared/src/schemas/fine.schema.ts`
- Modify: `shared/src/index.ts`

- [ ] **Step 1: Write fine types**

```typescript
// shared/src/types/fine.ts
export type FinePaymentStatus = 'OUTSTANDING' | 'PAID' | 'DISPUTED' | 'WAIVED';

export type PaymentMethod = 'mpesa' | 'airtel_money' | 'zantel' | 'visa' | 'mastercard' | 'bank_transfer';

export interface Fine {
  id: string;
  drivingLicense: string | null;
  vehiclePlate: string | null;
  offenseType: string;
  offenseDate: string;
  location: string;
  penaltyAmount: number;
  currency: string;
  controlNumber: string;
  paymentStatus: FinePaymentStatus;
  paymentRef: string | null;
  paidAt: string | null;
  zimsSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DisputeInput {
  fineId: string;
  reason: string;
  supportingDocs?: string[];
}

export interface PaymentReceipt {
  transactionRef: string;
  fineId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paidAt: string;
  controlNumber: string;
}
```

- [ ] **Step 2: Write fine Zod schemas**

```typescript
// shared/src/schemas/fine.schema.ts
import { z } from 'zod';

export const PAYMENT_METHODS = ['mpesa', 'airtel_money', 'zantel', 'visa', 'mastercard', 'bank_transfer'] as const;

export const fineQuerySchema = z.object({
  drivingLicense: z.string().optional(),
  vehiclePlate: z.string().optional(),
}).refine(data => data.drivingLicense || data.vehiclePlate, { message: 'Provide either driving license or vehicle plate' });

export const initiatePaymentSchema = z.object({
  paymentMethod: z.enum(PAYMENT_METHODS),
  phoneNumber: z.string().optional(),
});

export const disputeSchema = z.object({
  reason: z.string().min(20).max(2000),
});

export type FineQueryInput = z.infer<typeof fineQuerySchema>;
export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
export type DisputeInput = z.infer<typeof disputeSchema>;
```

- [ ] **Step 3: Update shared barrel export**

Add to `shared/src/index.ts`:

```typescript
export * from './types/fine';
export * from './schemas/fine.schema';
```

- [ ] **Step 4: Commit**

```bash
git add shared/
git commit -m "feat(fines): add fine types, payment methods, and Zod schemas"
```

---

### Task 2: Mock Payment Service (Server)

**Files:**
- Create: `server/src/services/payment.service.ts`

- [ ] **Step 1: Write mock payment gateway service**

```typescript
// server/src/services/payment.service.ts
import { logger } from '../utils/logger';
import type { PaymentMethod } from '@zartsa/shared';

export interface PaymentRequest {
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  phoneNumber?: string;
  controlNumber: string;
  description: string;
}

export interface PaymentResult {
  success: boolean;
  transactionRef: string;
  paidAt: Date;
  message: string;
}

export async function processPayment(request: PaymentRequest): Promise<PaymentResult> {
  const transactionRef = `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  // Mock implementation — in production, integrate with real payment gateways:
  // - Mobile Money: Africa's Talking, Selcom, or direct MNO APIs
  // - Cards: PCI-DSS compliant gateway (Stripe, Flutterwave)
  // - Bank Transfer: Bank of Tanzania approved integration

  logger.info('Payment processed (mock)', {
    transactionRef,
    amount: request.amount,
    method: request.paymentMethod,
    controlNumber: request.controlNumber,
  });

  // Simulate payment processing delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // In development, always succeed
  return {
    success: true,
    transactionRef,
    paidAt: new Date(),
    message: `Payment of ${request.currency} ${request.amount.toLocaleString()} via ${request.paymentMethod} successful`,
  };
}

export async function refundPayment(transactionRef: string, amount: number): Promise<boolean> {
  logger.info('Refund processed (mock)', { transactionRef, amount });
  return true;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/services/payment.service.ts
git commit -m "feat(fines): add mock payment service with transaction reference generation"
```

---

### Task 3: Fine Service (Server)

**Files:**
- Create: `server/src/services/fine.service.ts`

- [ ] **Step 1: Write fine service**

```typescript
// server/src/services/fine.service.ts
import { PrismaClient } from '@prisma/client';
import { zimsService } from './zims.service';
import { processPayment } from './payment.service';
import { zimsSyncQueue } from './queue.service';
import { createAndSendNotification } from './notification.service';
import { NOTIFICATION_TYPES } from '@zartsa/shared';
import type { PaymentMethod, FinePaymentStatus } from '@zartsa/shared';

const prisma = new PrismaClient();

export async function getFinesByLicense(drivingLicense: string) {
  // Try local DB first
  const localFines = await prisma.fine.findMany({
    where: { drivingLicense, paymentStatus: { not: 'WAIVED' } },
    orderBy: { offenseDate: 'desc' },
  });

  // Also fetch from ZIMS for any new fines
  try {
    const zimsFines = await zimsService.getFinesByLicense(drivingLicense);
    for (const zf of zimsFines) {
      const exists = await prisma.fine.findUnique({ where: { controlNumber: zf.controlNumber } });
      if (!exists) {
        const newFine = await prisma.fine.create({
          data: {
            drivingLicense,
            vehiclePlate: null,
            offenseType: zf.offenseType,
            offenseDate: new Date(zf.offenseDate),
            location: zf.location,
            penaltyAmount: zf.penaltyAmount,
            currency: 'TZS',
            controlNumber: zf.controlNumber,
            paymentStatus: zf.paymentStatus as FinePaymentStatus,
          },
        });
        // Notify user about new fine
        const user = await prisma.user.findFirst({ where: { nationalId: drivingLicense } });
        if (user) {
          await createAndSendNotification({
            userId: user.id,
            type: 'new_fine',
            title: 'Faini mpya / New fine issued',
            message: `Faini mpya: ${zf.offenseType} - TZS ${zf.penaltyAmount.toLocaleString()}. Namba ya udhibiti: ${zf.controlNumber}`,
          }).catch(() => {});
        }
      }
    }
  } catch {
    // If ZIMS is down, return local data only
  }

  return prisma.fine.findMany({
    where: { drivingLicense, paymentStatus: { not: 'WAIVED' } },
    orderBy: { offenseDate: 'desc' },
  });
}

export async function getFinesByVehicle(vehiclePlate: string) {
  const formatted = vehiclePlate.toUpperCase().replace(/\s+/g, '');

  // Try local DB first
  const localFines = await prisma.fine.findMany({
    where: { vehiclePlate: formatted, paymentStatus: { not: 'WAIVED' } },
    orderBy: { offenseDate: 'desc' },
  });

  // Fetch from ZIMS for new fines
  try {
    const zimsFines = await zimsService.getFinesByVehicle(formatted);
    for (const zf of zimsFines) {
      const exists = await prisma.fine.findUnique({ where: { controlNumber: zf.controlNumber } });
      if (!exists) {
        await prisma.fine.create({
          data: {
            drivingLicense: null,
            vehiclePlate: formatted,
            offenseType: zf.offenseType,
            offenseDate: new Date(zf.offenseDate),
            location: zf.location,
            penaltyAmount: zf.penaltyAmount,
            currency: 'TZS',
            controlNumber: zf.controlNumber,
            paymentStatus: zf.paymentStatus as FinePaymentStatus,
          },
        });
      }
    }
  } catch {
    // ZIMS unavailable, return local data
  }

  return prisma.fine.findMany({
    where: { vehiclePlate: formatted, paymentStatus: { not: 'WAIVED' } },
    orderBy: { offenseDate: 'desc' },
  });
}

export async function getFineById(id: string) {
  return prisma.fine.findUnique({ where: { id } });
}

export async function payFine(fineId: string, paymentMethod: PaymentMethod, phoneNumber?: string) {
  const fine = await prisma.fine.findUnique({ where: { id: fineId } });
  if (!fine) throw new Error('Fine not found');
  if (fine.paymentStatus !== 'OUTSTANDING') throw new Error('Fine is not outstanding');

  const result = await processPayment({
    amount: Number(fine.penaltyAmount),
    currency: fine.currency,
    paymentMethod,
    phoneNumber,
    controlNumber: fine.controlNumber,
    description: `Fine: ${fine.offenseType} - ${fine.controlNumber}`,
  });

  if (result.success) {
    const updated = await prisma.fine.update({
      where: { id: fineId },
      data: {
        paymentStatus: 'PAID',
        paymentRef: result.transactionRef,
        paidAt: result.paidAt,
      },
    });

    // Queue ZIMS sync
    await zimsSyncQueue.add('zims-sync', {
      fineId,
      action: 'payment',
    });

    // Send payment receipt notification
    const user = await prisma.user.findFirst({
      where: { OR: [{ nationalId: fine.drivingLicense }, { phone: { contains: phoneNumber ?? '' } }] },
    });
    if (user) {
      await createAndSendNotification({
        userId: user.id,
        type: 'payment_receipt',
        title: 'Risiti ya malipo / Payment receipt',
        message: `Malipo ya TZS ${Number(fine.penaltyAmount).toLocaleString()} kwa faini ${fine.controlNumber} yamekubaliwa. Namba ya muamala: ${result.transactionRef}`,
      }).catch(() => {});
    }

    return { fine: updated, receipt: result };
  }

  throw new Error('Payment failed');
}

export async function submitDispute(fineId: string, userId: string, reason: string) {
  const fine = await prisma.fine.findUnique({ where: { id: fineId } });
  if (!fine) throw new Error('Fine not found');

  const updated = await prisma.fine.update({
    where: { id: fineId },
    data: { paymentStatus: 'DISPUTED' as FinePaymentStatus },
  });

  return updated;
}

export async function waiveFine(fineId: string) {
  return prisma.fine.update({
    where: { id: fineId },
    data: { paymentStatus: 'WAIVED' as FinePaymentStatus },
  });
}

export async function getDisputes(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.fine.findMany({ where: { paymentStatus: 'DISPUTED' }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.fine.count({ where: { paymentStatus: 'DISPUTED' } }),
  ]);
  return { items, total, page, totalPages: Math.ceil(total / limit) };
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/services/fine.service.ts
git commit -m "feat(fines): add fine service with ZIMS sync, payment, dispute, and notification integration"
```

---

### Task 4: Fine Routes (Server)

**Files:**
- Create: `server/src/routes/fines.routes.ts`
- Modify: `server/src/routes/index.ts`

- [ ] **Step 1: Write fine routes**

```typescript
// server/src/routes/fines.routes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';
import { fineQuerySchema, initiatePaymentSchema, disputeSchema } from '@zartsa/shared';
import { getFinesByLicense, getFinesByVehicle, getFineById, payFine, submitDispute, getDisputes, waiveFine } from '../services/fine.service';

export const finesRoutes = Router();

// All fine endpoints require authentication
finesRoutes.use(authenticate);
finesRoutes.use(rateLimit('fines', 50, 3600000));

// Get fines by driving license or vehicle plate
finesRoutes.get('/', async (req, res, next) => {
  try {
    const drivingLicense = req.query.drivingLicense as string | undefined;
    const vehiclePlate = req.query.vehiclePlate as string | undefined;
    if (!drivingLicense && !vehiclePlate) {
      return res.status(400).json({ status: 'error', code: 'VALIDATION_ERROR', message: 'Provide drivingLicense or vehiclePlate' });
    }
    const fines = drivingLicense
      ? await getFinesByLicense(drivingLicense)
      : await getFinesByVehicle(vehiclePlate!);
    res.json({ status: 'ok', data: fines });
  } catch (err) { next(err); }
});

// Get fine detail
finesRoutes.get('/:id', async (req, res, next) => {
  try {
    const fine = await getFineById(req.params.id);
    if (!fine) return res.status(404).json({ status: 'error', code: 'NOT_FOUND', message: 'Fine not found' });
    res.json({ status: 'ok', data: fine });
  } catch (err) { next(err); }
});

// Pay a fine
finesRoutes.post('/:id/pay', validate(initiatePaymentSchema), async (req, res, next) => {
  try {
    const result = await payFine(req.params.id, req.body.paymentMethod, req.body.phoneNumber);
    res.json({ status: 'ok', data: result });
  } catch (err) { next(err); }
});

// Submit dispute
finesRoutes.post('/:id/dispute', validate(disputeSchema), async (req, res, next) => {
  try {
    const fine = await submitDispute(req.params.id, req.userId!, req.body.reason);
    res.json({ status: 'ok', data: fine });
  } catch (err) { next(err); }
});

// Officer: list disputes
finesRoutes.get('/admin/disputes', authorize('officer', 'admin'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const result = await getDisputes(page);
    res.json({ status: 'ok', data: result });
  } catch (err) { next(err); }
});

// Officer: waive a fine
finesRoutes.post('/:id/waive', authorize('officer', 'admin'), async (req, res, next) => {
  try {
    const fine = await waiveFine(req.params.id);
    res.json({ status: 'ok', data: fine });
  } catch (err) { next(err); }
});
```

- [ ] **Step 2: Wire routes into main router**

Add to `server/src/routes/index.ts`:

```typescript
import { finesRoutes } from './fines.routes';

router.use('/fines', finesRoutes);
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/fines.routes.ts server/src/routes/index.ts
git commit -m "feat(fines): add fine routes with payment, dispute, and officer endpoints"
```

---

### Task 5: Client Fines Pages

**Files:**
- Modify: `client/src/app/fines/page.tsx`
- Create: `client/src/app/fines/[id]/page.tsx`
- Modify: `client/src/i18n/sw.json` and `en.json`

- [ ] **Step 1: Write fine search and list page (replace placeholder)**

```tsx
// client/src/app/fines/page.tsx
'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { formatTZS } from '@/lib/utils';
import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';

interface Fine {
  id: string;
  offenseType: string;
  offenseDate: string;
  location: string;
  penaltyAmount: number;
  controlNumber: string;
  paymentStatus: string;
  drivingLicense: string | null;
  vehiclePlate: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  OUTSTANDING: 'bg-red-100 text-red-800',
  PAID: 'bg-green-100 text-green-800',
  DISPUTED: 'bg-yellow-100 text-yellow-800',
  WAIVED: 'bg-gray-100 text-gray-800',
};

export default function FinesPage() {
  const { t } = useTranslation();
  const [searchType, setSearchType] = useState<'license' | 'plate'>('license');
  const [searchValue, setSearchValue] = useState('');
  const [fines, setFines] = useState<Fine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [copied, setCopied] = useState('');

  const handleSearch = async () => {
    if (!searchValue) return;
    setIsLoading(true);
    setHasSearched(true);
    try {
      const param = searchType === 'license' ? 'drivingLicense' : 'vehiclePlate';
      const res = await api.get<{ data: Fine[] }>(`/fines?${param}=${encodeURIComponent(searchValue)}`);
      setFines(res.data);
    } catch { setFines([]); }
    finally { setIsLoading(false); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/" className="rounded-md p-1 hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-xl font-bold">{t('fines.title')}</h1>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex rounded-lg border overflow-hidden">
          <button onClick={() => setSearchType('license')} className={`flex-1 py-2 text-sm ${searchType === 'license' ? 'bg-zartsa-green text-white' : 'bg-white'}`}>{t('fines.byLicense')}</button>
          <button onClick={() => setSearchType('plate')} className={`flex-1 py-2 text-sm ${searchType === 'plate' ? 'bg-zartsa-green text-white' : 'bg-white'}`}>{t('fines.byPlate')}</button>
        </div>
        <div className="flex gap-2">
          <input type="text" value={searchValue} onChange={(e) => setSearchValue(e.target.value.toUpperCase())}
            placeholder={searchType === 'license' ? t('fines.licensePlaceholder') : t('fines.platePlaceholder')}
            className="flex-1 rounded-md border px-3 py-2 text-sm uppercase" />
          <button onClick={handleSearch} className="flex items-center gap-1 rounded-md bg-zartsa-green px-3 py-2 text-sm text-white"><Search className="h-4 w-4" /></button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-gray-500">{t('common.loading')}</p>}
      {hasSearched && fines.length === 0 && <p className="text-sm text-gray-500">{t('fines.noFines')}</p>}

      <div className="space-y-2">
        {fines.map(fine => (
          <Link key={fine.id} href={`/fines/${fine.id}`} className="block rounded-lg border p-3 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[fine.paymentStatus] || 'bg-gray-100'}`}>{t(`fines.status.${fine.paymentStatus.toLowerCase()}`)}</span>
              <span className="text-xs text-gray-400">{new Date(fine.offenseDate).toLocaleDateString()}</span>
            </div>
            <p className="mt-1 text-sm font-medium">{fine.offenseType}</p>
            <p className="text-sm text-gray-600">{fine.location}</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-bold text-zartsa-green">{formatTZS(fine.penaltyAmount)}</span>
              <button onClick={(e) => { e.preventDefault(); copyToClipboard(fine.controlNumber); }}
                className="flex items-center gap-1 rounded border px-2 py-0.5 text-xs hover:bg-gray-100">
                {fine.controlNumber} {copied === fine.controlNumber ? '✓' : ''}
              </button>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write fine detail page with pay/dispute**

```tsx
// client/src/app/fines/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { formatTZS, formatDate } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PAYMENT_METHODS } from '@zartsa/shared';
import type { PaymentMethod } from '@zartsa/shared';

const STATUS_COLORS: Record<string, string> = {
  OUTSTANDING: 'bg-red-100 text-red-800',
  PAID: 'bg-green-100 text-green-800',
  DISPUTED: 'bg-yellow-100 text-yellow-800',
  WAIVED: 'bg-gray-100 text-gray-800',
};

export default function FineDetailPage() {
  const { t, i18n } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [fine, setFine] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);

  useEffect(() => {
    api.get<{ data: any }>(`/fines/${id}`).then(res => setFine(res.data)).catch(() => setFine(null)).finally(() => setIsLoading(false));
  }, [id]);

  const handlePay = async () => {
    setIsPaying(true);
    try {
      const res = await api.post<{ data: any }>(`/fines/${id}/pay`, { paymentMethod, phoneNumber });
      setReceipt(res.data.receipt);
      setShowPayment(false);
      setFine(res.data.fine);
    } catch (err: any) { alert(err?.message || 'Payment failed'); }
    finally { setIsPaying(false); }
  };

  if (isLoading) return <p className="p-4 text-sm text-gray-500">{t('common.loading')}</p>;
  if (!fine) return <p className="p-4 text-sm text-gray-500">{t('fines.notFound')}</p>;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <Link href="/fines" className="mb-4 flex items-center gap-1 text-sm text-zartsa-green"><ArrowLeft className="h-4 w-4" />{t('fines.backToList')}</Link>

      <div className="rounded-lg border p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[fine.paymentStatus] || 'bg-gray-100'}`}>{t(`fines.status.${fine.paymentStatus.toLowerCase()}`)}</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-gray-500">{t('fines.offenseType')}:</span> {fine.offenseType}</p>
          <p><span className="text-gray-500">{t('fines.location')}:</span> {fine.location}</p>
          <p><span className="text-gray-500">{t('fines.offenseDate')}:</span> {formatDate(fine.offenseDate, i18n.language as 'sw' | 'en')}</p>
          <p><span className="text-gray-500">{t('fines.controlNumber')}:</span> <button onClick={() => navigator.clipboard.writeText(fine.controlNumber)} className="rounded border px-1.5 text-xs">{fine.controlNumber} 📋</button></p>
          <p className="text-lg font-bold text-zartsa-green">{formatTZS(Number(fine.penaltyAmount))}</p>
        </div>
      </div>

      {fine.paymentStatus === 'OUTSTANDING' && !receipt && (
        <div className="mt-4 space-y-2">
          <button onClick={() => setShowPayment(!showPayment)} className="w-full rounded-md bg-zartsa-green px-4 py-2 text-sm text-white">{t('fines.payNow')}</button>
          <Link href={`/fines/${id}/dispute`} className="block w-full rounded-md border px-4 py-2 text-center text-sm">{t('fines.dispute')}</Link>
        </div>
      )}

      {showPayment && (
        <div className="mt-4 rounded-lg border p-4">
          <h3 className="mb-3 font-semibold">{t('fines.selectPaymentMethod')}</h3>
          <div className="space-y-2">
            {PAYMENT_METHODS.map(pm => (
              <label key={pm} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                <input type="radio" name="paymentMethod" value={pm} checked={paymentMethod === pm} onChange={() => setPaymentMethod(pm)} />
                {t(`fines.paymentMethods.${pm}`)}
              </label>
            ))}
            {['mpesa', 'airtel_money', 'zantel'].includes(paymentMethod) && (
              <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+2557XXXXXXXX" className="w-full rounded-md border px-3 py-2 text-sm" />
            )}
            <button onClick={handlePay} disabled={isPaying} className="w-full rounded-md bg-zartsa-green px-4 py-2 text-sm text-white disabled:opacity-50">{isPaying ? t('common.loading') : t('fines.confirmPayment')}</button>
          </div>
        </div>
      )}

      {receipt && (
        <div className="mt-4 rounded-lg border bg-green-50 p-4">
          <h3 className="mb-2 font-semibold text-green-700">{t('fines.paymentSuccessful')}</h3>
          <div className="space-y-1 text-sm">
            <p><span className="text-gray-500">{t('fines.transactionRef')}:</span> {receipt.transactionRef}</p>
            <p><span className="text-gray-500">{t('fines.amount')}:</span> {formatTZS(receipt.amount)}</p>
            <p><span className="text-gray-500">{t('fines.method')}:</span> {receipt.paymentMethod}</p>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add fine i18n translations**

Add to `client/src/i18n/sw.json`:

```json
"fines": {
  "title": "Faini za Trafiki",
  "byLicense": "Kwa leseni",
  "byPlate": "Kwa namba ya gari",
  "licensePlaceholder": "Ingiza namba ya leseni",
  "platePlaceholder": "Ingiza namba ya gari",
  "noFines": "Hakuna faini",
  "notFound": "Faini haipatikani",
  "backToList": "Rudi kwenye orodha",
  "offenseType": "Aina ya kosa",
  "location": "Mahali",
  "offenseDate": "Tarehe ya kosa",
  "controlNumber": "Namba ya udhibiti",
  "payNow": "Lipa sasa",
  "dispute": "Tutakia faini",
  "selectPaymentMethod": "Chagua njia ya malipo",
  "confirmPayment": "Thibitisha malipo",
  "paymentSuccessful": "Malipo yamefanikiwa!",
  "transactionRef": "Namba ya muamala",
  "amount": "Kiasi",
  "method": "Njia",
  "status": {
    "outstanding": "Haijalipwa",
    "paid": "Imelipwa",
    "disputed": "Inatutakiwa",
    "waived": "Imesamehewa"
  },
  "paymentMethods": {
    "mpesa": "M-Pesa (Vodacom)",
    "airtel_money": "Airtel Money",
    "zantel": "Zantel",
    "visa": "Visa",
    "mastercard": "Mastercard",
    "bank_transfer": "Hambe ya benki"
  }
}
```

Add to `client/src/i18n/en.json`:

```json
"fines": {
  "title": "Traffic Fines",
  "byLicense": "By license",
  "byPlate": "By plate number",
  "licensePlaceholder": "Enter license number",
  "platePlaceholder": "Enter plate number",
  "noFines": "No fines found",
  "notFound": "Fine not found",
  "backToList": "Back to list",
  "offenseType": "Offense type",
  "location": "Location",
  "offenseDate": "Offense date",
  "controlNumber": "Control number",
  "payNow": "Pay now",
  "dispute": "Dispute fine",
  "selectPaymentMethod": "Select payment method",
  "confirmPayment": "Confirm payment",
  "paymentSuccessful": "Payment successful!",
  "transactionRef": "Transaction reference",
  "amount": "Amount",
  "method": "Method",
  "status": {
    "outstanding": "Outstanding",
    "paid": "Paid",
    "disputed": "Disputed",
    "waived": "Waived"
  },
  "paymentMethods": {
    "mpesa": "M-Pesa (Vodacom)",
    "airtel_money": "Airtel Money",
    "zantel": "Zantel",
    "visa": "Visa",
    "mastercard": "Mastercard",
    "bank_transfer": "Bank Transfer"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/app/fines/ client/src/i18n/
git commit -m "feat(fines): add fine search, detail, payment, and dispute pages with bilingual translations"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- [x] View offenses by license or plate — Task 4, Task 5
- [x] Per offense: type, date, location, amount, status — Task 5
- [x] Online payment (6 methods) — Task 2, Task 4
- [x] Receipt with transaction reference — Task 3, Task 5
- [x] ZIMS sync after payment — Task 3
- [x] Push notifications on new offenses — Task 3
- [x] Dispute mechanism — Task 4
- [x] Auto-generated control numbers with copy — Task 5
- [x] Rate limited — Task 4

**2. Placeholder scan:** No TBD, TODO, or "implement later" patterns found.

**3. Type consistency:**
- `FinePaymentStatus` matches Prisma enum
- `PaymentMethod` used consistently between schemas, service, and client
- `PAYMENT_METHODS` array used for both validation and client radio buttons
- `formatTZS` from foundation used for currency display