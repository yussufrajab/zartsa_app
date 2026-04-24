# ZARTSA License Verification Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the License & Document Verification Portal (FR-02) allowing any user to verify 8 document types (driving licenses, road licenses, vehicle permits, badges) via ZIMS API, with smart plate number formatting, status badges, and rate limiting — no authentication required.

**Architecture:** Verification requests go through rate-limited Express routes to the ZIMS service client, which makes HTTPS calls to the ZIMS REST API. Results are cached in Redis (5 min TTL for valid, 1 min for not-found) to keep response time under 5 seconds. The client provides a smart plate number input that auto-formats registration numbers.

**Tech Stack:** Express 5, Prisma 7, Redis 7 (caching), ZIMS API Client, Next.js 16, React 19, Tailwind 4, Zod, i18next

---

## File Structure

```
server/src/
├── services/
│   └── verify.service.ts         # Verify via ZIMS, cache results
├── routes/
│   └── verify.routes.ts          # POST /api/verify/*
shared/src/
├── types/
│   └── license.ts                # Verification types
├── schemas/
│   └── verify.schema.ts          # Zod verification schemas
client/src/
├── components/
│   └── SmartPlateInput.tsx        # Auto-formatting plate number input
├── app/
│   └── verify/
│       └── page.tsx              # Verification page
└── i18n/
    ├── sw.json                  # (modify) Add verify translations
    └── en.json                  # (modify) Add verify translations
```

---

### Task 1: Verification Types and Zod Schemas

**Files:**
- Create: `shared/src/types/license.ts`
- Create: `shared/src/schemas/verify.schema.ts`
- Modify: `shared/src/index.ts`

- [ ] **Step 1: Write verification types**

```typescript
// shared/src/types/license.ts
export type DocumentType =
  | 'driving_license'
  | 'road_license'
  | 'commercial_vehicle_license'
  | 'foreign_driving_permit'
  | 'government_driving_permit'
  | 'vehicle_visitor_permit'
  | 'temporary_permit'
  | 'driver_conductor_badge';

export type DocumentStatus = 'Valid' | 'Expired' | 'Suspended' | 'Invalid';

export interface VerificationResult {
  documentType: DocumentType;
  holderName: string;
  issueDate: string;
  expiryDate: string;
  status: DocumentStatus;
  documentNumber: string;
}

export interface VerificationRequest {
  documentType: DocumentType;
  number: string;
}
```

- [ ] **Step 2: Write verification Zod schemas**

```typescript
// shared/src/schemas/verify.schema.ts
import { z } from 'zod';

export const DOCUMENT_TYPES = [
  'driving_license',
  'road_license',
  'commercial_vehicle_license',
  'foreign_driving_permit',
  'government_driving_permit',
  'vehicle_visitor_permit',
  'temporary_permit',
  'driver_conductor_badge',
] as const;

export const verifyRequestSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES),
  number: z.string().min(1, 'Document number is required').max(50),
});

// Smart plate number format: Z followed by digits and letters, e.g. Z123ABC
export const plateNumberSchema = z.string()
  .regex(/^[A-Za-z]?\s*\d{1,5}\s*[A-Za-z]{0,3}$/, 'Invalid plate number format');

export type VerifyRequestInput = z.infer<typeof verifyRequestSchema>;
```

- [ ] **Step 3: Update shared barrel export**

Add to `shared/src/index.ts`:

```typescript
export * from './types/license';
export * from './schemas/verify.schema';
```

- [ ] **Step 4: Commit**

```bash
git add shared/
git commit -m "feat(verify): add verification types, document types enum, and Zod schemas"
```

---

### Task 2: Verification Service (Server)

**Files:**
- Create: `server/src/services/verify.service.ts`

- [ ] **Step 1: Write verification service with ZIMS integration and Redis caching**

```typescript
// server/src/services/verify.service.ts
import { cacheGet, cacheSet } from './redis.service';
import { zimsService } from './zims.service';
import { logger } from '../utils/logger';
import type { DocumentType, VerificationResult, DocumentStatus } from '@zartsa/shared';

const CACHE_TTL_VALID = 300;    // 5 minutes for valid documents
const CACHE_TTL_NOT_FOUND = 60; // 1 minute for not-found results

const DOCUMENT_TYPE_ZIMS_MAP: Record<DocumentType, string> = {
  driving_license: 'zodlap',
  road_license: 'road_license',
  commercial_vehicle_license: 'commercial',
  foreign_driving_permit: 'foreign_permit',
  government_driving_permit: 'government_permit',
  vehicle_visitor_permit: 'visitor_permit',
  temporary_permit: 'temporary',
  driver_conductor_badge: 'badge',
};

export function formatPlateNumber(input: string): string {
  const cleaned = input.replace(/\s+/g, '').toUpperCase();
  // Convert "z 123 abc" → "Z123ABC"
  return cleaned;
}

export async function verifyDocument(documentType: DocumentType, number: string): Promise<VerificationResult> {
  const formattedNumber = formatPlateNumber(number);
  const cacheKey = `verify:${documentType}:${formattedNumber}`;

  // Check cache first
  const cached = await cacheGet<VerificationResult | { notFound: true }>(cacheKey);
  if (cached) {
    if ('notFound' in cached) {
      throw new NotFoundError('Document not found in ZIMS system');
    }
    return cached as VerificationResult;
  }

  try {
    let result: VerificationResult;

    switch (documentType) {
      case 'driving_license':
      case 'foreign_driving_permit':
      case 'government_driving_permit':
      case 'temporary_permit': {
        const zimsData = await zimsService.verifyLicense(formattedNumber);
        result = {
          documentType,
          holderName: maskName(zimsData.holderName),
          issueDate: zimsData.issueDate,
          expiryDate: zimsData.expiryDate,
          status: zimsData.status as DocumentStatus,
          documentNumber: zimsData.licenseNumber,
        };
        break;
      }
      case 'road_license':
      case 'commercial_vehicle_license':
      case 'vehicle_visitor_permit': {
        const zimsData = await zimsService.verifyVehicle(formattedNumber);
        result = {
          documentType,
          holderName: maskName(zimsData.holderName),
          issueDate: zimsData.issueDate,
          expiryDate: zimsData.expiryDate,
          status: zimsData.status as DocumentStatus,
          documentNumber: zimsData.licenseNumber,
        };
        break;
      }
      case 'driver_conductor_badge': {
        const zimsData = await zimsService.verifyBadge(formattedNumber);
        result = {
          documentType,
          holderName: maskName(zimsData.holderName),
          issueDate: zimsData.issueDate,
          expiryDate: zimsData.expiryDate,
          status: zimsData.status as DocumentStatus,
          documentNumber: zimsData.licenseNumber,
        };
        break;
      }
      default:
        throw new Error(`Unsupported document type: ${documentType}`);
    }

    // Cache valid results for 5 minutes
    await cacheSet(cacheKey, result, CACHE_TTL_VALID);
    return result;
  } catch (err: any) {
    if (err?.statusCode === 404 || err?.code === 'ZIMS_NOT_FOUND') {
      // Cache not-found results for 1 minute
      await cacheSet(cacheKey, { notFound: true }, CACHE_TTL_NOT_FOUND);
      throw new NotFoundError('Document not found in ZIMS system');
    }
    throw err;
  }
}

function maskName(name: string): string {
  if (!name) return '***';
  const parts = name.split(' ');
  return parts.map((part, i) => {
    if (i === 0) return part; // First name visible
    return part[0] + '***'; // Last name masked
  }).join(' ');
}

import { NotFoundError } from '../utils/errors';
```

- [ ] **Step 2: Commit**

```bash
git add server/src/services/verify.service.ts
git commit -m "feat(verify): add document verification service with ZIMS integration and Redis caching"
```

---

### Task 3: Verification Routes (Server)

**Files:**
- Create: `server/src/routes/verify.routes.ts`
- Modify: `server/src/routes/index.ts` — wire verify routes

- [ ] **Step 1: Write verification routes**

```typescript
// server/src/routes/verify.routes.ts
import { Router } from 'express';
import { rateLimit } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { verifyRequestSchema } from '@zartsa/shared';
import { verifyDocument } from '../services/verify.service';

export const verifyRoutes = Router();

// All verification endpoints are public but rate-limited to 50/hour/IP
verifyRoutes.use(rateLimit('verify', 50, 3600000));

// Verify a document
verifyRoutes.post('/',
  validate(verifyRequestSchema),
  async (req, res, next) => {
    try {
      const { documentType, number } = req.body;
      const result = await verifyDocument(documentType, number);
      res.json({ status: 'ok', data: result });
    } catch (err) { next(err); }
  }
);

// Verify by specific type (convenience endpoints)
verifyRoutes.post('/license', async (req, res, next) => {
  try {
    const result = await verifyDocument('driving_license', req.body.number);
    res.json({ status: 'ok', data: result });
  } catch (err) { next(err); }
});

verifyRoutes.post('/vehicle', async (req, res, next) => {
  try {
    const result = await verifyDocument('road_license', req.body.number);
    res.json({ status: 'ok', data: result });
  } catch (err) { next(err); }
});

verifyRoutes.post('/badge', async (req, res, next) => {
  try {
    const result = await verifyDocument('driver_conductor_badge', req.body.number);
    res.json({ status: 'ok', data: result });
  } catch (err) { next(err); }
});
```

- [ ] **Step 2: Wire verify routes into main router**

Add to `server/src/routes/index.ts`:

```typescript
import { verifyRoutes } from './verify.routes';

// Add to router:
router.use('/verify', verifyRoutes);
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/verify.routes.ts server/src/routes/index.ts
git commit -m "feat(verify): add verification routes with rate limiting for document verification"
```

---

### Task 4: Smart Plate Number Input Component (Client)

**Files:**
- Create: `client/src/components/SmartPlateInput.tsx`

- [ ] **Step 1: Write SmartPlateInput component**

```tsx
// client/src/components/SmartPlateInput.tsx
'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface SmartPlateInputProps {
  value: string;
  onChange: (formatted: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
}

export function SmartPlateInput({ value, onChange, placeholder, label, error }: SmartPlateInputProps) {
  const { t } = useTranslation();

  const formatAndValidate = useCallback((raw: string): string => {
    // Remove all non-alphanumeric characters, convert to uppercase
    const cleaned = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    // Auto-format: try to match ZARTSA standard pattern Z123ABC
    return cleaned;
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatAndValidate(e.target.value);
    onChange(formatted);
  };

  const isValidFormat = (val: string): boolean => {
    return /^[A-Z]\d{1,5}[A-Z]{0,3}$/.test(val);
  };

  return (
    <div>
      {label && <label className="mb-1 block text-sm font-medium">{label}</label>}
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder || t('verify.plateNumberPlaceholder')}
        className={`w-full rounded-md border px-3 py-2 text-sm uppercase ${error ? 'border-red-500' : isValidFormat(value) ? 'border-green-500' : ''}`}
        maxLength={10}
        autoComplete="off"
        spellCheck={false}
      />
      {value && !isValidFormat(value) && value.length > 2 && (
        <p className="mt-1 text-xs text-amber-600">
          {t('verify.formatHint')}
        </p>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {isValidFormat(value) && (
        <p className="mt-1 text-xs text-green-600">{t('verify.formatValid')}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/SmartPlateInput.tsx
git commit -m "feat(verify): add SmartPlateInput component with auto-formatting and validation"
```

---

### Task 5: Client Verification Page

**Files:**
- Modify: `client/src/app/verify/page.tsx` — replace placeholder with full implementation
- Modify: `client/src/i18n/sw.json` — add verify translations
- Modify: `client/src/i18n/en.json` — add verify translations

- [ ] **Step 1: Write the verification page**

```tsx
// client/src/app/verify/page.tsx
'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { SmartPlateInput } from '@/components/SmartPlateInput';
import { formatDate } from '@/lib/utils';
import type { DocumentType, VerificationResult } from '@zartsa/shared';
import { DOCUMENT_TYPES } from '@zartsa/shared';
import { ArrowLeft, Search, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  Valid: 'bg-green-100 text-green-800',
  Expired: 'bg-red-100 text-red-800',
  Suspended: 'bg-yellow-100 text-yellow-800',
  Invalid: 'bg-red-100 text-red-800',
};

const STATUS_ICONS: Record<string, typeof CheckCircle> = {
  Valid: CheckCircle,
  Expired: AlertCircle,
  Suspended: AlertCircle,
  Invalid: AlertCircle,
};

export default function VerifyPage() {
  const { t, i18n } = useTranslation();
  const [documentType, setDocumentType] = useState<DocumentType>('driving_license');
  const [number, setNumber] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    if (!number) return;
    setIsLoading(true);
    setResult(null);
    setError('');
    try {
      const res = await api.post<{ data: VerificationResult }>('/verify', { documentType, number });
      setResult(res.data);
    } catch (err: any) {
      setError(err?.message || t('verify.notFound'));
    } finally {
      setIsLoading(false);
    }
  };

  const StatusIcon = result ? (STATUS_ICONS[result.status] || AlertCircle) : AlertCircle;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/" className="rounded-md p-1 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">{t('verify.title')}</h1>
      </div>

      {/* Document Type Selector */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium">{t('verify.documentType')}</label>
        <select value={documentType} onChange={(e) => { setDocumentType(e.target.value as DocumentType); setNumber(''); setResult(null); }}
          className="w-full rounded-md border px-3 py-2 text-sm">
          {DOCUMENT_TYPES.map((dt) => (
            <option key={dt} value={dt}>{t(`verify.types.${dt}`)}</option>
          ))}
        </select>
      </div>

      {/* Number Input */}
      <div className="mb-4">
        {['road_license', 'commercial_vehicle_license', 'vehicle_visitor_permit'].includes(documentType) ? (
          <SmartPlateInput value={number} onChange={setNumber} label={t('verify.plateNumber')} />
        ) : (
          <div>
            <label className="mb-1 block text-sm font-medium">
              {documentType === 'driver_conductor_badge' ? t('verify.badgeNumber') : t('verify.licenseNumber')}
            </label>
            <input type="text" value={number} onChange={(e) => setNumber(e.target.value.toUpperCase())}
              placeholder={t('verify.numberPlaceholder')} maxLength={50}
              className="w-full rounded-md border px-3 py-2 text-sm uppercase" />
          </div>
        )}
      </div>

      {/* Verify Button */}
      <button onClick={handleVerify} disabled={isLoading || !number}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-zartsa-green px-4 py-2 text-sm text-white disabled:opacity-50">
        <Search className="h-4 w-4" />
        {isLoading ? t('common.loading') : t('verify.verify')}
      </button>

      {/* Result */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon className="h-5 w-5" />
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[result.status] || 'bg-gray-100 text-gray-800'}`}>
                {t(`verify.${result.status.toLowerCase()}`)}
              </span>
            </div>
            <Shield className="h-5 w-5 text-zartsa-green" />
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">{t('verify.documentType')}</span>
              <span className="font-medium">{t(`verify.types.${result.documentType}`)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('verify.holderName')}</span>
              <span className="font-medium">{result.holderName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('verify.documentNumber')}</span>
              <span className="font-medium">{result.documentNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('verify.issueDate')}</span>
              <span className="font-medium">{formatDate(result.issueDate, i18n.language as 'sw' | 'en')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('verify.expiryDate')}</span>
              <span className="font-medium">{formatDate(result.expiryDate, i18n.language as 'sw' | 'en')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add verify translations to Swahili**

Add to `client/src/i18n/sw.json` (merge into existing object):

```json
"verify": {
  "title": "Thibitisha Hati",
  "documentType": "Aina ya hati",
  "plateNumber": "Namba ya usajili",
  "plateNumberPlaceholder": "Mfano: Z123ABC",
  "licenseNumber": "Namba ya leseni",
  "badgeNumber": "Namba ya beji",
  "numberPlaceholder": "Ingiza namba",
  "verify": "Thibitisha",
  "holderName": "Jina la mmiliki",
  "documentNumber": "Namba ya hati",
  "issueDate": "Tarehe ya toleo",
  "expiryDate": "Tarehe ya mwisho",
  "formatHint": "Namba ya usajili inapaswa kuwa mfano: Z123ABC",
  "formatValid": "Namba ya usajili sahihi",
  "valid": "Halali",
  "expired": "Imeisha muda",
  "suspended": "Imesimamishwa",
  "invalid": "Batili",
  "notFound": "Hati haipatikani katika mfumo wa ZIMS",
  "types": {
    "driving_license": "Leseni ya udereva",
    "road_license": "Leseni ya barabara",
    "commercial_vehicle_license": "Leseni ya gari la biashara",
    "foreign_driving_permit": "Ruhusa ya udereva ya nje",
    "government_driving_permit": "Ruhusa ya udereva ya serikali",
    "vehicle_visitor_permit": "Ruhusa ya gari la mgeni",
    "temporary_permit": "Ruhusa ya muda",
    "driver_conductor_badge": "Beji ya dereva/kondakta"
  }
}
```

- [ ] **Step 3: Add verify translations to English**

Add to `client/src/i18n/en.json`:

```json
"verify": {
  "title": "Verify Document",
  "documentType": "Document type",
  "plateNumber": "Plate number",
  "plateNumberPlaceholder": "e.g. Z123ABC",
  "licenseNumber": "License number",
  "badgeNumber": "Badge number",
  "numberPlaceholder": "Enter number",
  "verify": "Verify",
  "holderName": "Holder name",
  "documentNumber": "Document number",
  "issueDate": "Issue date",
  "expiryDate": "Expiry date",
  "formatHint": "Plate number should follow format: Z123ABC",
  "formatValid": "Valid plate number format",
  "valid": "Valid",
  "expired": "Expired",
  "suspended": "Suspended",
  "invalid": "Invalid",
  "notFound": "Document not found in ZIMS system",
  "types": {
    "driving_license": "Driving License",
    "road_license": "Road License",
    "commercial_vehicle_license": "Commercial Vehicle License",
    "foreign_driving_permit": "Foreign Driving Permit",
    "government_driving_permit": "Government Driving Permit",
    "vehicle_visitor_permit": "Vehicle Visitor Permit",
    "temporary_permit": "Temporary Permit",
    "driver_conductor_badge": "Driver/Conductor Badge"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/app/verify/page.tsx client/src/components/SmartPlateInput.tsx client/src/i18n/
git commit -m "feat(verify): add document verification page with smart plate input and bilingual translations"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- [x] Verify 8 document types — Task 1 (DOCUMENT_TYPES enum)
- [x] Display document type, holder name (masked), dates, status — Task 5
- [x] Flag expired/suspended/not-found — Task 2, Task 5
- [x] Response within 5 seconds (Redis cache) — Task 2
- [x] Smart plate number input with auto-format — Task 4
- [x] No auth required — Task 3 (no auth middleware)
- [x] Rate limited 50/hour/IP — Task 3

**2. Placeholder scan:** No TBD, TODO, or "implement later" patterns found.

**3. Type consistency:**
- `DocumentType` enum matches between shared types and ZIMS service mapping
- `VerificationResult` shape consistent between server and client
- `DOCUMENT_TYPES` array used for both validation schema and UI selector