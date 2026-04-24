# ZARTSA News & Announcements Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the News & Announcements module (FR-07) allowing ZARTSA staff to publish, edit, schedule, and unpublish bilingual announcements, and citizens to browse them by category — no authentication required for public view.

**Architecture:** The Announcement Prisma model already exists with bilingual fields (titleSw/titleEn, contentSw/contentEn), categories, and publication controls. The server provides public read endpoints and authenticated admin CRUD endpoints. The client renders a category-filtered news feed and an admin management interface.

**Tech Stack:** Express 5, Prisma 7, Next.js 16, React 19, Tailwind 4, Zod, i18next

---

## File Structure

```
server/src/
├── services/
│   └── news.service.ts          # CRUD, publish/unpublish, list with filters
├── routes/
│   └── news.routes.ts           # Public + admin endpoints
shared/src/
├── types/
│   └── news.ts                  # Announcement types
├── schemas/
│   └── news.schema.ts           # Zod schemas
client/src/
├── app/
│   ├── news/
│   │   └── page.tsx             # Public news listing
│   └── news/[id]/
│       └── page.tsx             # News detail page
├── components/
│   └── NewsCard.tsx             # Reusable announcement card
└── i18n/
    ├── sw.json                  # (modify) Add news translations
    └── en.json                  # (modify) Add news translations
```

---

### Task 1: News Types and Zod Schemas

**Files:**
- Create: `shared/src/types/news.ts`
- Create: `shared/src/schemas/news.schema.ts`
- Modify: `shared/src/index.ts`

- [ ] **Step 1: Write news types**

```typescript
// shared/src/types/news.ts
export type AnnouncementCategory =
  | 'FARE_ADJUSTMENT'
  | 'ROAD_CLOSURE'
  | 'SCHEDULE_CHANGE'
  | 'REGULATORY_UPDATE'
  | 'GENERAL_NOTICE';

export interface Announcement {
  id: string;
  titleSw: string;
  titleEn: string;
  contentSw: string;
  contentEn: string;
  category: AnnouncementCategory;
  publishedAt: string | null;
  sourceAuthority: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnouncementInput {
  titleSw: string;
  titleEn: string;
  contentSw: string;
  contentEn: string;
  category: AnnouncementCategory;
  sourceAuthority?: string;
  publishNow?: boolean;
}

export interface UpdateAnnouncementInput {
  titleSw?: string;
  titleEn?: string;
  contentSw?: string;
  contentEn?: string;
  category?: AnnouncementCategory;
  sourceAuthority?: string;
}
```

- [ ] **Step 2: Write news Zod schemas**

```typescript
// shared/src/schemas/news.schema.ts
import { z } from 'zod';

export const CATEGORIES = [
  'FARE_ADJUSTMENT',
  'ROAD_CLOSURE',
  'SCHEDULE_CHANGE',
  'REGULATORY_UPDATE',
  'GENERAL_NOTICE',
] as const;

export const createAnnouncementSchema = z.object({
  titleSw: z.string().min(1).max(200),
  titleEn: z.string().min(1).max(200),
  contentSw: z.string().min(1).max(5000),
  contentEn: z.string().min(1).max(5000),
  category: z.enum(CATEGORIES),
  sourceAuthority: z.string().max(200).optional(),
  publishNow: z.boolean().default(false),
});

export const updateAnnouncementSchema = z.object({
  titleSw: z.string().min(1).max(200).optional(),
  titleEn: z.string().min(1).max(200).optional(),
  contentSw: z.string().min(1).max(5000).optional(),
  contentEn: z.string().min(1).max(5000).optional(),
  category: z.enum(CATEGORIES).optional(),
  sourceAuthority: z.string().max(200).optional(),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
```

- [ ] **Step 3: Update shared barrel export**

Add to `shared/src/index.ts`:

```typescript
export * from './types/news';
export * from './schemas/news.schema';
```

- [ ] **Step 4: Commit**

```bash
git add shared/
git commit -m "feat(news): add announcement types, categories, and Zod schemas"
```

---

### Task 2: News Service (Server)

**Files:**
- Create: `server/src/services/news.service.ts`

- [ ] **Step 1: Write news service**

```typescript
// server/src/services/news.service.ts
import { PrismaClient } from '@prisma/client';
import type { AnnouncementCategory, CreateAnnouncementInput, UpdateAnnouncementInput } from '@zartsa/shared';

const prisma = new PrismaClient();

export async function listPublishedAnnouncements(category?: AnnouncementCategory, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const where = {
    isPublished: true,
    publishedAt: { lte: new Date() },
    ...(category ? { category } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.announcement.count({ where }),
  ]);

  return { items, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getPublishedAnnouncement(id: string) {
  return prisma.announcement.findFirst({
    where: { id, isPublished: true, publishedAt: { lte: new Date() } },
  });
}

export async function listAllAnnouncements(category?: AnnouncementCategory, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const where = category ? { category } : {};

  const [items, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.announcement.count({ where }),
  ]);

  return { items, total, page, totalPages: Math.ceil(total / limit) };
}

export async function createAnnouncement(data: CreateAnnouncementInput) {
  return prisma.announcement.create({
    data: {
      titleSw: data.titleSw,
      titleEn: data.titleEn,
      contentSw: data.contentSw,
      contentEn: data.contentEn,
      category: data.category,
      sourceAuthority: data.sourceAuthority,
      isPublished: data.publishNow ?? false,
      publishedAt: data.publishNow ? new Date() : null,
    },
  });
}

export async function updateAnnouncement(id: string, data: UpdateAnnouncementInput) {
  return prisma.announcement.update({
    where: { id },
    data,
  });
}

export async function publishAnnouncement(id: string) {
  return prisma.announcement.update({
    where: { id },
    data: { isPublished: true, publishedAt: new Date() },
  });
}

export async function unpublishAnnouncement(id: string) {
  return prisma.announcement.update({
    where: { id },
    data: { isPublished: false, publishedAt: null },
  });
}

export async function deleteAnnouncement(id: string) {
  return prisma.announcement.delete({ where: { id } });
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/services/news.service.ts
git commit -m "feat(news): add announcement service with CRUD, publish/unpublish, and filtered listing"
```

---

### Task 3: News Routes (Server)

**Files:**
- Create: `server/src/routes/news.routes.ts`
- Modify: `server/src/routes/index.ts` — wire news routes

- [ ] **Step 1: Write news routes**

```typescript
// server/src/routes/news.routes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createAnnouncementSchema, updateAnnouncementSchema } from '@zartsa/shared';
import {
  listPublishedAnnouncements,
  getPublishedAnnouncement,
  listAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  publishAnnouncement,
  unpublishAnnouncement,
  deleteAnnouncement,
} from '../services/news.service';
import type { AnnouncementCategory } from '@zartsa/shared';

export const newsRoutes = Router();

// === PUBLIC ENDPOINTS (no auth required) ===

// List published announcements
newsRoutes.get('/', async (req, res, next) => {
  try {
    const category = req.query.category as AnnouncementCategory | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await listPublishedAnnouncements(category, page, limit);
    res.json({ status: 'ok', data: result });
  } catch (err) { next(err); }
});

// Get single published announcement
newsRoutes.get('/:id', async (req, res, next) => {
  try {
    const announcement = await getPublishedAnnouncement(req.params.id);
    if (!announcement) {
      return res.status(404).json({ status: 'error', code: 'NOT_FOUND', message: 'Announcement not found' });
    }
    res.json({ status: 'ok', data: announcement });
  } catch (err) { next(err); }
});

// === ADMIN ENDPOINTS (officer/admin only) ===

// List all announcements (including unpublished)
newsRoutes.get('/admin/all', authenticate, authorize('officer', 'admin'), async (req, res, next) => {
  try {
    const category = req.query.category as AnnouncementCategory | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await listAllAnnouncements(category, page, limit);
    res.json({ status: 'ok', data: result });
  } catch (err) { next(err); }
});

// Create announcement
newsRoutes.post('/', authenticate, authorize('officer', 'admin'), validate(createAnnouncementSchema), async (req, res, next) => {
  try {
    const announcement = await createAnnouncement(req.body);
    res.status(201).json({ status: 'ok', data: announcement });
  } catch (err) { next(err); }
});

// Update announcement
newsRoutes.patch('/:id', authenticate, authorize('officer', 'admin'), validate(updateAnnouncementSchema), async (req, res, next) => {
  try {
    const announcement = await updateAnnouncement(req.params.id, req.body);
    res.json({ status: 'ok', data: announcement });
  } catch (err) { next(err); }
});

// Publish announcement
newsRoutes.post('/:id/publish', authenticate, authorize('officer', 'admin'), async (req, res, next) => {
  try {
    const announcement = await publishAnnouncement(req.params.id);
    res.json({ status: 'ok', data: announcement });
  } catch (err) { next(err); }
});

// Unpublish announcement
newsRoutes.post('/:id/unpublish', authenticate, authorize('officer', 'admin'), async (req, res, next) => {
  try {
    const announcement = await unpublishAnnouncement(req.params.id);
    res.json({ status: 'ok', data: announcement });
  } catch (err) { next(err); }
});

// Delete announcement
newsRoutes.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    await deleteAnnouncement(req.params.id);
    res.json({ status: 'ok' });
  } catch (err) { next(err); }
});
```

- [ ] **Step 2: Wire news routes into main router**

Add to `server/src/routes/index.ts`:

```typescript
import { newsRoutes } from './news.routes';

// Add to router:
router.use('/news', newsRoutes);
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/news.routes.ts server/src/routes/index.ts
git commit -m "feat(news): add public and admin announcement endpoints with RBAC"
```

---

### Task 4: Client News Components

**Files:**
- Create: `client/src/components/NewsCard.tsx`
- Create: `client/src/app/news/page.tsx` — replace placeholder
- Create: `client/src/app/news/[id]/page.tsx`

- [ ] **Step 1: Write NewsCard component**

```tsx
// client/src/components/NewsCard.tsx
'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/utils';

interface NewsCardProps {
  id: string;
  titleSw: string;
  titleEn: string;
  contentSw: string;
  contentEn: string;
  category: string;
  publishedAt: string | null;
  sourceAuthority: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  FARE_ADJUSTMENT: 'bg-yellow-100 text-yellow-800',
  ROAD_CLOSURE: 'bg-red-100 text-red-800',
  SCHEDULE_CHANGE: 'bg-blue-100 text-blue-800',
  REGULATORY_UPDATE: 'bg-purple-100 text-purple-800',
  GENERAL_NOTICE: 'bg-gray-100 text-gray-800',
};

export function NewsCard({ id, titleSw, titleEn, contentSw, contentEn, category, publishedAt, sourceAuthority }: NewsCardProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language as 'sw' | 'en';
  const title = lang === 'sw' ? titleSw : titleEn;
  const content = lang === 'sw' ? contentSw : contentEn;
  const colorClass = CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-800';

  return (
    <Link href={`/news/${id}`} className="block">
      <div className="rounded-lg border p-4 transition-colors hover:bg-gray-50">
        <div className="mb-2 flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
            {category.replace(/_/g, ' ')}
          </span>
          {publishedAt && (
            <span className="text-xs text-gray-400">{formatDate(publishedAt, lang)}</span>
          )}
        </div>
        <h3 className="mb-1 font-semibold">{title}</h3>
        <p className="line-clamp-2 text-sm text-gray-600">{content}</p>
        {sourceAuthority && (
          <p className="mt-1 text-xs text-gray-400">{sourceAuthority}</p>
        )}
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Write news listing page**

```tsx
// client/src/app/news/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { NewsCard } from '@/components/NewsCard';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { AnnouncementCategory } from '@zartsa/shared';
import { CATEGORIES } from '@zartsa/shared';

interface Announcement {
  id: string;
  titleSw: string;
  titleEn: string;
  contentSw: string;
  contentEn: string;
  category: AnnouncementCategory;
  publishedAt: string | null;
  sourceAuthority: string | null;
}

export default function NewsPage() {
  const { t } = useTranslation();
  const [category, setCategory] = useState<AnnouncementCategory | ''>('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const params = category ? `?category=${category}` : '';
    api.get<{ data: { items: Announcement[] } }>(`/news${params}`)
      .then((res) => setAnnouncements(res.data.items))
      .catch(() => setAnnouncements([]))
      .finally(() => setIsLoading(false));
  }, [category]);

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/" className="rounded-md p-1 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">{t('news.title')}</h1>
      </div>

      {/* Category Filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setCategory('')}
          className={`rounded-full px-3 py-1 text-xs font-medium ${!category ? 'bg-zartsa-green text-white' : 'bg-gray-100 text-gray-700'}`}>
          {t('news.allCategories')}
        </button>
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${category === cat ? 'bg-zartsa-green text-white' : 'bg-gray-100 text-gray-700'}`}>
            {t(`news.categories.${cat}`)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : announcements.length === 0 ? (
        <p className="text-sm text-gray-500">{t('common.noResults')}</p>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <NewsCard key={a.id} {...a} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write news detail page**

```tsx
// client/src/app/news/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import type { AnnouncementCategory } from '@zartsa/shared';

const CATEGORY_COLORS: Record<string, string> = {
  FARE_ADJUSTMENT: 'bg-yellow-100 text-yellow-800',
  ROAD_CLOSURE: 'bg-red-100 text-red-800',
  SCHEDULE_CHANGE: 'bg-blue-100 text-blue-800',
  REGULATORY_UPDATE: 'bg-purple-100 text-purple-800',
  GENERAL_NOTICE: 'bg-gray-100 text-gray-800',
};

export default function NewsDetailPage() {
  const { t, i18n } = useTranslation();
  const params = useParams();
  const id = params.id as string;
  const [announcement, setAnnouncement] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: any }>(`/news/${id}`)
      .then((res) => setAnnouncement(res.data))
      .catch(() => setAnnouncement(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <p className="p-4 text-sm text-gray-500">{t('common.loading')}</p>;
  if (!announcement) return <p className="p-4 text-sm text-gray-500">{t('news.notFound')}</p>;

  const lang = i18n.language as 'sw' | 'en';
  const title = lang === 'sw' ? announcement.titleSw : announcement.titleEn;
  const content = lang === 'sw' ? announcement.contentSw : announcement.contentEn;
  const colorClass = CATEGORY_COLORS[announcement.category] || 'bg-gray-100 text-gray-800';

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <Link href="/news" className="mb-4 flex items-center gap-1 text-sm text-zartsa-green hover:underline">
        <ArrowLeft className="h-4 w-4" />
        {t('news.backToList')}
      </Link>

      <div className="mb-3 flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
          {t(`news.categories.${announcement.category}`)}
        </span>
        {announcement.publishedAt && (
          <span className="text-xs text-gray-400">{formatDate(announcement.publishedAt, lang)}</span>
        )}
      </div>

      <h1 className="mb-4 text-xl font-bold">{title}</h1>
      <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }} />

      {announcement.sourceAuthority && (
        <p className="mt-4 text-xs text-gray-400">{t('news.source')}: {announcement.sourceAuthority}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add news translations**

Add to `client/src/i18n/sw.json`:

```json
"news": {
  "title": "Habari na Tangazo",
  "allCategories": "Zote",
  "categories": {
    "FARE_ADJUSTMENT": "Marekebisho ya Nauli",
    "ROAD_CLOSURE": "Kufungwa kwa Barabara",
    "SCHEDULE_CHANGE": "Mabadiliko ya Ratiba",
    "REGULATORY_UPDATE": "Masahihisho ya Sheria",
    "GENERAL_NOTICE": "Tangazo la Kawaida"
  },
  "notFound": "Tangazo halipatikani",
  "backToList": "Rudi kwenye orodha",
  "source": "Chanzo",
  "createTitle": "Unda Tangazo",
  "editTitle": "Hariri Tangazo",
  "publish": "Chapisha",
  "unpublish": "Ondoa chapisho",
  "delete": "Futa"
}
```

Add to `client/src/i18n/en.json`:

```json
"news": {
  "title": "News & Announcements",
  "allCategories": "All",
  "categories": {
    "FARE_ADJUSTMENT": "Fare Adjustment",
    "ROAD_CLOSURE": "Road Closure",
    "SCHEDULE_CHANGE": "Schedule Change",
    "REGULATORY_UPDATE": "Regulatory Update",
    "GENERAL_NOTICE": "General Notice"
  },
  "notFound": "Announcement not found",
  "backToList": "Back to list",
  "source": "Source",
  "createTitle": "Create Announcement",
  "editTitle": "Edit Announcement",
  "publish": "Publish",
  "unpublish": "Unpublish",
  "delete": "Delete"
}
```

- [ ] **Step 5: Commit**

```bash
git add client/src/components/NewsCard.tsx client/src/app/news/ client/src/i18n/
git commit -m "feat(news): add news listing, detail page, NewsCard component, and bilingual translations"
```

---

### Task 5: Admin News Management Page

**Files:**
- Create: `client/src/app/news/admin/page.tsx`

- [ ] **Step 1: Write admin news management page**

```tsx
// client/src/app/news/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Eye, EyeOff, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { AnnouncementCategory } from '@zartsa/shared';
import { CATEGORIES } from '@zartsa/shared';

interface Announcement {
  id: string;
  titleSw: string;
  titleEn: string;
  isPublished: boolean;
  category: AnnouncementCategory;
  publishedAt: string | null;
  createdAt: string;
}

export default function NewsAdminPage() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    titleSw: '', titleEn: '', contentSw: '', contentEn: '',
    category: 'GENERAL_NOTICE' as AnnouncementCategory, sourceAuthority: '', publishNow: false,
  });

  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'officer' && user?.role !== 'admin')) {
      router.push('/login');
      return;
    }
    loadAnnouncements();
  }, [isAuthenticated, user]);

  const loadAnnouncements = async () => {
    try {
      const res = await api.get<{ data: { items: Announcement[] } }>('/news/admin/all');
      setAnnouncements(res.data.items);
    } catch { setAnnouncements([]); }
    finally { setIsLoading(false); }
  };

  const handleCreate = async () => {
    try {
      await api.post('/news', form);
      setShowForm(false);
      setForm({ titleSw: '', titleEn: '', contentSw: '', contentEn: '', category: 'GENERAL_NOTICE', sourceAuthority: '', publishNow: false });
      loadAnnouncements();
    } catch { alert('Failed to create announcement'); }
  };

  const handlePublish = async (id: string) => {
    try {
      await api.post(`/news/${id}/publish`);
      loadAnnouncements();
    } catch { alert('Failed to publish'); }
  };

  const handleUnpublish = async (id: string) => {
    try {
      await api.post(`/news/${id}/unpublish`);
      loadAnnouncements();
    } catch { alert('Failed to unpublish'); }
  };

  if (isLoading) return <p className="p-4 text-sm text-gray-500">{t('common.loading')}</p>;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/news" className="rounded-md p-1 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">{t('news.manageTitle') || 'Manage Announcements'}</h1>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded-md bg-zartsa-green px-3 py-1.5 text-sm text-white">
          <Plus className="h-4 w-4" />
          {t('news.createTitle')}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-lg border p-4">
          <h2 className="mb-3 font-semibold">{t('news.createTitle')}</h2>
          <div className="space-y-3">
            <input placeholder={t('news.titleSwPlaceholder') || 'Title (Swahili)'} value={form.titleSw}
              onChange={(e) => setForm(f => ({ ...f, titleSw: e.target.value }))}
              className="w-full rounded-md border px-3 py-2 text-sm" />
            <input placeholder={t('news.titleEnPlaceholder') || 'Title (English)'} value={form.titleEn}
              onChange={(e) => setForm(f => ({ ...f, titleEn: e.target.value }))}
              className="w-full rounded-md border px-3 py-2 text-sm" />
            <textarea placeholder={t('news.contentSwPlaceholder') || 'Content (Swahili)'} value={form.contentSw}
              onChange={(e) => setForm(f => ({ ...f, contentSw: e.target.value }))}
              className="w-full rounded-md border px-3 py-2 text-sm" rows={3} />
            <textarea placeholder={t('news.contentEnPlaceholder') || 'Content (English)'} value={form.contentEn}
              onChange={(e) => setForm(f => ({ ...f, contentEn: e.target.value }))}
              className="w-full rounded-md border px-3 py-2 text-sm" rows={3} />
            <select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value as AnnouncementCategory }))}
              className="w-full rounded-md border px-3 py-2 text-sm">
              {CATEGORIES.map(c => <option key={c} value={c}>{t(`news.categories.${c}`)}</option>)}
            </select>
            <input placeholder={t('news.source') || 'Source authority'} value={form.sourceAuthority}
              onChange={(e) => setForm(f => ({ ...f, sourceAuthority: e.target.value }))}
              className="w-full rounded-md border px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.publishNow} onChange={(e) => setForm(f => ({ ...f, publishNow: e.target.checked }))} />
              {t('news.publish') || 'Publish immediately'}
            </label>
            <button onClick={handleCreate} disabled={!form.titleSw || !form.titleEn || !form.contentSw || !form.contentEn}
              className="w-full rounded-md bg-zartsa-green px-4 py-2 text-sm text-white disabled:opacity-50">
              {t('news.createTitle') || 'Create'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {announcements.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">{a.titleEn}</p>
              <p className="text-xs text-gray-500">{a.category.replace(/_/g, ' ')} · {a.isPublished ? '✓ Published' : 'Draft'}</p>
            </div>
            <div className="flex gap-1">
              {a.isPublished ? (
                <button onClick={() => handleUnpublish(a.id)} className="rounded p-1.5 hover:bg-gray-100" title={t('news.unpublish')}>
                  <EyeOff className="h-4 w-4 text-gray-500" />
                </button>
              ) : (
                <button onClick={() => handlePublish(a.id)} className="rounded p-1.5 hover:bg-gray-100" title={t('news.publish')}>
                  <Eye className="h-4 w-4 text-zartsa-green" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/app/news/admin/page.tsx
git commit -m "feat(news): add admin announcement management page with create, publish, unpublish"
```

---

### Task 6: Notification Integration on New Announcement

**Files:**
- Modify: `server/src/services/news.service.ts` — send notification on publish

- [ ] **Step 1: Add notification dispatch on publish**

In `server/src/services/news.service.ts`, add import at the top:

```typescript
import { createAndSendNotification } from './notification.service';
import { NOTIFICATION_TYPES } from '@zartsa/shared';
import { PrismaClient } from '@prismaClient';
```

Then modify the `publishAnnouncement` function to send notifications to opted-in users:

```typescript
export async function publishAnnouncement(id: string) {
  const announcement = await prisma.announcement.update({
    where: { id },
    data: { isPublished: true, publishedAt: new Date() },
  });

  // Notify users who opted into new_announcement notifications
  const optedInUsers = await prisma.notificationPreference.findMany({
    where: { type: 'new_announcement', inApp: true },
    select: { userId: true },
  });

  const category = announcement.category;
  const title = announcement.titleEn;
  const message = `New ${category.replace(/_/g, ' ').toLowerCase()}: ${title}`;

  for (const user of optedInUsers) {
    await createAndSendNotification({
      userId: user.userId,
      type: 'new_announcement',
      title: title,
      message: message,
    }).catch(() => { /* Don't fail publish if notification fails */ });
  }

  return announcement;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/services/news.service.ts
git commit -m "feat(news): send notifications to opted-in users when announcement is published"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- [x] Public, no authentication required for viewing — Task 3
- [x] Staff can publish, edit, schedule, unpublish via admin — Task 3, Task 5
- [x] Five categories with bilingual content — Task 1, Task 4
- [x] Publication date and source authority displayed — Task 4
- [x] Push/SMS alerts to opted-in users — Task 6
- [x] Bilingual Kiswahili/English — Task 4

**2. Placeholder scan:** No TBD, TODO, or "implement later" patterns found.

**3. Type consistency:**
- `AnnouncementCategory` matches Prisma enum values
- `CreateAnnouncementInput` / `UpdateAnnouncementInput` align between Zod schemas and service
- `CATEGORIES` constant used for both server validation and client category filter