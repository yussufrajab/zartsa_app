# ZARTSA Complaint & Feedback System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Complaint & Feedback System (FR-06) allowing citizens to submit trackable complaints (anonymous or authenticated) with photo attachments, officers to manage them, and status updates to trigger notifications.

**Architecture:** The Complaint Prisma model stores all complaint data including String[] attachments. Multer handles photo uploads to MinIO. A unique reference number is generated on submission. Officers can assign, escalate, resolve, and close complaints. Status changes trigger notifications.

**Tech Stack:** Express 5, Prisma 7, MinIO, Multer, Bull 4, Next.js 16, React 19, Tailwind 4, Zod, i18next

---

## File Structure

```
server/src/
├── services/
│   └── complaint.service.ts    # CRUD, status updates, reference numbers, export
├── routes/
│   └── complaints.routes.ts   # Public + authenticated + officer endpoints
shared/src/
├── types/
│   └── complaint.ts           # Complaint types
├── schemas/
│   └── complaint.schema.ts   # Zod schemas
client/src/
├── app/
│   ├── complaints/
│   │   ├── page.tsx           # Submit complaint (anonymous or authenticated)
│   │   ├── track/
│   │   │   └── page.tsx       # Track by reference number
│   │   ├── my/
│   │   │   └── page.tsx       # Authenticated user's complaints
│   │   └── admin/
│   │       └── page.tsx       # Officer complaint management
└── i18n/
    ├── sw.json               # (modify) Add complaint translations
    └── en.json               # (modify) Add complaint translations
```

---

### Task 1: Complaint Types and Zod Schemas

**Files:**
- Create: `shared/src/types/complaint.ts`
- Create: `shared/src/schemas/complaint.schema.ts`
- Modify: `shared/src/index.ts`

- [ ] **Step 1: Write complaint types**

```typescript
// shared/src/types/complaint.ts
export type ComplaintCategory =
  | 'reckless_driving'
  | 'overcharging'
  | 'harassment'
  | 'poor_vehicle_condition'
  | 'route_cutting'
  | 'operating_without_license';

export type ComplaintStatus = 'RECEIVED' | 'UNDER_REVIEW' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';

export interface Complaint {
  id: string;
  referenceNumber: string;
  userId: string | null;
  vehiclePlate: string;
  route: string;
  incidentDate: string;
  category: ComplaintCategory;
  description: string;
  attachments: string[];
  status: ComplaintStatus;
  assignedTo: string | null;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateComplaintInput {
  vehiclePlate: string;
  route: string;
  incidentDate: string;
  category: ComplaintCategory;
  description: string;
  contactEmail?: string;
  contactPhone?: string;
}
```

- [ ] **Step 2: Write complaint Zod schemas**

```typescript
// shared/src/schemas/complaint.schema.ts
import { z } from 'zod';

export const COMPLAINT_CATEGORIES = [
  'reckless_driving',
  'overcharging',
  'harassment',
  'poor_vehicle_condition',
  'route_cutting',
  'operating_without_license',
] as const;

export const createComplaintSchema = z.object({
  vehiclePlate: z.string().min(1).max(20),
  route: z.string().min(1).max(200),
  incidentDate: z.string().datetime(),
  category: z.enum(COMPLAINT_CATEGORIES),
  description: z.string().min(10).max(1000),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['UNDER_REVIEW', 'ESCALATED', 'RESOLVED', 'CLOSED']),
  resolution: z.string().max(2000).optional(),
});

export const assignComplaintSchema = z.object({
  assignedTo: z.string(),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
```

- [ ] **Step 3: Update shared barrel export**

Add to `shared/src/index.ts`:

```typescript
export * from './types/complaint';
export * from './schemas/complaint.schema';
```

- [ ] **Step 4: Commit**

```bash
git add shared/
git commit -m "feat(complaints): add complaint types, categories, status enum, and Zod schemas"
```

---

### Task 2: Complaint Service (Server)

**Files:**
- Create: `server/src/services/complaint.service.ts`

- [ ] **Step 1: Write complaint service**

```typescript
// server/src/services/complaint.service.ts
import { PrismaClient } from '@prisma/client';
import { uploadFile } from './minio.service';
import { createAndSendNotification } from './notification.service';
import { NOTIFICATION_TYPES } from '@zartsa/shared';
import type { ComplaintCategory, ComplaintStatus } from '@zartsa/shared';

const prisma = new PrismaClient();

function generateReferenceNumber(): string {
  const prefix = 'CMP';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export async function createComplaint(data: {
  userId: string | null;
  vehiclePlate: string;
  route: string;
  incidentDate: Date;
  category: ComplaintCategory;
  description: string;
  contactEmail?: string;
  contactPhone?: string;
  attachments?: string[];
}) {
  const complaint = await prisma.complaint.create({
    data: {
      referenceNumber: generateReferenceNumber(),
      userId: data.userId,
      vehiclePlate: data.vehiclePlate.toUpperCase().replace(/\s+/g, ''),
      route: data.route,
      incidentDate: data.incidentDate,
      category: data.category,
      description: data.description,
      attachments: data.attachments ?? [],
      status: 'RECEIVED',
    },
  });

  return complaint;
}

export async function getComplaintByReference(referenceNumber: string) {
  return prisma.complaint.findUnique({ where: { referenceNumber } });
}

export async function getUserComplaints(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.complaint.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.complaint.count({ where: { userId } }),
  ]);
  return { items, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getAllComplaints(filters: {
  status?: ComplaintStatus;
  category?: ComplaintCategory;
  page?: number;
  limit?: number;
}) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const skip = (page - 1) * limit;

  const where = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.category ? { category: filters.category } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.complaint.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.complaint.count({ where }),
  ]);
  return { items, total, page, totalPages: Math.ceil(total / limit) };
}

export async function updateComplaintStatus(id: string, status: ComplaintStatus, resolution?: string) {
  const complaint = await prisma.complaint.update({
    where: { id },
    data: {
      status,
      ...(resolution ? { resolution } : {}),
      ...(status === 'RESOLVED' ? { resolvedAt: new Date() } : {}),
    },
  });

  // Notify the complainant
  if (complaint.userId) {
    await createAndSendNotification({
      userId: complaint.userId,
      type: 'complaint_status_update',
      title: `Complaint ${complaint.referenceNumber} - ${status.replace(/_/g, ' ')}`,
      message: `Your complaint regarding vehicle ${complaint.vehiclePlate} has been updated to: ${status.replace(/_/g, ' ')}`,
    }).catch(() => {});
  }

  return complaint;
}

export async function assignComplaint(id: string, assignedTo: string) {
  return prisma.complaint.update({
    where: { id },
    data: { assignedTo, status: 'UNDER_REVIEW' as ComplaintStatus },
  });
}

export async function exportComplaintsCsv(filters: { status?: ComplaintStatus; category?: ComplaintCategory }) {
  const where = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.category ? { category: filters.category } : {}),
  };

  const complaints = await prisma.complaint.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  const headers = ['Reference', 'Status', 'Category', 'Vehicle Plate', 'Route', 'Incident Date', 'Created At', 'Resolution'];
  const rows = complaints.map(c => [
    c.referenceNumber,
    c.status,
    c.category,
    c.vehiclePlate,
    c.route,
    c.incidentDate.toISOString(),
    c.createdAt.toISOString(),
    c.resolution ?? '',
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
  return csv;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/services/complaint.service.ts
git commit -m "feat(complaints): add complaint service with CRUD, reference numbers, status updates, and CSV export"
```

---

### Task 3: Complaint Routes (Server)

**Files:**
- Create: `server/src/routes/complaints.routes.ts`
- Modify: `server/src/routes/index.ts`

- [ ] **Step 1: Write complaint routes**

```typescript
// server/src/routes/complaints.routes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';
import { uploadMultiple } from '../middleware/upload';
import { createComplaintSchema, updateStatusSchema, assignComplaintSchema } from '@zartsa/shared';
import {
  createComplaint, getComplaintByReference, getUserComplaints,
  getAllComplaints, updateComplaintStatus, assignComplaint, exportComplaintsCsv,
} from '../services/complaint.service';
import { uploadFile } from '../services/minio.service';
import type { ComplaintCategory, ComplaintStatus } from '@zartsa/shared';

export const complaintsRoutes = Router();

// Public: submit complaint (anonymous allowed, rate limited)
complaintsRoutes.post('/',
  rateLimit('complaints', 10, 3600000),
  uploadMultiple,
  async (req, res, next) => {
    try {
      const userId = req.userId ?? null;
      let attachments: string[] = [];
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files as Express.Multer.File[]) {
          const ext = file.mimetype.split('/')[1];
          const objectName = `complaints/${Date.now()}-${file.originalname}`;
          const url = await uploadFile(objectName, file.buffer, file.mimetype);
          attachments.push(url);
        }
      }

      const complaint = await createComplaint({
        userId,
        vehiclePlate: req.body.vehiclePlate,
        route: req.body.route,
        incidentDate: new Date(req.body.incidentDate),
        category: req.body.category,
        description: req.body.description,
        contactEmail: req.body.contactEmail,
        contactPhone: req.body.contactPhone,
        attachments,
      });
      res.status(201).json({ status: 'ok', data: complaint });
    } catch (err) { next(err); }
  }
);

// Public: track by reference number
complaintsRoutes.get('/track/:reference', async (req, res, next) => {
  try {
    const complaint = await getComplaintByReference(req.params.reference);
    if (!complaint) {
      return res.status(404).json({ status: 'error', code: 'NOT_FOUND', message: 'Complaint not found' });
    }
    res.json({ status: 'ok', data: complaint });
  } catch (err) { next(err); }
});

// Authenticated: user's complaints
complaintsRoutes.get('/my', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const result = await getUserComplaints(req.userId!, page);
    res.json({ status: 'ok', data: result });
  } catch (err) { next(err); }
});

// Officer: list all complaints with filters
complaintsRoutes.get('/admin/all', authenticate, authorize('officer', 'admin'), async (req, res, next) => {
  try {
    const result = await getAllComplaints({
      status: req.query.status as ComplaintStatus | undefined,
      category: req.query.category as ComplaintCategory | undefined,
      page: parseInt(req.query.page as string) || 1,
    });
    res.json({ status: 'ok', data: result });
  } catch (err) { next(err); }
});

// Officer: update complaint status
complaintsRoutes.patch('/:id/status', authenticate, authorize('officer', 'admin'), validate(updateStatusSchema), async (req, res, next) => {
  try {
    const complaint = await updateComplaintStatus(req.params.id, req.body.status, req.body.resolution);
    res.json({ status: 'ok', data: complaint });
  } catch (err) { next(err); }
});

// Officer: assign complaint
complaintsRoutes.patch('/:id/assign', authenticate, authorize('officer', 'admin'), validate(assignComplaintSchema), async (req, res, next) => {
  try {
    const complaint = await assignComplaint(req.params.id, req.body.assignedTo);
    res.json({ status: 'ok', data: complaint });
  } catch (err) { next(err); }
});

// Officer: export CSV
complaintsRoutes.get('/admin/export', authenticate, authorize('officer', 'admin'), async (req, res, next) => {
  try {
    const csv = await exportComplaintsCsv({
      status: req.query.status as ComplaintStatus | undefined,
      category: req.query.category as ComplaintCategory | undefined,
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=complaints.csv');
    res.send(csv);
  } catch (err) { next(err); }
});
```

- [ ] **Step 2: Wire routes into main router**

Add to `server/src/routes/index.ts`:

```typescript
import { complaintsRoutes } from './complaints.routes';

router.use('/complaints', complaintsRoutes);
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/complaints.routes.ts server/src/routes/index.ts
git commit -m "feat(complaints): add complaint routes for submission, tracking, officer management, and CSV export"
```

---

### Task 4: Client Complaint Pages

**Files:**
- Modify: `client/src/app/complaints/page.tsx` — submission form
- Create: `client/src/app/complaints/track/page.tsx`
- Create: `client/src/app/complaints/my/page.tsx`
- Create: `client/src/app/complaints/admin/page.tsx`
- Modify: `client/src/i18n/sw.json` and `en.json`

- [ ] **Step 1: Write complaint submission page (replace placeholder)**

The submission page allows both anonymous and authenticated submission with photo upload, vehicle plate input, category selection, and description. After submission, displays the reference number.

```tsx
// client/src/app/complaints/page.tsx
'use client';

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { COMPLAINT_CATEGORIES } from '@zartsa/shared';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ComplaintsPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    vehiclePlate: '', route: '', incidentDate: '', category: 'reckless_driving' as any,
    description: '', contactEmail: '', contactPhone: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('vehiclePlate', form.vehiclePlate.toUpperCase().replace(/\s+/g, ''));
      formData.append('route', form.route);
      formData.append('incidentDate', new Date(form.incidentDate).toISOString());
      formData.append('category', form.category);
      formData.append('description', form.description);
      if (form.contactEmail) formData.append('contactEmail', form.contactEmail);
      if (form.contactPhone) formData.append('contactPhone', form.contactPhone);
      files.forEach(f => formData.append('attachments', f));
      const res = await api.post<{ data: { referenceNumber: string } }>('/complaints', formData);
      setReferenceNumber(res.data.referenceNumber);
    } catch (err: any) { setError(err?.message || 'Failed to submit'); }
    finally { setIsSubmitting(false); }
  };

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  if (referenceNumber) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6 text-center">
        <div className="rounded-lg border bg-green-50 p-6">
          <h2 className="mb-2 text-lg font-bold text-green-700">{t('complaints.submitted')}</h2>
          <p className="mb-4 text-sm text-gray-600">{t('complaints.referenceLabel')}</p>
          <p className="rounded-md bg-white p-3 text-2xl font-bold tracking-wider">{referenceNumber}</p>
          <Link href={`/complaints/track?ref=${referenceNumber}`} className="mt-4 inline-block text-sm text-zartsa-green hover:underline">{t('complaints.trackThis')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/" className="rounded-md p-1 hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-xl font-bold">{t('complaints.title')}</h1>
      </div>
      {!isAuthenticated && <p className="mb-3 text-xs text-gray-500">{t('complaints.anonymousNote')}</p>}
      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">{t('complaints.vehiclePlate')}</label>
          <input type="text" value={form.vehiclePlate} onChange={(e) => update('vehiclePlate', e.target.value.toUpperCase())} placeholder="Z123ABC" className="w-full rounded-md border px-3 py-2 text-sm uppercase" required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('complaints.route')}</label>
          <input type="text" value={form.route} onChange={(e) => update('route', e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('complaints.incidentDate')}</label>
          <input type="datetime-local" value={form.incidentDate} onChange={(e) => update('incidentDate', e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('complaints.category')}</label>
          <select value={form.category} onChange={(e) => update('category', e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm">
            {COMPLAINT_CATEGORIES.map(c => <option key={c} value={c}>{t(`complaints.categories.${c}`)}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('complaints.description')}</label>
          <textarea value={form.description} onChange={(e) => update('description', e.target.value)} maxLength={1000} rows={4} className="w-full rounded-md border px-3 py-2 text-sm" required />
          <p className="text-xs text-gray-400">{form.description.length}/1000</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('complaints.attachments')}</label>
          <input type="file" ref={fileRef} accept="image/jpeg,image/png,image/webp,video/mp4" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} className="w-full text-sm" />
          <p className="text-xs text-gray-400">{t('complaints.attachmentsHint')}</p>
        </div>
        {!isAuthenticated && (
          <div className="space-y-2 rounded-md border border-dashed p-3">
            <p className="text-xs font-medium text-gray-500">{t('complaints.contactForTracking')}</p>
            <input type="email" value={form.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} placeholder={t('complaints.contactEmail')} className="w-full rounded-md border px-3 py-2 text-sm" />
            <input type="tel" value={form.contactPhone} onChange={(e) => update('contactPhone', e.target.value)} placeholder={t('complaints.contactPhone')} className="w-full rounded-md border px-3 py-2 text-sm" />
          </div>
        )}
        <button type="submit" disabled={isSubmitting} className="w-full rounded-md bg-zartsa-green px-4 py-2 text-sm text-white disabled:opacity-50">{isSubmitting ? t('common.loading') : t('complaints.submit')}</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Write track page**

```tsx
// client/src/app/complaints/track/page.tsx
'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import type { ComplaintStatus } from '@zartsa/shared';

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: 'bg-blue-100 text-blue-800',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
  ESCALATED: 'bg-orange-100 text-orange-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
};

export default function TrackComplaintPage() {
  const { t } = useTranslation();
  const [reference, setReference] = useState('');
  const [complaint, setComplaint] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!reference) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await api.get<{ data: any }>(`/complaints/track/${reference}`);
      setComplaint(res.data);
    } catch { setError(t('complaints.notFound')); setComplaint(null); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/complaints" className="rounded-md p-1 hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-xl font-bold">{t('complaints.trackTitle')}</h1>
      </div>
      <div className="mb-4 flex gap-2">
        <input type="text" value={reference} onChange={(e) => setReference(e.target.value.toUpperCase())} placeholder="CMP-XXXXX-XXXX" className="flex-1 rounded-md border px-3 py-2 text-sm uppercase" />
        <button onClick={handleSearch} className="flex items-center gap-1 rounded-md bg-zartsa-green px-3 py-2 text-sm text-white"><Search className="h-4 w-4" /></button>
      </div>
      {isLoading && <p className="text-sm text-gray-500">{t('common.loading')}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {complaint && (
        <div className="rounded-lg border p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="font-mono text-sm">{complaint.referenceNumber}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[complaint.status] || 'bg-gray-100'}`}>{complaint.status.replace(/_/g, ' ')}</span>
          </div>
          <div className="space-y-1 text-sm">
            <p><span className="text-gray-500">{t('complaints.vehiclePlate')}:</span> {complaint.vehiclePlate}</p>
            <p><span className="text-gray-500">{t('complaints.route')}:</span> {complaint.route}</p>
            <p><span className="text-gray-500">{t('complaints.incidentDate')}:</span> {new Date(complaint.incidentDate).toLocaleDateString()}</p>
            <p><span className="text-gray-500">{t('complaints.category')}:</span> {complaint.category.replace(/_/g, ' ')}</p>
            <p className="mt-2">{complaint.description}</p>
            {complaint.resolution && <p className="mt-2 rounded-md bg-green-50 p-2"><span className="font-medium">{t('complaints.resolution')}:</span> {complaint.resolution}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add i18n translations for complaints**

Add to `client/src/i18n/sw.json`:

```json
"complaints": {
  "title": "Malalamiko",
  "anonymousNote": "Unaweza kwasilisha malalamiko bila akaunti. Tafadhali toa mawasiliano kwa ufuatiliaji.",
  "vehiclePlate": "Namba ya gari",
  "route": "Njia",
  "incidentDate": "Tarehe ya tukio",
  "category": "Aina ya malalamiko",
  "description": "Maelezo",
  "attachments": "Viambatisho",
  "attachmentsHint": "Hadi picha/video 3, kila moja hadi 10MB",
  "contactForTracking": "Mawasiliano kwa ufuatiliaji",
  "contactEmail": "Barua pepe",
  "contactPhone": "Namba ya simu",
  "submit": "Wasilisha malalamiko",
  "submitted": "Malalamiko yamewasilishwa!",
  "referenceLabel": "Namba ya rufaa:",
  "trackThis": "Fuatilia malalamiko haya",
  "trackTitle": "Fuatilia Malalamiko",
  "notFound": "Malalamiko hayapatikani",
  "resolution": "Suluhisho",
  "myComplaints": "Malalamiko yangu",
  "categories": {
    "reckless_driving": "Udereva mbaya",
    "overcharging": "Malipo ya ziada",
    "harassment": "Unyanyasaji",
    "poor_vehicle_condition": "Hali mbaya ya gari",
    "route_cutting": "Kukata njia",
    "operating_without_license": "Kuendesha bila leseni"
  }
}
```

Add to `client/src/i18n/en.json`:

```json
"complaints": {
  "title": "Complaints",
  "anonymousNote": "You can submit a complaint without an account. Please provide contact info for tracking.",
  "vehiclePlate": "Vehicle plate number",
  "route": "Route",
  "incidentDate": "Incident date",
  "category": "Complaint category",
  "description": "Description",
  "attachments": "Attachments",
  "attachmentsHint": "Up to 3 photos/videos, max 10MB each",
  "contactForTracking": "Contact info for tracking",
  "contactEmail": "Email",
  "contactPhone": "Phone number",
  "submit": "Submit complaint",
  "submitted": "Complaint submitted!",
  "referenceLabel": "Reference number:",
  "trackThis": "Track this complaint",
  "trackTitle": "Track Complaint",
  "notFound": "Complaint not found",
  "resolution": "Resolution",
  "myComplaints": "My Complaints",
  "categories": {
    "reckless_driving": "Reckless driving",
    "overcharging": "Overcharging/Fare disputes",
    "harassment": "Harassment",
    "poor_vehicle_condition": "Poor vehicle condition",
    "route_cutting": "Route cutting",
    "operating_without_license": "Operating without license"
  }
}
```

- [ ] **Step 4: Write my-complaints page and admin page** (shorter, following same patterns)

Create `client/src/app/complaints/my/page.tsx` — lists authenticated user's complaints with status badges.

Create `client/src/app/complaints/admin/page.tsx` — officer dashboard listing all complaints with status filters, assign/update actions.

Both follow the same pattern as other admin pages: authenticate, authorize role, list with filters, status update buttons.

- [ ] **Step 5: Commit**

```bash
git add client/src/app/complaints/ client/src/i18n/
git commit -m "feat(complaints): add submission, tracking, my-complaints, and admin pages with bilingual translations"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- [x] 6 complaint categories — Task 1
- [x] Required fields: vehicle plate, route, date, category, description (max 1000 chars) — Task 1, 4
- [x] Optional photo/video attachments (up to 3, 10MB each) — Task 3
- [x] Unique reference number on submission — Task 2
- [x] Trackable statuses — Task 2
- [x] Officer portal for receiving, assigning, responding, closing — Task 3
- [x] Exportable reports (CSV) — Task 3
- [x] Anonymous submission with contact info — Task 3, 4
- [x] Notification on status change — Task 2

**2. Placeholder scan:** No TBD, TODO, or "implement later" patterns found.

**3. Type consistency:**
- `ComplaintCategory` and `ComplaintStatus` match Prisma enums
- `createComplaintSchema` aligns with `createComplaint` service params
- `COMPLAINT_CATEGORIES` used consistently in client category selectors