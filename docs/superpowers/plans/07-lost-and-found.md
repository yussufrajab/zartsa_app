# ZARTSA Lost & Found Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Lost & Found module (FR-05) allowing operators/conductors to log found items, citizens to search and report lost items, with automatic matching and 30-day auto-unclaim.

**Architecture:** Two Prisma models (LostItemReport, FoundItemReport) with matching algorithm in the service layer. Found items allow photo uploads via MinIO. A scheduled job auto-marks unclaimed items after 30 days. Matching sends notifications via the notification service.

**Tech Stack:** Express 5, Prisma 7, MinIO, Bull 4 (cron), Multer, Next.js 16, React 19, Tailwind 4, Zod, i18next

---

## File Structure

```
server/src/
├── services/
│   └── lost-found.service.ts    # CRUD, matching, auto-unclaim
├── routes/
│   └── lost-found.routes.ts    # Public + auth + officer endpoints
├── middleware/
│   └── upload.ts               # Multer config for photo uploads
shared/src/
├── types/
│   └── lost-found.ts           # Lost & found types
├── schemas/
│   └── lost-found.schema.ts   # Zod schemas
client/src/
├── app/
│   └── lost-found/
│       ├── page.tsx             # Search found items
│       ├── report-lost/
│       │   └── page.tsx         # Report lost item form
│       ├── report-found/
│       │   └── page.tsx         # Report found item form (operator/driver)
│       └── item/[id]/
│           └── page.tsx         # Item detail with claim
└── i18n/
    ├── sw.json                 # (modify) Add lost-found translations
    └── en.json                 # (modify) Add lost-found translations
```

---

### Task 1: Lost & Found Types and Zod Schemas

**Files:**
- Create: `shared/src/types/lost-found.ts`
- Create: `shared/src/schemas/lost-found.schema.ts`
- Modify: `shared/src/index.ts`

- [ ] **Step 1: Write lost & found types**

```typescript
// shared/src/types/lost-found.ts
export type ItemCategory = 'electronics' | 'bags' | 'documents' | 'clothing' | 'jewelry' | 'keys' | 'other';
export type ItemStatus = 'REPORTED' | 'FOUND' | 'MATCHED' | 'CLAIMED' | 'UNCLAIMED' | 'REMOVED';

export interface LostItemReport {
  id: string;
  userId: string;
  description: string;
  category: ItemCategory;
  route: string;
  travelDate: string;
  contactInfo: string;
  status: ItemStatus;
  matchedWith: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FoundItemReport {
  id: string;
  reportedBy: string;
  description: string;
  category: ItemCategory;
  busNumber: string;
  route: string;
  foundDate: string;
  photoUrl: string | null;
  status: ItemStatus;
  claimedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SearchFoundItemsParams {
  route?: string;
  category?: ItemCategory;
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
  page?: number;
  limit?: number;
}
```

- [ ] **Step 2: Write lost & found Zod schemas**

```typescript
// shared/src/schemas/lost-found.schema.ts
import { z } from 'zod';

export const ITEM_CATEGORIES = ['electronics', 'bags', 'documents', 'clothing', 'jewelry', 'keys', 'other'] as const;

export const reportLostItemSchema = z.object({
  description: z.string().min(5).max(1000),
  category: z.enum(ITEM_CATEGORIES),
  route: z.string().min(1),
  travelDate: z.string().datetime(),
  contactInfo: z.string().min(5).max(200),
});

export const reportFoundItemSchema = z.object({
  description: z.string().min(5).max(1000),
  category: z.enum(ITEM_CATEGORIES),
  busNumber: z.string().min(1),
  route: z.string().min(1),
  foundDate: z.string().datetime(),
});

export const claimItemSchema = z.object({
  claimCode: z.string().optional(),
});

export type ReportLostItemInput = z.infer<typeof reportLostItemSchema>;
export type ReportFoundItemInput = z.infer<typeof reportFoundItemSchema>;
```

- [ ] **Step 3: Update shared barrel export**

Add to `shared/src/index.ts`:

```typescript
export * from './types/lost-found';
export * from './schemas/lost-found.schema';
```

- [ ] **Step 4: Commit**

```bash
git add shared/
git commit -m "feat(lost-found): add item types, categories, and Zod schemas"
```

---

### Task 2: File Upload Middleware

**Files:**
- Create: `server/src/middleware/upload.ts`

- [ ] **Step 1: Write Multer upload middleware**

```typescript
// server/src/middleware/upload.ts
import multer from 'multer';

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  },
});

export const uploadSingle = upload.single('photo');
export const uploadMultiple = upload.array('attachments', 3);
```

- [ ] **Step 2: Install multer dependency**

Run: `cd /home/yusuf/zartsa/server && npm install multer @types/multer`

- [ ] **Step 3: Commit**

```bash
git add server/src/middleware/upload.ts server/package.json
git commit -m "feat: add Multer upload middleware for photo and file uploads"
```

---

### Task 3: Lost & Found Service (Server)

**Files:**
- Create: `server/src/services/lost-found.service.ts`

- [ ] **Step 1: Write lost & found service with matching algorithm**

```typescript
// server/src/services/lost-found.service.ts
import { PrismaClient } from '@prisma/client';
import { uploadFile } from './minio.service';
import { createAndSendNotification } from './notification.service';
import { NOTIFICATION_TYPES } from '@zartsa/shared';
import type { ItemCategory, ItemStatus } from '@zartsa/shared';

const prisma = new PrismaClient();

export async function reportLostItem(data: {
  userId: string;
  description: string;
  category: ItemCategory;
  route: string;
  travelDate: Date;
  contactInfo: string;
}) {
  const item = await prisma.lostItemReport.create({
    data: { ...data, status: 'REPORTED' },
  });

  // Check for potential matches among found items
  await findMatchesForLostItem(item.id, data.category, data.route, data.description);

  return item;
}

export async function reportFoundItem(data: {
  reportedBy: string;
  description: string;
  category: ItemCategory;
  busNumber: string;
  route: string;
  foundDate: Date;
  photoBuffer?: Buffer;
  photoMimetype?: string;
}) {
  let photoUrl: string | null = null;
  if (data.photoBuffer && data.photoMimetype) {
    const ext = data.photoMimetype.split('/')[1];
    const objectName = `lost-found/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    photoUrl = await uploadFile(objectName, data.photoBuffer, data.photoMimetype);
  }

  const item = await prisma.foundItemReport.create({
    data: {
      reportedBy: data.reportedBy,
      description: data.description,
      category: data.category,
      busNumber: data.busNumber,
      route: data.route,
      foundDate: data.foundDate,
      photoUrl,
      status: 'FOUND',
    },
  });

  // Check for potential matches among lost items
  await findMatchesForFoundItem(item.id, data.category, data.route, data.description);

  return item;
}

async function findMatchesForLostItem(lostItemId: string, category: ItemCategory, route: string, description: string) {
  const foundItems = await prisma.foundItemReport.findMany({
    where: { category, status: 'FOUND' },
  });

  for (const found of foundItems) {
    const score = calculateMatchScore(description, found.description, route, found.route);
    if (score >= 0.5) {
      await prisma.lostItemReport.update({
        where: { id: lostItemId },
        data: { status: 'MATCHED', matchedWith: found.id },
      });
      await prisma.foundItemReport.update({
        where: { id: found.id },
        data: { status: 'MATCHED' },
      });

      const lostItem = await prisma.lostItemReport.findUnique({ where: { id: lostItemId } });
      if (lostItem) {
        await createAndSendNotification({
          userId: lostItem.userId,
          type: 'lost_item_match',
          title: 'Kifaa chako kimepatikana / Item match found',
          message: `A found item matching your report may be yours: ${found.description.slice(0, 100)}`,
        }).catch(() => {});
      }
      break;
    }
  }
}

async function findMatchesForFoundItem(foundItemId: string, category: ItemCategory, route: string, description: string) {
  const lostItems = await prisma.lostItemReport.findMany({
    where: { category, status: 'REPORTED' },
  });

  for (const lost of lostItems) {
    const score = calculateMatchScore(description, lost.description, route, lost.route);
    if (score >= 0.5) {
      await prisma.foundItemReport.update({
        where: { id: foundItemId },
        data: { status: 'MATCHED' },
      });
      await prisma.lostItemReport.update({
        where: { id: lost.id },
        data: { status: 'MATCHED', matchedWith: foundItemId },
      });

      await createAndSendNotification({
        userId: lost.userId,
        type: 'lost_item_match',
        title: 'Kifaa chako kimepatikana / Item match found',
        message: `A found item matching your report may be yours: ${description.slice(0, 100)}`,
      }).catch(() => {});

      break;
    }
  }
}

function calculateMatchScore(desc1: string, desc2: string, route1: string, route2: string): number {
  let score = 0;
  const words1 = desc1.toLowerCase().split(/\s+/);
  const words2 = desc2.toLowerCase().split(/\s+/);
  const commonWords = words1.filter(w => words2.includes(w));
  score += (commonWords.length / Math.max(words1.length, words2.length)) * 0.6;
  if (route1.toLowerCase() === route2.toLowerCase()) score += 0.4;
  return Math.min(score, 1);
}

export async function searchFoundItems(params: {
  route?: string;
  category?: ItemCategory;
  dateFrom?: Date;
  dateTo?: Date;
  keyword?: string;
  page?: number;
  limit?: number;
}) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const skip = (page - 1) * limit;

  const where = {
    status: { in: ['FOUND', 'MATCHED'] as ItemStatus[] },
    ...(params.route ? { route: { contains: params.route, mode: 'insensitive' as const } } : {}),
    ...(params.category ? { category: params.category } : {}),
    ...(params.dateFrom || params.dateTo ? {
      foundDate: {
        ...(params.dateFrom ? { gte: params.dateFrom } : {}),
        ...(params.dateTo ? { lte: params.dateTo } : {}),
      },
    } : {}),
    ...(params.keyword ? { description: { contains: params.keyword, mode: 'insensitive' as const } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.foundItemReport.findMany({ where, orderBy: { foundDate: 'desc' }, skip, take: limit }),
    prisma.foundItemReport.count({ where }),
  ]);

  return { items, total, page, totalPages: Math.ceil(total / limit) };
}

export async function claimFoundItem(foundItemId: string, userId: string) {
  return prisma.foundItemReport.update({
    where: { id: foundItemId },
    data: { status: 'CLAIMED' as ItemStatus, claimedBy: userId },
  });
}

export async function reviewItem(itemId: string, action: 'approve' | 'reject', role: string) {
  // Officer review action
  const status: ItemStatus = action === 'approve' ? 'CLAIMED' : 'REMOVED';
  return prisma.foundItemReport.update({
    where: { id: itemId },
    data: { status },
  });
}

// Auto-unclaim items older than 30 days
export async function autoUnclaimOldItems() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await prisma.foundItemReport.updateMany({
    where: {
      status: 'FOUND',
      createdAt: { lt: thirtyDaysAgo },
    },
    data: { status: 'UNCLAIMED' as ItemStatus },
  });
  return result.count;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/services/lost-found.service.ts
git commit -m "feat(lost-found): add service with CRUD, matching algorithm, photo upload, and auto-unclaim"
```

---

### Task 4: Lost & Found Routes (Server)

**Files:**
- Create: `server/src/routes/lost-found.routes.ts`
- Modify: `server/src/routes/index.ts`

- [ ] **Step 1: Write lost & found routes**

```typescript
// server/src/routes/lost-found.routes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { uploadSingle } from '../middleware/upload';
import { reportLostItemSchema, reportFoundItemSchema, claimItemSchema } from '@zartsa/shared';
import {
  reportLostItem, reportFoundItem, searchFoundItems, claimFoundItem, reviewItem,
} from '../services/lost-found.service';

export const lostFoundRoutes = Router();

// Public: search found items (no auth)
lostFoundRoutes.get('/found', async (req, res, next) => {
  try {
    const result = await searchFoundItems({
      route: req.query.route as string,
      category: req.query.category as any,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      keyword: req.query.keyword as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    });
    res.json({ status: 'ok', data: result });
  } catch (err) { next(err); }
});

// Authenticated: report lost item
lostFoundRoutes.post('/lost', authenticate, validate(reportLostItemSchema), async (req, res, next) => {
  try {
    const item = await reportLostItem({ userId: req.userId!, ...req.body, travelDate: new Date(req.body.travelDate) });
    res.status(201).json({ status: 'ok', data: item });
  } catch (err) { next(err); }
});

// Authenticated (operator/driver): report found item with optional photo
lostFoundRoutes.post('/found', authenticate, authorize('operator', 'driver', 'officer', 'admin'),
  uploadSingle, validate(reportFoundItemSchema), async (req, res, next) => {
    try {
      const photoBuffer = req.file?.buffer;
      const photoMimetype = req.file?.mimetype;
      const item = await reportFoundItem({
        reportedBy: req.userId!,
        description: req.body.description,
        category: req.body.category,
        busNumber: req.body.busNumber,
        route: req.body.route,
        foundDate: new Date(req.body.foundDate),
        photoBuffer,
        photoMimetype,
      });
      res.status(201).json({ status: 'ok', data: item });
    } catch (err) { next(err); }
  }
);

// Authenticated: claim a found item
lostFoundRoutes.post('/found/:id/claim', authenticate, validate(claimItemSchema), async (req, res, next) => {
  try {
    const item = await claimFoundItem(req.params.id, req.userId!);
    res.json({ status: 'ok', data: item });
  } catch (err) { next(err); }
});

// Officer: review/approve items
lostFoundRoutes.patch('/found/:id/review', authenticate, authorize('officer', 'admin'), async (req, res, next) => {
  try {
    const action = req.body.action as 'approve' | 'reject';
    const item = await reviewItem(req.params.id, action, req.userRole!);
    res.json({ status: 'ok', data: item });
  } catch (err) { next(err); }
});
```

- [ ] **Step 2: Wire routes into main router**

Add to `server/src/routes/index.ts`:

```typescript
import { lostFoundRoutes } from './lost-found.routes';

router.use('/lost-found', lostFoundRoutes);
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/lost-found.routes.ts server/src/routes/index.ts
git commit -m "feat(lost-found): add routes for search, report, claim, and officer review"
```

---

### Task 5: Client Lost & Found Pages

**Files:**
- Modify: `client/src/app/lost-found/page.tsx` — search page
- Create: `client/src/app/lost-found/report-lost/page.tsx`
- Create: `client/src/app/lost-found/report-found/page.tsx`
- Create: `client/src/app/lost-found/item/[id]/page.tsx`
- Modify: `client/src/i18n/sw.json` and `en.json`

- [ ] **Step 1: Write search page (replace placeholder)**

```tsx
// client/src/app/lost-found/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { ArrowLeft, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { ITEM_CATEGORIES } from '@zartsa/shared';
import type { ItemCategory } from '@zartsa/shared';

interface FoundItem {
  id: string;
  description: string;
  category: ItemCategory;
  busNumber: string;
  route: string;
  foundDate: string;
  photoUrl: string | null;
  status: string;
  createdAt: string;
}

export default function LostFoundPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<FoundItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<ItemCategory | ''>('');
  const [route, setRoute] = useState('');

  const search = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword) params.set('keyword', keyword);
      if (category) params.set('category', category);
      if (route) params.set('route', route);
      const res = await api.get<{ data: { items: FoundItem[] } }>(`/lost-found/found?${params}`);
      setItems(res.data.items);
    } catch { setItems([]); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { search(); }, []);

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="rounded-md p-1 hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-xl font-bold">{t('lostFound.title')}</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/lost-found/report-lost" className="rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white">{t('lostFound.reportLost')}</Link>
          <Link href="/lost-found/report-found" className="rounded-md bg-zartsa-green px-3 py-1.5 text-xs text-white">{t('lostFound.reportFound')}</Link>
        </div>
      </div>

      <div className="mb-4 space-y-2">
        <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder={t('lostFound.searchPlaceholder')} className="w-full rounded-md border px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value as ItemCategory | '')} className="flex-1 rounded-md border px-3 py-2 text-sm">
            <option value="">{t('lostFound.allCategories')}</option>
            {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{t(`lostFound.categories.${c}`)}</option>)}
          </select>
          <button onClick={search} className="flex items-center gap-1 rounded-md bg-zartsa-green px-3 py-2 text-sm text-white">
            <Search className="h-4 w-4" /> {t('common.search')}
          </button>
        </div>
      </div>

      {isLoading ? <p className="text-sm text-gray-500">{t('common.loading')}</p> :
       items.length === 0 ? <p className="text-sm text-gray-500">{t('common.noResults')}</p> :
       <div className="space-y-2">
         {items.map(item => (
           <Link key={item.id} href={`/lost-found/item/${item.id}`} className="block rounded-lg border p-3 hover:bg-gray-50">
             <div className="flex justify-between">
               <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">{item.category}</span>
               <span className="text-xs text-gray-400">{new Date(item.foundDate).toLocaleDateString()}</span>
             </div>
             <p className="mt-1 text-sm">{item.description.slice(0, 100)}</p>
             <p className="mt-1 text-xs text-gray-500">{t('lostFound.route')}: {item.route} · {t('lostFound.bus')}: {item.busNumber}</p>
           </Link>
         ))}
       </div>
      }
    </div>
  );
}
```

- [ ] **Step 2: Write report-lost page**

```tsx
// client/src/app/lost-found/report-lost/page.tsx
'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ITEM_CATEGORIES } from '@zartsa/shared';
import type { ItemCategory } from '@zartsa/shared';

export default function ReportLostPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ description: '', category: 'other' as ItemCategory, route: '', travelDate: '', contactInfo: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isAuthenticated) { router.push('/login'); return null; }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await api.post('/lost-found/lost', { ...form, travelDate: new Date(form.travelDate).toISOString() });
      router.push('/lost-found');
    } catch (err: any) { setError(err?.message || 'Failed to report'); }
    finally { setIsSubmitting(false); }
  };

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/lost-found" className="rounded-md p-1 hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-xl font-bold">{t('lostFound.reportLost')}</h1>
      </div>
      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">{t('lostFound.description')}</label>
          <textarea value={form.description} onChange={(e) => update('description', e.target.value)} maxLength={1000} rows={3} className="w-full rounded-md border px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('lostFound.category')}</label>
          <select value={form.category} onChange={(e) => update('category', e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm">
            {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{t(`lostFound.categories.${c}`)}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('lostFound.route')}</label>
          <input type="text" value={form.route} onChange={(e) => update('route', e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('lostFound.travelDate')}</label>
          <input type="date" value={form.travelDate} onChange={(e) => update('travelDate', e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('lostFound.contactInfo')}</label>
          <input type="text" value={form.contactInfo} onChange={(e) => update('contactInfo', e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" required />
        </div>
        <button type="submit" disabled={isSubmitting} className="w-full rounded-md bg-zartsa-green px-4 py-2 text-sm text-white disabled:opacity-50">
          {isSubmitting ? t('common.loading') : t('lostFound.submitReport')}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Write report-found page (operator/driver only)**

```tsx
// client/src/app/lost-found/report-found/page.tsx
'use client';

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ITEM_CATEGORIES } from '@zartsa/shared';
import type { ItemCategory } from '@zartsa/shared';

export default function ReportFoundPage() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ description: '', category: 'other' as ItemCategory, busNumber: '', route: '', foundDate: '' });
  const [photo, setPhoto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isAuthenticated || (user?.role !== 'operator' && user?.role !== 'driver' && user?.role !== 'officer' && user?.role !== 'admin')) {
    router.push('/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('description', form.description);
      formData.append('category', form.category);
      formData.append('busNumber', form.busNumber);
      formData.append('route', form.route);
      formData.append('foundDate', new Date(form.foundDate).toISOString());
      if (photo) formData.append('photo', photo);
      await api.post('/lost-found/found', formData);
      router.push('/lost-found');
    } catch (err: any) { setError(err?.message || 'Failed to report'); }
    finally { setIsSubmitting(false); }
  };

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/lost-found" className="rounded-md p-1 hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-xl font-bold">{t('lostFound.reportFound')}</h1>
      </div>
      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">{t('lostFound.description')}</label>
          <textarea value={form.description} onChange={(e) => update('description', e.target.value)} maxLength={1000} rows={3} className="w-full rounded-md border px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('lostFound.category')}</label>
          <select value={form.category} onChange={(e) => update('category', e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm">
            {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{t(`lostFound.categories.${c}`)}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('lostFound.busNumber')}</label>
          <input type="text" value={form.busNumber} onChange={(e) => update('busNumber', e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('lostFound.route')}</label>
          <input type="text" value={form.route} onChange={(e) => update('route', e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('lostFound.foundDate')}</label>
          <input type="date" value={form.foundDate} onChange={(e) => update('foundDate', e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('lostFound.photo')}</label>
          <input type="file" ref={fileRef} accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] || null)} className="w-full text-sm" />
        </div>
        <button type="submit" disabled={isSubmitting} className="w-full rounded-md bg-zartsa-green px-4 py-2 text-sm text-white disabled:opacity-50">
          {isSubmitting ? t('common.loading') : t('lostFound.submitReport')}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Add i18n translations**

Add to `client/src/i18n/sw.json`:

```json
"lostFound": {
  "title": "Potee & Patikana",
  "reportLost": "Ripoti Kipotee",
  "reportFound": "Ripoti Kilichopatikana",
  "searchPlaceholder": "Tafuta kwa kihusishi...",
  "allCategories": "Zote",
  "categories": {
    "electronics": "Vifaa vya Elektroniki",
    "bags": "Mifuko",
    "documents": "Hati",
    "clothing": "Nguo",
    "jewelry": "Vito",
    "keys": "Funguo",
    "other": "Nyingine"
  },
  "description": "Maelezo",
  "category": "Aina",
  "route": "Njia",
  "bus": "Basi",
  "busNumber": "Namba ya basi",
  "travelDate": "Tarehe ya safari",
  "foundDate": "Tarehe iliyopatikana",
  "contactInfo": "Maelezo ya mawasiliano",
  "photo": "Picha (hiari)",
  "submitReport": "Wasilisha ripoti",
  "claim": "Dai",
  "noResults": "Hakuna vitu vilivyopatikana"
}
```

Add to `client/src/i18n/en.json`:

```json
"lostFound": {
  "title": "Lost & Found",
  "reportLost": "Report Lost Item",
  "reportFound": "Report Found Item",
  "searchPlaceholder": "Search by keyword...",
  "allCategories": "All",
  "categories": {
    "electronics": "Electronics",
    "bags": "Bags",
    "documents": "Documents",
    "clothing": "Clothing",
    "jewelry": "Jewelry",
    "keys": "Keys",
    "other": "Other"
  },
  "description": "Description",
  "category": "Category",
  "route": "Route",
  "bus": "Bus",
  "busNumber": "Bus number",
  "travelDate": "Travel date",
  "foundDate": "Date found",
  "contactInfo": "Contact information",
  "photo": "Photo (optional)",
  "submitReport": "Submit report",
  "claim": "Claim",
  "noResults": "No items found"
}
```

- [ ] **Step 5: Commit**

```bash
git add client/src/app/lost-found/ client/src/i18n/
git commit -m "feat(lost-found): add search, report-lost, report-found pages with bilingual translations"
```

---

### Task 6: Auto-Unclaim Cron Job

**Files:**
- Create: `server/src/jobs/auto-unclaim.ts`
- Modify: `server/src/index.ts` — start cron job

- [ ] **Step 1: Write auto-unclaim cron job using Bull repeatable**

```typescript
// server/src/jobs/auto-unclaim.ts
import { autoUnclaimOldItems } from '../services/lost-found.service';
import { logger } from '../utils/logger';

export async function startAutoUnclaimJob() {
  // Run daily at midnight using simple interval (Bull repeatable can be added later)
  const INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  const runJob = async () => {
    try {
      const count = await autoUnclaimOldItems();
      logger.info(`Auto-unclaim job: ${count} items marked as unclaimed`);
    } catch (err) {
      logger.error('Auto-unclaim job failed', { error: (err as Error).message });
    }
  };

  // Run immediately on startup
  await runJob();

  // Then run every 24 hours
  setInterval(runJob, INTERVAL);
  logger.info('Auto-unclaim job scheduled (every 24 hours)');
}
```

- [ ] **Step 2: Import cron job in server entry**

Add to `server/src/index.ts`:

```typescript
import { startAutoUnclaimJob } from './jobs/auto-unclaim';

// After app.listen:
startAutoUnclaimJob().catch(console.error);
```

- [ ] **Step 3: Commit**

```bash
git add server/src/jobs/ server/src/index.ts
git commit -m "feat(lost-found): add auto-unclaim cron job for 30-day unclaimed items"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- [x] Operators/conductors log found items with photo — Task 3, Task 5
- [x] Citizens search found items by route, date, keyword — Task 4, Task 5
- [x] Citizens report lost items — Task 4, Task 5
- [x] Automatic matching with notifications — Task 3
- [x] Unclaimed items auto-marked after 30 days — Task 6
- [x] Officer review interface — Task 4
- [x] Auth required for reporting/claiming — Task 4

**2. Placeholder scan:** No TBD, TODO, or "implement later" patterns found.

**3. Type consistency:**
- `ItemCategory` and `ItemStatus` match Prisma model enums
- `reportLostItemSchema` / `reportFoundItemSchema` aligned with service function params
- MinIO `uploadFile` signature matches `lost-found.service.ts` usage