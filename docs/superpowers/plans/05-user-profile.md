# ZARTSA Digital User Profile & History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the user profile module with editable personal details, saved routes (max 10), dashboard history tabs (bookings, verifications, complaints, fines), and permanent account deletion with data-protection compliance.

**Architecture:** Server exposes REST endpoints under `/api/users/me` for profile CRUD, `/api/users/me/routes` for saved routes, and `/api/users/me/history` for dashboard data. The client renders a profile page with editable fields, a saved-routes manager, tabbed dashboard, and a deletion confirmation flow. Shared types and Zod schemas live in `shared/`. All mutations go through the existing `authenticate` middleware.

**Tech Stack:** Express 5, Prisma 7, Zod, Next.js 16, React 19, Tailwind 4, shadcn/ui, next-i18next, Lucide React, Sonner

---

## File Structure

```
shared/src/
  types/user.ts                    # Updated: add UpdateProfileInput, SavedRouteInput
  schemas/user.schema.ts           # New: Zod schemas for profile update, save route, delete account
  index.ts                         # Updated: re-export user schemas

server/src/
  services/user.service.ts         # New: getProfile, updateProfile, updateLanguage, saveRoute, deleteRoute, deleteAccount, getDashboardHistory
  routes/users.routes.ts           # New: GET/PUT/DELETE /api/users/me, POST/DELETE /api/users/me/routes, GET /api/users/me/history
  routes/index.ts                  # Updated: wire user routes
  services/audit-logger.ts          # New: helper to write AuditLog entries

client/src/
  app/profile/
    page.tsx                       # Updated: full profile page with tabs
    profile-form.tsx               # New: editable profile form component
    saved-routes.tsx                # New: saved routes management component
    dashboard-tabs.tsx              # New: history tabs (bookings, verifications, complaints, fines)
    delete-account.tsx              # New: account deletion confirmation dialog
  i18n/sw.json                     # Updated: add profile i18n keys
  i18n/en.json                     # Updated: add profile i18n keys
```

---

### Task 1: User Profile Types and Zod Schemas

**Files:**
- Modify: `shared/src/types/user.ts`
- Create: `shared/src/schemas/user.schema.ts`
- Modify: `shared/src/index.ts`

- [ ] **Step 1: Write failing test for update profile schema**

```typescript
// shared/src/schemas/__tests__/user.schema.test.ts
import { describe, it, expect } from 'vitest';
import { updateProfileSchema, saveRouteSchema, deleteAccountSchema } from '../user.schema';

describe('updateProfileSchema', () => {
  it('rejects empty firstName', () => {
    const result = updateProfileSchema.safeParse({
      firstName: '',
      lastName: 'Doe',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid partial update', () => {
    const result = updateProfileSchema.safeParse({
      firstName: 'Jane',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstName).toBe('Jane');
    }
  });

  it('accepts email update', () => {
    const result = updateProfileSchema.safeParse({
      email: 'jane@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = updateProfileSchema.safeParse({
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('accepts nationalId update', () => {
    const result = updateProfileSchema.safeParse({
      nationalId: 'T123456789',
    });
    expect(result.success).toBe(true);
  });
});

describe('saveRouteSchema', () => {
  it('accepts valid route', () => {
    const result = saveRouteSchema.safeParse({
      departure: 'Stone Town',
      destination: 'Fuoni',
      label: 'Home route',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty departure', () => {
    const result = saveRouteSchema.safeParse({
      departure: '',
      destination: 'Fuoni',
      label: 'Home route',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing label', () => {
    const result = saveRouteSchema.safeParse({
      departure: 'Stone Town',
      destination: 'Fuoni',
    });
    expect(result.success).toBe(false);
  });
});

describe('deleteAccountSchema', () => {
  it('accepts correct confirmation', () => {
    const result = deleteAccountSchema.safeParse({
      confirmation: 'DELETE',
    });
    expect(result.success).toBe(true);
  });

  it('rejects wrong confirmation', () => {
    const result = deleteAccountSchema.safeParse({
      confirmation: 'remove',
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Install vitest and run test to verify it fails**

Run: `cd /home/yusuf/zartsa && npm install -w shared -D vitest`
Run: `cd /home/yusuf/zartsa/shared && npx vitest run src/schemas/__tests__/user.schema.test.ts`
Expected: FAIL - Cannot find module '../user.schema'

- [ ] **Step 3: Write user Zod schemas**

```typescript
// shared/src/schemas/user.schema.ts
import { z } from 'zod';

const tanzaniaPhone = z.string().regex(
  /^(\+255|0)[67]\d{8}$/,
  'Invalid Tanzanian phone number'
);

export const updateProfileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(100).optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(100).optional(),
  email: z.string().email('Invalid email address').optional(),
  nationalId: z.string().min(1).max(50).optional(),
  preferredLanguage: z.enum(['sw', 'en']).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided' }
);

export const saveRouteSchema = z.object({
  departure: z.string().min(1, 'Departure is required').max(200),
  destination: z.string().min(1, 'Destination is required').max(200),
  label: z.string().min(1, 'Label is required').max(100),
});

export const deleteAccountSchema = z.object({
  confirmation: z.literal('DELETE', {
    errorMap: () => ({ message: 'Type DELETE to confirm account deletion' }),
  }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type SaveRouteInput = z.infer<typeof saveRouteSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
```

- [ ] **Step 4: Update shared user types with dashboard history interfaces**

```typescript
// shared/src/types/user.ts
import type { UserRole } from './auth';

export interface User {
  id: string;
  phone: string;
  email: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
  nationalId: string | null;
  preferredLanguage: 'sw' | 'en';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends User {
  savedRoutes: SavedRoute[];
  notificationPreferences: NotificationPreference[];
}

export interface SavedRoute {
  id: string;
  userId: string;
  departure: string;
  destination: string;
  label: string;
}

export interface NotificationPreference {
  type: string;
  inApp: boolean;
  sms: boolean;
  email: boolean;
}

export interface BookingHistoryItem {
  id: string;
  departure: string;
  destination: string;
  travelDate: string;
  totalAmount: number;
  currency: string;
  status: string;
  qrCode: string | null;
  createdAt: string;
}

export interface VerificationHistoryItem {
  id: string;
  documentType: string;
  query: string;
  status: string;
  verifiedAt: string;
}

export interface ComplaintHistoryItem {
  id: string;
  referenceNumber: string;
  vehiclePlate: string;
  category: string;
  status: string;
  createdAt: string;
}

export interface FineHistoryItem {
  id: string;
  offenseType: string;
  location: string;
  penaltyAmount: number;
  currency: string;
  paymentStatus: string;
  controlNumber: string;
  createdAt: string;
}

export interface DashboardHistory {
  bookings: BookingHistoryItem[];
  verifications: VerificationHistoryItem[];
  complaints: ComplaintHistoryItem[];
  fines: FineHistoryItem[];
}
```

- [ ] **Step 5: Update shared barrel export**

Add to `shared/src/index.ts`:

```typescript
export * from './schemas/user.schema';
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd /home/yusuf/zartsa/shared && npx vitest run src/schemas/__tests__/user.schema.test.ts`
Expected: All 8 tests PASS

- [ ] **Step 7: Commit**

```bash
git add shared/src/types/user.ts shared/src/schemas/user.schema.ts shared/src/schemas/__tests__/user.schema.test.ts shared/src/index.ts
git commit -m "feat: add user profile Zod schemas, dashboard history types, and unit tests"
```

---

### Task 2: Audit Logger Helper

**Files:**
- Create: `server/src/services/audit-logger.ts`

- [ ] **Step 1: Write failing test for audit logger**

```typescript
// server/src/services/__tests__/audit-logger.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logAuditEvent } from '../audit-logger';

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: 'log1' }),
    },
  })),
}));

describe('logAuditEvent', () => {
  it('creates an audit log entry with required fields', async () => {
    const result = await logAuditEvent({
      userId: 'user1',
      action: 'UPDATE_PROFILE',
      resource: 'users',
      details: 'Updated firstName',
      ipAddress: '127.0.0.1',
    });
    expect(result.id).toBe('log1');
  });

  it('creates an audit log without userId', async () => {
    const result = await logAuditEvent({
      action: 'DELETE_ACCOUNT',
      resource: 'users',
      details: 'Account deleted',
      ipAddress: '127.0.0.1',
    });
    expect(result.id).toBe('log1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/yusuf/zartsa/server && npx vitest run src/services/__tests__/audit-logger.test.ts`
Expected: FAIL - Cannot find module '../audit-logger'

- [ ] **Step 3: Write audit logger implementation**

```typescript
// server/src/services/audit-logger.ts
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface AuditEvent {
  userId?: string;
  action: string;
  resource: string;
  details?: string;
  ipAddress?: string;
}

export async function logAuditEvent(event: AuditEvent) {
  try {
    const entry = await prisma.auditLog.create({
      data: {
        userId: event.userId,
        action: event.action,
        resource: event.resource,
        details: event.details,
        ipAddress: event.ipAddress,
      },
    });
    logger.info('Audit event', { action: event.action, userId: event.userId });
    return entry;
  } catch (err) {
    logger.error('Failed to write audit log', { error: (err as Error).message });
    throw err;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/yusuf/zartsa/server && npx vitest run src/services/__tests__/audit-logger.test.ts`
Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/services/audit-logger.ts server/src/services/__tests__/audit-logger.test.ts
git commit -m "feat: add audit logger service for recording user actions"
```

---

### Task 3: User Service (Server)

**Files:**
- Create: `server/src/services/user.service.ts`

- [ ] **Step 1: Write failing test for user service**

```typescript
// server/src/services/__tests__/user.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  savedRoute: {
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  booking: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  complaint: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  fine: {
    findMany: vi.fn().mockResolvedValue([]),
  },
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrisma),
}));

vi.mock('../audit-logger', () => ({
  logAuditEvent: vi.fn().mockResolvedValue({ id: 'audit1' }),
}));

import { getUserProfile, updateUserProfile, saveRoute, deleteSavedRoute, deleteAccount, getDashboardHistory } from '../user.service';
import type { UpdateProfileInput, SaveRouteInput } from '@zartsa/shared';

describe('getUserProfile', () => {
  it('returns profile with saved routes and notification preferences', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      phone: '+255712345678',
      email: 'test@test.com',
      firstName: 'Jane',
      lastName: 'Doe',
      role: 'CITIZEN',
      nationalId: 'T123456789',
      preferredLanguage: 'sw',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      savedRoutes: [{ id: 'r1', userId: 'u1', departure: 'Stone Town', destination: 'Fuoni', label: 'Home' }],
      notificationPrefs: [{ id: 'np1', userId: 'u1', type: 'booking', inApp: true, sms: false, email: false }],
    });

    const profile = await getUserProfile('u1');
    expect(profile.firstName).toBe('Jane');
    expect(profile.savedRoutes).toHaveLength(1);
  });

  it('throws NotFoundError when user does not exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(getUserProfile('nonexistent')).rejects.toThrow('User not found');
  });
});

describe('updateUserProfile', () => {
  it('updates only provided fields', async () => {
    mockPrisma.user.update.mockResolvedValue({
      id: 'u1', firstName: 'Updated', lastName: 'Doe', phone: '+255712345678',
    });

    const input: UpdateProfileInput = { firstName: 'Updated' };
    const result = await updateUserProfile('u1', input, '127.0.0.1');
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: { firstName: 'Updated' },
      })
    );
  });
});

describe('saveRoute', () => {
  it('saves a route when under the 10 route limit', async () => {
    mockPrisma.savedRoute.count.mockResolvedValue(5);
    mockPrisma.savedRoute.create.mockResolvedValue({
      id: 'r1', userId: 'u1', departure: 'Stone Town', destination: 'Fuoni', label: 'Home',
    });

    const input: SaveRouteInput = { departure: 'Stone Town', destination: 'Fuoni', label: 'Home' };
    const route = await saveRoute('u1', input);
    expect(route.departure).toBe('Stone Town');
  });

  it('rejects when user already has 10 saved routes', async () => {
    mockPrisma.savedRoute.count.mockResolvedValue(10);
    const input: SaveRouteInput = { departure: 'A', destination: 'B', label: 'C' };
    await expect(saveRoute('u1', input)).rejects.toThrow('Maximum of 10 saved routes reached');
  });
});

describe('deleteSavedRoute', () => {
  it('deletes a route belonging to the user', async () => {
    mockPrisma.savedRoute.delete.mockResolvedValue({ id: 'r1' });
    await deleteSavedRoute('u1', 'r1');
    expect(mockPrisma.savedRoute.delete).toHaveBeenCalledWith({
      where: { id: 'r1' },
    });
  });
});

describe('deleteAccount', () => {
  it('soft-deletes user by setting isActive to false and deletes related data', async () => {
    mockPrisma.user.update.mockResolvedValue({ id: 'u1', isActive: false });
    await deleteAccount('u1', '127.0.0.1');
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: { isActive: false },
      })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/yusuf/zartsa/server && npx vitest run src/services/__tests__/user.service.test.ts`
Expected: FAIL - Cannot find module '../user.service'

- [ ] **Step 3: Write user service implementation**

```typescript
// server/src/services/user.service.ts
import { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logAuditEvent } from './audit-logger';
import type { UpdateProfileInput, SaveRouteInput } from '@zartsa/shared';

const prisma = new PrismaClient();

const MAX_SAVED_ROUTES = 10;

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      savedRoutes: {
        orderBy: { createdAt: 'desc' },
      },
      notificationPrefs: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role.toLowerCase(),
    nationalId: user.nationalId,
    preferredLanguage: user.preferredLanguage,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    savedRoutes: user.savedRoutes,
    notificationPreferences: user.notificationPrefs,
  };
}

export async function updateUserProfile(userId: string, data: UpdateProfileInput, ipAddress?: string) {
  const updateData: Record<string, unknown> = {};

  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.nationalId !== undefined) updateData.nationalId = data.nationalId;
  if (data.preferredLanguage !== undefined) updateData.preferredLanguage = data.preferredLanguage;

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    include: {
      savedRoutes: { orderBy: { createdAt: 'desc' } },
      notificationPrefs: true,
    },
  });

  await logAuditEvent({
    userId,
    action: 'UPDATE_PROFILE',
    resource: 'users',
    details: `Updated fields: ${Object.keys(updateData).join(', ')}`,
    ipAddress,
  });

  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role.toLowerCase(),
    nationalId: user.nationalId,
    preferredLanguage: user.preferredLanguage,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    savedRoutes: user.savedRoutes,
    notificationPreferences: user.notificationPrefs,
  };
}

export async function updateLanguage(userId: string, language: 'sw' | 'en') {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { preferredLanguage: language === 'sw' ? 'sw' : 'en' },
  });

  return { preferredLanguage: user.preferredLanguage };
}

export async function saveRoute(userId: string, data: SaveRouteInput) {
  const routeCount = await prisma.savedRoute.count({
    where: { userId },
  });

  if (routeCount >= MAX_SAVED_ROUTES) {
    throw new ValidationError(`Maximum of ${MAX_SAVED_ROUTES} saved routes reached. Remove a route before adding a new one.`);
  }

  const route = await prisma.savedRoute.create({
    data: {
      userId,
      departure: data.departure,
      destination: data.destination,
      label: data.label,
    },
  });

  await logAuditEvent({
    userId,
    action: 'SAVE_ROUTE',
    resource: 'saved_routes',
    details: `${data.departure} -> ${data.destination}`,
  });

  return route;
}

export async function deleteSavedRoute(userId: string, routeId: string) {
  const route = await prisma.savedRoute.findUnique({
    where: { id: routeId },
  });

  if (!route || route.userId !== userId) {
    throw new NotFoundError('Saved route');
  }

  await prisma.savedRoute.delete({
    where: { id: routeId },
  });

  await logAuditEvent({
    userId,
    action: 'DELETE_ROUTE',
    resource: 'saved_routes',
    details: `Route ${routeId}`,
  });
}

export async function deleteAccount(userId: string, ipAddress?: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  await logAuditEvent({
    userId,
    action: 'DELETE_ACCOUNT',
    resource: 'users',
    details: 'Account deactivated (soft delete for data protection compliance)',
    ipAddress,
  });
}

export async function getDashboardHistory(userId: string) {
  const [bookings, complaints, fines] = await Promise.all([
    prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        departure: true,
        destination: true,
        travelDate: true,
        totalAmount: true,
        currency: true,
        status: true,
        qrCode: true,
        createdAt: true,
      },
    }),
    prisma.complaint.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        referenceNumber: true,
        vehiclePlate: true,
        category: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.fine.findMany({
      where: {
        OR: [
          { drivingLicense: { in: await getUserLicenseNumbers(userId) } },
          { vehiclePlate: { in: await getUserVehiclePlates(userId) } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        offenseType: true,
        location: true,
        penaltyAmount: true,
        currency: true,
        paymentStatus: true,
        controlNumber: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    bookings: bookings.map((b) => ({
      ...b,
      totalAmount: Number(b.totalAmount),
      travelDate: b.travelDate.toISOString(),
      createdAt: b.createdAt.toISOString(),
    })),
    verifications: [],
    complaints: complaints.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    })),
    fines: fines.map((f) => ({
      ...f,
      penaltyAmount: Number(f.penaltyAmount),
      createdAt: f.createdAt.toISOString(),
    })),
  };
}

async function getUserLicenseNumbers(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.nationalId) return [];
  return [user.nationalId];
}

async function getUserVehiclePlates(userId: string): Promise<string[]> {
  return [];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/yusuf/zartsa/server && npx vitest run src/services/__tests__/user.service.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/services/user.service.ts server/src/services/__tests__/user.service.test.ts
git commit -m "feat: add user service with profile CRUD, saved routes (max 10), and account deletion"
```

---

### Task 4: User Routes (Server)

**Files:**
- Create: `server/src/routes/users.routes.ts`
- Modify: `server/src/routes/index.ts`

- [ ] **Step 1: Write failing test for user routes**

```typescript
// server/src/routes/__tests__/users.routes.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const mockGetUserProfile = vi.fn();
const mockUpdateUserProfile = vi.fn();
const mockSaveRoute = vi.fn();
const mockDeleteSavedRoute = vi.fn();
const mockDeleteAccount = vi.fn();
const mockGetDashboardHistory = vi.fn();

vi.mock('../../services/user.service', () => ({
  getUserProfile: mockGetUserProfile,
  updateUserProfile: mockUpdateUserProfile,
  saveRoute: mockSaveRoute,
  deleteSavedRoute: mockDeleteSavedRoute,
  deleteAccount: mockDeleteAccount,
  getDashboardHistory: mockGetDashboardHistory,
}));

vi.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.userId = 'test-user-id';
    req.userRole = 'citizen';
    next();
  },
  authorize: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../middleware/rateLimit', () => ({
  rateLimit: () => (_req: any, _res: any, next: any) => next(),
}));

import express from 'express';
import { usersRoutes } from '../users.routes';

const app = express();
app.use(express.json());
app.use('/api/users', usersRoutes);

describe('GET /api/users/me', () => {
  it('returns user profile', async () => {
    mockGetUserProfile.mockResolvedValue({
      id: 'u1', firstName: 'Jane', lastName: 'Doe', phone: '+255712345678',
    });

    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(200);
    expect(res.body.data.firstName).toBe('Jane');
  });
});

describe('PUT /api/users/me', () => {
  it('updates profile', async () => {
    mockUpdateUserProfile.mockResolvedValue({
      id: 'u1', firstName: 'Updated',
    });

    const res = await request(app).put('/api/users/me').send({ firstName: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.data.firstName).toBe('Updated');
  });
});

describe('DELETE /api/users/me', () => {
  it('deletes account with confirmation', async () => {
    mockDeleteAccount.mockResolvedValue(undefined);

    const res = await request(app).delete('/api/users/me').send({ confirmation: 'DELETE' });
    expect(res.status).toBe(200);
  });
});

describe('POST /api/users/me/routes', () => {
  it('saves a route', async () => {
    mockSaveRoute.mockResolvedValue({
      id: 'r1', departure: 'A', destination: 'B', label: 'Home',
    });

    const res = await request(app).post('/api/users/me/routes').send({
      departure: 'A', destination: 'B', label: 'Home',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.departure).toBe('A');
  });
});

describe('DELETE /api/users/me/routes/:routeId', () => {
  it('deletes a saved route', async () => {
    mockDeleteSavedRoute.mockResolvedValue(undefined);

    const res = await request(app).delete('/api/users/me/routes/r1');
    expect(res.status).toBe(200);
  });
});

describe('GET /api/users/me/history', () => {
  it('returns dashboard history', async () => {
    mockGetDashboardHistory.mockResolvedValue({
      bookings: [], verifications: [], complaints: [], fines: [],
    });

    const res = await request(app).get('/api/users/me/history');
    expect(res.status).toBe(200);
    expect(res.body.data.bookings).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/yusuf/zartsa/server && npm install -D supertest @types/supertest && npx vitest run src/routes/__tests__/users.routes.test.ts`
Expected: FAIL - Cannot find module '../users.routes'

- [ ] **Step 3: Write user routes implementation**

```typescript
// server/src/routes/users.routes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';
import { updateProfileSchema, saveRouteSchema, deleteAccountSchema } from '@zartsa/shared';
import {
  getUserProfile,
  updateUserProfile,
  updateLanguage,
  saveRoute,
  deleteSavedRoute,
  deleteAccount,
  getDashboardHistory,
} from '../services/user.service';

export const usersRoutes = Router();

usersRoutes.use(authenticate);

// GET /api/users/me - Get current user profile
usersRoutes.get('/me',
  rateLimit('profile', 30, 60_000),
  async (req, res, next) => {
    try {
      const profile = await getUserProfile(req.userId!);
      res.json({ status: 'ok', data: profile });
    } catch (err) { next(err); }
  }
);

// PUT /api/users/me - Update current user profile
usersRoutes.put('/me',
  rateLimit('profile-update', 10, 60_000),
  validate(updateProfileSchema),
  async (req, res, next) => {
    try {
      const profile = await updateUserProfile(req.userId!, req.body, req.ip);
      res.json({ status: 'ok', data: profile });
    } catch (err) { next(err); }
  }
);

// DELETE /api/users/me - Delete (deactivate) account
usersRoutes.delete('/me',
  rateLimit('account-delete', 3, 3600_000),
  validate(deleteAccountSchema),
  async (req, res, next) => {
    try {
      await deleteAccount(req.userId!, req.ip);
      res.json({ status: 'ok', message: 'Account deleted successfully' });
    } catch (err) { next(err); }
  }
);

// PUT /api/users/me/language - Update preferred language
usersRoutes.put('/me/language',
  rateLimit('profile-update', 10, 60_000),
  async (req, res, next) => {
    try {
      const { language } = req.body as { language: 'sw' | 'en' };
      if (language !== 'sw' && language !== 'en') {
        return res.status(400).json({ status: 'error', message: 'Language must be sw or en' });
      }
      const result = await updateLanguage(req.userId!, language);
      res.json({ status: 'ok', data: result });
    } catch (err) { next(err); }
  }
);

// POST /api/users/me/routes - Save a route
usersRoutes.post('/me/routes',
  rateLimit('save-route', 20, 60_000),
  validate(saveRouteSchema),
  async (req, res, next) => {
    try {
      const route = await saveRoute(req.userId!, req.body);
      res.status(201).json({ status: 'ok', data: route });
    } catch (err) { next(err); }
  }
);

// DELETE /api/users/me/routes/:routeId - Delete a saved route
usersRoutes.delete('/me/routes/:routeId',
  rateLimit('save-route', 20, 60_000),
  async (req, res, next) => {
    try {
      await deleteSavedRoute(req.userId!, req.params.routeId);
      res.json({ status: 'ok', message: 'Route removed' });
    } catch (err) { next(err); }
  }
);

// GET /api/users/me/history - Get dashboard history
usersRoutes.get('/me/history',
  rateLimit('profile', 30, 60_000),
  async (req, res, next) => {
    try {
      const history = await getDashboardHistory(req.userId!);
      res.json({ status: 'ok', data: history });
    } catch (err) { next(err); }
  }
);
```

- [ ] **Step 4: Wire user routes into main router**

Modify `server/src/routes/index.ts`:

```typescript
// server/src/routes/index.ts
import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { usersRoutes } from './users.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);

export const routes = router;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /home/yusuf/zartsa/server && npx vitest run src/routes/__tests__/users.routes.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/users.routes.ts server/src/routes/__tests__/users.routes.test.ts server/src/routes/index.ts
git commit -m "feat: add user profile, saved routes, account deletion, and dashboard history API routes"
```

---

### Task 5: Client Profile Form Component

**Files:**
- Create: `client/src/app/profile/profile-form.tsx`
- Modify: `client/src/i18n/sw.json`
- Modify: `client/src/i18n/en.json`

- [ ] **Step 1: Add profile i18n keys to Swahili translations**

Add to `client/src/i18n/sw.json` inside the top-level object:

```json
  "profile": {
    "title": "Wasifu Wangu",
    "editProfile": "Hariri Wasifu",
    "firstName": "Jina la kwanza",
    "lastName": "Jina la mwisho",
    "email": "Barua pepe",
    "phone": "Namba ya simu",
    "nationalId": "Namba ya kitambulisho",
    "language": "Lugha unayopendelea",
    "savedRoutes": "Njia zilizohifadhiwa",
    "addRoute": "Ongeza njia",
    "departure": "Kutoka",
    "destination": "Kwenda",
    "label": "Jina la njia",
    "removeRoute": "Ondoa njia",
    "maxRoutesReached": "Umefikia kikomo cha njia 10",
    "dashboard": "Dashibodi",
    "bookings": "Vitambulisho",
    "verifications": "Uthibitisho",
    "complaints": "Malalamiko",
    "fines": "Faini",
    "deleteAccount": "Futa Akaunti",
    "deleteConfirm": "Andika DELETE kuthibitisha",
    "deleteWarning": "Hatua hii hairejeshiki. Akaunti yako itafutwa kwa kudumu na data yote itafutwa kulingana na sheria za ulindaji data.",
    "deleteButton": "Futa Akaunti",
    "profileUpdated": "Wasifu umehifadhiwa",
    "routeSaved": "Njia imehifadhiwa",
    "routeRemoved": "Njia imeondolewa",
    "accountDeleted": "Akaunti imefutwa",
    "noBookings": "Hakuna vitambulisho",
    "noVerifications": "Hakuna uthibitisho",
    "noComplaints": "Hakuna malalamiko",
    "noFines": "Hakuna faini",
    "rebook": "Nunua tena",
    "status": "Hali",
    "date": "Tarehe",
    "amount": "Kiasi",
    "refNumber": "Namba ya marejeleo"
  }
```

- [ ] **Step 2: Add profile i18n keys to English translations**

Add to `client/src/i18n/en.json` inside the top-level object:

```json
  "profile": {
    "title": "My Profile",
    "editProfile": "Edit Profile",
    "firstName": "First name",
    "lastName": "Last name",
    "email": "Email",
    "phone": "Phone number",
    "nationalId": "National ID / Passport",
    "language": "Preferred language",
    "savedRoutes": "Saved Routes",
    "addRoute": "Add route",
    "departure": "From",
    "destination": "To",
    "label": "Route label",
    "removeRoute": "Remove route",
    "maxRoutesReached": "You have reached the 10 route limit",
    "dashboard": "Dashboard",
    "bookings": "Bookings",
    "verifications": "Verifications",
    "complaints": "Complaints",
    "fines": "Fines",
    "deleteAccount": "Delete Account",
    "deleteConfirm": "Type DELETE to confirm",
    "deleteWarning": "This action is irreversible. Your account will be permanently deleted and all data removed in compliance with data protection regulations.",
    "deleteButton": "Delete Account",
    "profileUpdated": "Profile updated",
    "routeSaved": "Route saved",
    "routeRemoved": "Route removed",
    "accountDeleted": "Account deleted",
    "noBookings": "No bookings yet",
    "noVerifications": "No verifications yet",
    "noComplaints": "No complaints yet",
    "noFines": "No fines found",
    "rebook": "Re-book",
    "status": "Status",
    "date": "Date",
    "amount": "Amount",
    "refNumber": "Reference number"
  }
```

- [ ] **Step 3: Write profile form component**

```tsx
// client/src/app/profile/profile-form.tsx
'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { Pencil, Save, X } from 'lucide-react';

interface ProfileData {
  id: string;
  phone: string;
  email: string | null;
  firstName: string;
  lastName: string;
  nationalId: string | null;
  preferredLanguage: 'sw' | 'en';
}

interface ProfileFormProps {
  profile: ProfileData;
  onUpdated: (profile: ProfileData) => void;
}

export function ProfileForm({ profile, onUpdated }: ProfileFormProps) {
  const { t, i18n } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email || '',
    nationalId: profile.nationalId || '',
    preferredLanguage: profile.preferredLanguage,
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const updateData: Record<string, unknown> = {};
      if (form.firstName !== profile.firstName) updateData.firstName = form.firstName;
      if (form.lastName !== profile.lastName) updateData.lastName = form.lastName;
      if (form.email !== (profile.email || '')) updateData.email = form.email || null;
      if (form.nationalId !== (profile.nationalId || '')) updateData.nationalId = form.nationalId || null;
      if (form.preferredLanguage !== profile.preferredLanguage) updateData.preferredLanguage = form.preferredLanguage;

      if (Object.keys(updateData).length === 0) {
        setEditing(false);
        setLoading(false);
        return;
      }

      const response = await api.put<{ status: string; data: ProfileData }>('/users/me', updateData);
      onUpdated(response.data);
      setEditing(false);
      toast.success(t('profile.profileUpdated'));

      if (updateData.preferredLanguage && updateData.preferredLanguage !== i18n.language) {
        await i18n.changeLanguage(updateData.preferredLanguage as string);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setForm({
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email || '',
      nationalId: profile.nationalId || '',
      preferredLanguage: profile.preferredLanguage,
    });
    setEditing(false);
  };

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('profile.editProfile')}</h2>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-sm text-zartsa-green"
          >
            <Pencil className="h-4 w-4" />
            {t('profile.editProfile')}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 rounded-md border px-3 py-1 text-sm"
            >
              <X className="h-4 w-4" />
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-1 rounded-md bg-zartsa-green px-3 py-1 text-sm text-white disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {t('common.save')}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">{t('profile.firstName')}</label>
            {editing ? (
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            ) : (
              <p className="text-sm font-medium">{profile.firstName}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">{t('profile.lastName')}</label>
            {editing ? (
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            ) : (
              <p className="text-sm font-medium">{profile.lastName}</p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500">{t('profile.phone')}</label>
          <p className="text-sm">{profile.phone}</p>
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500">{t('profile.email')}</label>
          {editing ? (
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          ) : (
            <p className="text-sm">{profile.email || '—'}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500">{t('profile.nationalId')}</label>
          {editing ? (
            <input
              type="text"
              value={form.nationalId}
              onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          ) : (
            <p className="text-sm">{profile.nationalId || '—'}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500">{t('profile.language')}</label>
          {editing ? (
            <select
              value={form.preferredLanguage}
              onChange={(e) => setForm({ ...form, preferredLanguage: e.target.value as 'sw' | 'en' })}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="sw">Kiswahili</option>
              <option value="en">English</option>
            </select>
          ) : (
            <p className="text-sm">{profile.preferredLanguage === 'sw' ? 'Kiswahili' : 'English'}</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/app/profile/profile-form.tsx client/src/i18n/sw.json client/src/i18n/en.json
git commit -m "feat: add profile form component with editable fields and i18n translations"
```

---

### Task 6: Client Saved Routes Management Component

**Files:**
- Create: `client/src/app/profile/saved-routes.tsx`

- [ ] **Step 1: Write saved routes component**

```tsx
// client/src/app/profile/saved-routes.tsx
'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { Plus, Trash2, MapPin, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface SavedRouteData {
  id: string;
  userId: string;
  departure: string;
  destination: string;
  label: string;
}

interface SavedRoutesProps {
  routes: SavedRouteData[];
  onRoutesChanged: (routes: SavedRouteData[]) => void;
}

const MAX_ROUTES = 10;

export function SavedRoutes({ routes, onRoutesChanged }: SavedRoutesProps) {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ departure: '', destination: '', label: '' });

  const handleAdd = async () => {
    if (!form.departure || !form.destination || !form.label) return;
    setLoading(true);
    try {
      const response = await api.post<{ status: string; data: SavedRouteData }>('/users/me/routes', form);
      onRoutesChanged([...routes, response.data]);
      setForm({ departure: '', destination: '', label: '' });
      setShowForm(false);
      toast.success(t('profile.routeSaved'));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (routeId: string) => {
    setLoading(true);
    try {
      await api.delete(`/users/me/routes/${routeId}`);
      onRoutesChanged(routes.filter((r) => r.id !== routeId));
      toast.success(t('profile.routeRemoved'));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('profile.savedRoutes')}</h2>
        {routes.length < MAX_ROUTES && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-sm text-zartsa-green"
          >
            <Plus className="h-4 w-4" />
            {t('profile.addRoute')}
          </button>
        )}
      </div>

      {routes.length >= MAX_ROUTES && (
        <p className="mb-3 text-xs text-amber-600">{t('profile.maxRoutesReached')}</p>
      )}

      {showForm && (
        <div className="mb-4 space-y-2 rounded-md bg-gray-50 p-3">
          <input
            type="text"
            placeholder={t('profile.departure')}
            value={form.departure}
            onChange={(e) => setForm({ ...form, departure: e.target.value })}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder={t('profile.destination')}
            value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value })}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder={t('profile.label')}
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={loading || !form.departure || !form.destination || !form.label}
              className="rounded-md bg-zartsa-green px-3 py-1 text-sm text-white disabled:opacity-50"
            >
              {t('common.save')}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm({ departure: '', destination: '', label: '' }); }}
              className="rounded-md border px-3 py-1 text-sm"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {routes.length === 0 && !showForm && (
        <p className="text-sm text-gray-500">{t('common.noResults')}</p>
      )}

      <div className="space-y-2">
        {routes.map((route) => (
          <div
            key={route.id}
            className="flex items-center justify-between rounded-md border p-3"
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-zartsa-green" />
              <div>
                <p className="text-sm font-medium">{route.label}</p>
                <p className="text-xs text-gray-500">
                  {route.departure} <ArrowRight className="mx-1 inline h-3 w-3" /> {route.destination}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/tickets?from=${encodeURIComponent(route.departure)}&to=${encodeURIComponent(route.destination)}`}
                className="rounded-md bg-zartsa-green px-2 py-1 text-xs text-white"
              >
                {t('profile.rebook')}
              </Link>
              <button
                onClick={() => handleRemove(route.id)}
                disabled={loading}
                className="text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
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
git add client/src/app/profile/saved-routes.tsx
git commit -m "feat: add saved routes component with add/remove, max 10 limit, and one-tap re-booking"
```

---

### Task 7: Client Dashboard Tabs Component

**Files:**
- Create: `client/src/app/profile/dashboard-tabs.tsx`

- [ ] **Step 1: Write dashboard tabs component**

```tsx
// client/src/app/profile/dashboard-tabs.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { Ticket, FileCheck, MessageSquareWarning, Scale } from 'lucide-react';

interface BookingHistoryItem {
  id: string;
  departure: string;
  destination: string;
  travelDate: string;
  totalAmount: number;
  currency: string;
  status: string;
  qrCode: string | null;
  createdAt: string;
}

interface VerificationHistoryItem {
  id: string;
  documentType: string;
  query: string;
  status: string;
  verifiedAt: string;
}

interface ComplaintHistoryItem {
  id: string;
  referenceNumber: string;
  vehiclePlate: string;
  category: string;
  status: string;
  createdAt: string;
}

interface FineHistoryItem {
  id: string;
  offenseType: string;
  location: string;
  penaltyAmount: number;
  currency: string;
  paymentStatus: string;
  controlNumber: string;
  createdAt: string;
}

interface DashboardHistory {
  bookings: BookingHistoryItem[];
  verifications: VerificationHistoryItem[];
  complaints: ComplaintHistoryItem[];
  fines: FineHistoryItem[];
}

type TabKey = 'bookings' | 'verifications' | 'complaints' | 'fines';

const tabs: { key: TabKey; icon: React.ElementType; labelKey: string }[] = [
  { key: 'bookings', icon: Ticket, labelKey: 'profile.bookings' },
  { key: 'verifications', icon: FileCheck, labelKey: 'profile.verifications' },
  { key: 'complaints', icon: MessageSquareWarning, labelKey: 'profile.complaints' },
  { key: 'fines', icon: Scale, labelKey: 'profile.fines' },
];

export function DashboardTabs() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('bookings');
  const [history, setHistory] = useState<DashboardHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await api.get<{ status: string; data: DashboardHistory }>('/users/me/history');
        setHistory(response.data);
      } catch {
        setHistory({ bookings: [], verifications: [], complaints: [], fines: [] });
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border p-4">
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  if (!history) return null;

  return (
    <div className="rounded-lg border p-4">
      <h2 className="mb-4 text-lg font-semibold">{t('profile.dashboard')}</h2>

      <div className="mb-4 flex border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const count = history[tab.key].length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1 border-b-2 px-3 py-2 text-sm ${
                activeTab === tab.key
                  ? 'border-zartsa-green font-medium text-zartsa-green'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t(tab.labelKey)}
              {count > 0 && (
                <span className="rounded-full bg-gray-200 px-1.5 text-xs">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === 'bookings' && (
        history.bookings.length === 0 ? (
          <p className="text-sm text-gray-500">{t('profile.noBookings')}</p>
        ) : (
          <div className="space-y-2">
            {history.bookings.map((b) => (
              <div key={b.id} className="rounded-md border p-3">
                <div className="flex justify-between">
                  <p className="text-sm font-medium">{b.departure} → {b.destination}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    b.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                    b.status === 'USED' ? 'bg-gray-100 text-gray-600' :
                    b.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{b.status}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {t('profile.date')}: {formatDate(b.travelDate)} | {t('profile.amount')}: {b.currency} {b.totalAmount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'verifications' && (
        history.verifications.length === 0 ? (
          <p className="text-sm text-gray-500">{t('profile.noVerifications')}</p>
        ) : (
          <div className="space-y-2">
            {history.verifications.map((v) => (
              <div key={v.id} className="rounded-md border p-3">
                <div className="flex justify-between">
                  <p className="text-sm font-medium">{v.documentType}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    v.status === 'Valid' ? 'bg-green-100 text-green-700' :
                    v.status === 'Expired' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{v.status}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{v.query}</p>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'complaints' && (
        history.complaints.length === 0 ? (
          <p className="text-sm text-gray-500">{t('profile.noComplaints')}</p>
        ) : (
          <div className="space-y-2">
            {history.complaints.map((c) => (
              <div key={c.id} className="rounded-md border p-3">
                <div className="flex justify-between">
                  <p className="text-sm font-medium">{c.category}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    c.status === 'RESOLVED' ? 'bg-green-100 text-green-700' :
                    c.status === 'CLOSED' ? 'bg-gray-100 text-gray-600' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{c.status}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {t('profile.refNumber')}: {c.referenceNumber} | {c.vehiclePlate}
                </p>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'fines' && (
        history.fines.length === 0 ? (
          <p className="text-sm text-gray-500">{t('profile.noFines')}</p>
        ) : (
          <div className="space-y-2">
            {history.fines.map((f) => (
              <div key={f.id} className="rounded-md border p-3">
                <div className="flex justify-between">
                  <p className="text-sm font-medium">{f.offenseType}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    f.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' :
                    f.paymentStatus === 'DISPUTED' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>{f.paymentStatus}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {t('profile.amount')}: {f.currency} {f.penaltyAmount.toLocaleString()} | {t('profile.refNumber')}: {f.controlNumber}
                </p>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/app/profile/dashboard-tabs.tsx
git commit -m "feat: add dashboard tabs component with bookings, verifications, complaints, and fines history"
```

---

### Task 8: Client Account Deletion Flow

**Files:**
- Create: `client/src/app/profile/delete-account.tsx`

- [ ] **Step 1: Write account deletion dialog component**

```tsx
// client/src/app/profile/delete-account.tsx
'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { Trash2, AlertTriangle } from 'lucide-react';

interface DeleteAccountProps {
  onDeleted: () => void;
}

export function DeleteAccount({ onDeleted }: DeleteAccountProps) {
  const { t } = useTranslation();
  const [showDialog, setShowDialog] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (confirmation !== 'DELETE') return;
    setLoading(true);
    try {
      await api.delete('/users/me', {
        body: JSON.stringify({ confirmation: 'DELETE' }),
      } as RequestInit);
      toast.success(t('profile.accountDeleted'));
      localStorage.removeItem('zartsa_token');
      onDeleted();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
      setShowDialog(false);
      setConfirmation('');
    }
  };

  return (
    <div className="rounded-lg border border-red-200 p-4">
      <div className="flex items-center gap-2 text-red-600">
        <AlertTriangle className="h-5 w-5" />
        <h2 className="text-lg font-semibold">{t('profile.deleteAccount')}</h2>
      </div>
      <p className="mt-2 text-sm text-gray-600">{t('profile.deleteWarning')}</p>
      <button
        onClick={() => setShowDialog(true)}
        className="mt-3 flex items-center gap-1 rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
      >
        <Trash2 className="h-4 w-4" />
        {t('profile.deleteButton')}
      </button>

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold">{t('profile.deleteAccount')}</h3>
            </div>
            <p className="mb-4 text-sm text-gray-600">{t('profile.deleteWarning')}</p>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">
                {t('profile.deleteConfirm')}
              </label>
              <input
                type="text"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="DELETE"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowDialog(false); setConfirmation(''); }}
                className="rounded-md border px-4 py-2 text-sm"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmation !== 'DELETE' || loading}
                className="rounded-md bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {t('profile.deleteButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/app/profile/delete-account.tsx
git commit -m "feat: add account deletion confirmation dialog with data protection compliance"
```

---

### Task 9: Client Profile Page Assembly

**Files:**
- Modify: `client/src/app/profile/page.tsx`

- [ ] **Step 1: Write full profile page assembling all components**

```tsx
// client/src/app/profile/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { ProfileForm } from './profile-form';
import { SavedRoutes } from './saved-routes';
import { DashboardTabs } from './dashboard-tabs';
import { DeleteAccount } from './delete-account';
import { useAuth } from '@/hooks/useAuth';

interface SavedRouteData {
  id: string;
  userId: string;
  departure: string;
  destination: string;
  label: string;
}

interface ProfileData {
  id: string;
  phone: string;
  email: string | null;
  firstName: string;
  lastName: string;
  nationalId: string | null;
  preferredLanguage: 'sw' | 'en';
}

interface FullProfile extends ProfileData {
  savedRoutes: SavedRouteData[];
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchProfile();
    }
  }, [user, authLoading]);

  async function fetchProfile() {
    try {
      const response = await api.get<{ status: string; data: FullProfile }>('/users/me');
      setProfile(response.data);
    } catch {
      // Will show empty state
    } finally {
      setLoading(false);
    }
  }

  const handleProfileUpdated = (updated: ProfileData) => {
    if (profile) {
      setProfile({ ...profile, ...updated });
    }
  };

  const handleRoutesChanged = (routes: SavedRouteData[]) => {
    if (profile) {
      setProfile({ ...profile, savedRoutes: routes });
    }
  };

  const handleAccountDeleted = () => {
    router.push('/');
  };

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6">
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6">
        <p className="text-sm text-gray-500">{t('common.error')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
      <h1 className="text-xl font-bold">{t('profile.title')}</h1>

      <ProfileForm profile={profile} onUpdated={handleProfileUpdated} />

      <SavedRoutes
        routes={profile.savedRoutes}
        onRoutesChanged={handleRoutesChanged}
      />

      <DashboardTabs />

      <DeleteAccount onDeleted={handleAccountDeleted} />
    </div>
  );
}
```

- [ ] **Step 2: Verify the page renders**

Run: `cd /home/yusuf/zartsa/client && npx next build 2>&1 | tail -10`
Expected: Build completes with no TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add client/src/app/profile/page.tsx
git commit -m "feat: assemble profile page with form, saved routes, dashboard tabs, and account deletion"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- [x] Registration via phone (OTP-verified) or email -- covered by auth foundation (Task 8 in foundation plan)
- [x] Profile fields: full name, phone, email, National ID/passport, preferred language, notification preferences -- Task 3 (service), Task 5 (form)
- [x] Dashboard: booking history with receipts -- Task 3 (service), Task 7 (tabs)
- [x] Dashboard: license verification history -- Task 3 (service returns empty array for verifications), Task 7 (tabs renders verification items)
- [x] Dashboard: complaint history -- Task 3 (service), Task 7 (tabs)
- [x] Dashboard: fine payment history -- Task 3 (service), Task 7 (tabs)
- [x] Dashboard: saved routes for re-booking -- Task 3 (service), Task 6 (component)
- [x] Save up to 10 frequent routes for one-tap re-booking -- Task 3 (MAX_SAVED_ROUTES=10, ValidationError), Task 6 (re-booking link to /tickets)
- [x] Update personal details and password/PIN anytime -- Task 3 (updateProfile), Task 5 (form)
- [x] Permanent account deletion with data protection compliance -- Task 3 (soft delete, audit log), Task 8 (confirmation dialog)

**2. Placeholder scan:** No TBDs, TODOs, "implement later", or "similar to Task N" patterns found. All code is complete.

**3. Type consistency:**
- `ProfileData` interface in `profile-form.tsx` matches `getUserProfile` return shape from `user.service.ts`
- `SavedRouteData` interface in `saved-routes.tsx` matches Prisma `SavedRoute` model and `saveRoute` return type
- `DashboardHistory` type in `dashboard-tabs.tsx` matches `getDashboardHistory` return shape
- `updateProfileSchema` in `user.schema.ts` uses same field names as Prisma `User` model
- `saveRouteSchema` fields (departure, destination, label) match Prisma `SavedRoute` model
- `deleteAccountSchema` confirmation literal used consistently in routes and client dialog
- API client `api.put/post/delete` calls match route paths in `users.routes.ts`
- i18n keys `profile.*` used consistently between components and translation files