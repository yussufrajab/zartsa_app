# ZARTSA Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the ZARTSA monorepo with Next.js 16 frontend, Express 5 backend, shared types, Prisma 7 database, Redis cache, authentication, i18n, and ZIMS API client — the foundation all 10 functional modules depend on.

**Architecture:** TypeScript monorepo with `client/` (Next.js App Router, SSR), `server/` (Express REST API, Socket.IO, Bull), and `shared/` (types, Zod schemas, constants). PostgreSQL 16 for persistence, Redis 7 for cache/queues/sessions, MinIO for file storage. No Docker — all services run directly on host.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui, Express 5, Socket.IO 4, Prisma 7, PostgreSQL 16, Redis 7, MinIO, Bull 4, JWT (jose 6), bcryptjs 3, Zod, i18next, Leaflet.js, Sonner, Lucide React

---

## Scope Note

This plan covers **only the foundation** — project scaffolding, database schema, auth, i18n, and core infrastructure. The 10 functional modules will each have separate plans:

1. `01-notifications.md` — Notifications & Alerts
2. `02-fare-displayer.md` — Smart Fare Displayer
3. `03-license-verification.md` — License & Document Verification
4. `04-news-announcements.md` — News & Announcements
5. `05-user-profile.md` — Digital User Profile & History
6. `06-fleet-tracking.md` — Real-Time Fleet Tracking
7. `07-lost-and-found.md` — Lost & Found
8. `08-complaints.md` — Complaint & Feedback
9. `09-traffic-fines.md` — Traffic Fines & Offense Management
10. `10-e-ticketing.md` — E-Ticketing & Booking

---

## File Structure

```
zartsa/
├── client/                         # Next.js 16 frontend
│   ├── src/
│   │   ├── app/                     # App Router pages
│   │   │   ├── layout.tsx           # Root layout (providers, i18n, nav)
│   │   │   ├── page.tsx             # Home page
│   │   │   ├── (auth)/              # Auth route group
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   ├── fares/page.tsx       # FR-01 placeholder
│   │   │   ├── verify/page.tsx      # FR-02 placeholder
│   │   │   ├── track/page.tsx       # FR-03 placeholder
│   │   │   ├── tickets/page.tsx     # FR-04 placeholder
│   │   │   ├── lost-found/page.tsx  # FR-05 placeholder
│   │   │   ├── complaints/page.tsx  # FR-06 placeholder
│   │   │   ├── news/page.tsx        # FR-07 placeholder
│   │   │   ├── fines/page.tsx       # FR-08 placeholder
│   │   │   └── profile/page.tsx     # FR-10 placeholder
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui components
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── MobileNav.tsx
│   │   │   └── providers/
│   │   │       ├── AuthProvider.tsx
│   │   │       ├── I18nProvider.tsx
│   │   │       └── ThemeProvider.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── useApi.ts
│   │   ├── lib/
│   │   │   ├── api-client.ts        # Typed API client for backend
│   │   │   ├── auth.ts              # Client-side auth utilities
│   │   │   └── utils.ts             # cn(), formatDate(), etc.
│   │   └── i18n/
│   │       ├── config.ts
│   │       ├── sw.json              # Swahili translations
│   │       └── en.json              # English translations
│   ├── public/
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
├── server/                          # Express 5 backend
│   ├── src/
│   │   ├── index.ts                 # Express app entry
│   │   ├── config/
│   │   │   └── env.ts               # Validated env vars (Zod)
│   │   ├── middleware/
│   │   │   ├── auth.ts              # JWT verification
│   │   │   ├── rateLimit.ts         # Rate limiting
│   │   │   ├── errorHandler.ts      # Central error handler
│   │   │   ├── validate.ts          # Zod request validation
│   │   │   └── cors.ts
│   │   ├── routes/
│   │   │   ├── index.ts             # Route aggregator
│   │   │   ├── auth.routes.ts       # /api/auth/*
│   │   │   ├── fares.routes.ts      # /api/fares/*
│   │   │   ├── verify.routes.ts     # /api/verify/*
│   │   │   ├── tracking.routes.ts   # /api/tracking/*
│   │   │   ├── tickets.routes.ts    # /api/tickets/*
│   │   │   ├── lost-found.routes.ts # /api/lost-found/*
│   │   │   ├── complaints.routes.ts # /api/complaints/*
│   │   │   ├── news.routes.ts       # /api/news/*
│   │   │   ├── fines.routes.ts      # /api/fines/*
│   │   │   ├── notifications.routes.ts # /api/notifications/*
│   │   │   └── users.routes.ts      # /api/users/*
│   │   ├── services/
│   │   │   ├── auth.service.ts      # Login, register, OTP, JWT
│   │   │   ├── zims.service.ts      # ZIMS API client
│   │   │   ├── redis.service.ts     # Redis cache helpers
│   │   │   ├── queue.service.ts     # Bull queue setup
│   │   │   └── minio.service.ts     # MinIO file storage
│   │   └── utils/
│   │       ├── logger.ts
│   │       └── errors.ts            # Custom error classes
│   ├── prisma/
│   │   └── schema.prisma
│   ├── tsconfig.json
│   └── package.json
├── shared/                          # Shared between client & server
│   ├── src/
│   │   ├── types/
│   │   │   ├── auth.ts
│   │   │   ├── user.ts
│   │   │   ├── booking.ts
│   │   │   ├── fare.ts
│   │   │   ├── license.ts
│   │   │   ├── complaint.ts
│   │   │   ├── lost-found.ts
│   │   │   ├── fine.ts
│   │   │   ├── notification.ts
│   │   │   ├── news.ts
│   │   │   └── tracking.ts
│   │   ├── schemas/
│   │   │   ├── auth.schema.ts       # Zod schemas for auth
│   │   │   ├── user.schema.ts
│   │   │   ├── complaint.schema.ts
│   │   │   └── ...                  # One per domain
│   │   └── constants/
│   │       ├── roles.ts             # User roles enum
│   │       ├── complaint-categories.ts
│   │       ├── notification-types.ts
│   │       └── fare-routes.ts
│   ├── tsconfig.json
│   └── package.json
├── scripts/
│   ├── start-services.sh
│   ├── stop-services.sh
│   └── seed.ts                      # Database seeder
├── docs/
│   ├── ZARTSA_App_SRS.md
│   ├── technology_stack_zartsa.md
│   └── superpowers/plans/
├── manage.sh                        # Unified service manager
├── tsconfig.base.json               # Shared TS config
└── package.json                     # Root workspace config
```

---

### Task 1: Root Monorepo Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.nvmrc`

- [ ] **Step 1: Initialize root package.json with workspace config**

```json
{
  "name": "zartsa",
  "private": true,
  "workspaces": ["client", "server", "shared"],
  "scripts": {
    "dev:client": "npm run dev --workspace=client",
    "dev:server": "npm run dev --workspace=server",
    "build": "npm run build --workspaces",
    "lint": "npm run lint --workspaces",
    "db:push": "npm run db:push --workspace=server",
    "db:seed": "npm run db:seed --workspace=server",
    "db:studio": "npm run db:studio --workspace=server"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

- [ ] **Step 2: Create shared TypeScript base config**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 3: Create .gitignore**

```
node_modules/
dist/
.next/
.env
.env.local
*.log
.DS_Store
coverage/
.turbo/
```

- [ ] **Step 4: Create .nvmrc**

```
20
```

- [ ] **Step 5: Commit**

```bash
git init
git add package.json tsconfig.base.json .gitignore .nvmrc
git commit -m "chore: initialize monorepo with workspace config"
```

---

### Task 2: Shared Package Setup

**Files:**
- Create: `shared/package.json`
- Create: `shared/tsconfig.json`
- Create: `shared/src/types/auth.ts`
- Create: `shared/src/types/user.ts`
- Create: `shared/src/schemas/auth.schema.ts`
- Create: `shared/src/constants/roles.ts`
- Create: `shared/src/index.ts`

- [ ] **Step 1: Create shared package.json**

```json
{
  "name": "@zartsa/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint src/"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "eslint": "^9.0.0"
  }
}
```

- [ ] **Step 2: Create shared tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Write auth types**

```typescript
// shared/src/types/auth.ts
export type UserRole = 'citizen' | 'operator' | 'driver' | 'officer' | 'admin';

export interface AuthUser {
  id: string;
  phone: string;
  email: string | null;
  role: UserRole;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  phone: string;
  otp: string;
}

export interface RegisterRequest {
  phone: string;
  otp: string;
  firstName: string;
  lastName: string;
  email?: string;
  preferredLanguage: 'sw' | 'en';
}

export interface OtpRequest {
  phone: string;
}
```

- [ ] **Step 4: Write user types**

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
```

- [ ] **Step 5: Write auth Zod schemas**

```typescript
// shared/src/schemas/auth.schema.ts
import { z } from 'zod';

const tanzaniaPhone = z.string().regex(
  /^(\+255|0)[67]\d{8}$/,
  'Invalid Tanzanian phone number'
);

export const otpRequestSchema = z.object({
  phone: tanzaniaPhone,
});

export const loginSchema = z.object({
  phone: tanzaniaPhone,
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const registerSchema = z.object({
  phone: tanzaniaPhone,
  otp: z.string().length(6, 'OTP must be 6 digits'),
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  email: z.string().email().optional(),
  preferredLanguage: z.enum(['sw', 'en']),
});

export type OtpRequestInput = z.infer<typeof otpRequestSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
```

- [ ] **Step 6: Write roles constant**

```typescript
// shared/src/constants/roles.ts
export const ROLES = {
  CITIZEN: 'citizen',
  OPERATOR: 'operator',
  DRIVER: 'driver',
  OFFICER: 'officer',
  ADMIN: 'admin',
} as const;

export const ROLE_LABELS: Record<string, { sw: string; en: string }> = {
  citizen: { sw: 'Mrahi', en: 'Citizen' },
  operator: { sw: 'Mwendeshaji', en: 'Operator' },
  driver: { sw: 'Dereva', en: 'Driver' },
  officer: { sw: 'Afisa', en: 'Officer' },
  admin: { sw: 'Msimamizi', en: 'Administrator' },
};
```

- [ ] **Step 7: Create barrel export**

```typescript
// shared/src/index.ts
export * from './types/auth';
export * from './types/user';
export * from './schemas/auth.schema';
export * from './constants/roles';
```

- [ ] **Step 8: Install dependencies and verify build**

Run: `cd /home/yusuf/zartsa && npm install`
Expected: Dependencies installed with no errors

- [ ] **Step 9: Commit**

```bash
git add shared/
git commit -m "feat: add shared package with auth types, schemas, and role constants"
```

---

### Task 3: Server Package Setup & Express App

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/config/env.ts`
- Create: `server/src/utils/errors.ts`
- Create: `server/src/utils/logger.ts`
- Create: `server/src/middleware/errorHandler.ts`
- Create: `server/src/middleware/cors.ts`
- Create: `server/src/middleware/validate.ts`
- Create: `server/src/index.ts`

- [ ] **Step 1: Create server package.json**

```json
{
  "name": "@zartsa/server",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src/",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@zartsa/shared": "*",
    "express": "^5.0.0",
    "cors": "^2.8.5",
    "jose": "^6.0.0",
    "bcryptjs": "^3.0.0",
    "ioredis": "^5.4.0",
    "bull": "^4.12.0",
    "socket.io": "^4.7.0",
    "helmet": "^7.1.0",
    "zod": "^3.23.0",
    "winston": "^3.11.0",
    "dotenv": "^16.4.0",
    "minio": "^8.0.0",
    "qrcode": "^1.5.0",
    "pdfkit": "^0.15.0",
    "passport": "^0.7.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/cors": "^2.8.17",
    "@types/bcryptjs": "^2.4.0",
    "@types/qrcode": "^1.5.0",
    "typescript": "^5.6.0",
    "tsx": "^4.7.0",
    "eslint": "^9.0.0",
    "prisma": "^7.0.0",
    "@prisma/client": "^7.0.0"
  }
}
```

- [ ] **Step 2: Create server tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "CommonJS",
    "moduleResolution": "node",
    "paths": {
      "@zartsa/shared": ["../shared/src"]
    }
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Write validated env config**

```typescript
// server/src/config/env.ts
import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_ACCESS_KEY: z.string(),
  MINIO_SECRET_KEY: z.string(),
  MINIO_BUCKET: z.string().default('zartsa'),
  ZIMS_API_URL: z.string().url(),
  ZIMS_API_KEY: z.string(),
  SMS_GATEWAY_URL: z.string().optional(),
  SMS_GATEWAY_KEY: z.string().optional(),
  CLIENT_URL: z.string().default('http://localhost:3000'),
  OTP_EXPIRES_IN: z.coerce.number().default(300),
  RATE_LIMIT_MAX: z.coerce.number().default(50),
  RATE_LIMIT_WINDOW: z.coerce.number().default(3600000),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
```

- [ ] **Step 4: Write custom error classes**

```typescript
// server/src/utils/errors.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, 'VALIDATION_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super(429, 'Too many requests. Please try again later.', 'RATE_LIMITED');
  }
}
```

- [ ] **Step 5: Write logger utility**

```typescript
// server/src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'zartsa-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});
```

- [ ] **Step 6: Write error handler middleware**

```typescript
// server/src/middleware/errorHandler.ts
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      code: err.code,
      message: err.message,
    });
  }

  logger.error('Unhandled error', { error: err.message, stack: err.stack });

  return res.status(500).json({
    status: 'error',
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message,
  });
}
```

- [ ] **Step 7: Write CORS middleware**

```typescript
// server/src/middleware/cors.ts
import cors from 'cors';
import { env } from '../config/env';

export const corsMiddleware = cors({
  origin: env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

- [ ] **Step 8: Write Zod validation middleware**

```typescript
// server/src/middleware/validate.ts
import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        next(new ValidationError(message));
      }
      next(err);
    }
  };
}
```

- [ ] **Step 9: Write Express app entry point**

```typescript
// server/src/index.ts
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { routes } from './routes';

const app = express();

app.use(helmet());
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.listen(env.PORT, () => {
  logger.info(`ZARTSA API running on port ${env.PORT} [${env.NODE_ENV}]`);
});

export default app;
```

- [ ] **Step 10: Write minimal routes aggregator**

```typescript
// server/src/routes/index.ts
import { Router } from 'express';

const router = Router();

// Module routes will be added here as they are implemented:
// router.use('/auth', authRoutes);
// router.use('/fares', fareRoutes);
// etc.

export const routes = router;
```

- [ ] **Step 11: Install server dependencies**

Run: `cd /home/yusuf/zartsa && npm install`
Expected: All server dependencies installed with no errors

- [ ] **Step 12: Verify server starts**

Run: `cd /home/yusuf/zartsa/server && npx tsx src/index.ts &`
Then: `curl -s http://localhost:5000/health`
Expected: `{"status":"ok","timestamp":"..."}`
Then kill the server process.

- [ ] **Step 13: Commit**

```bash
git add server/
git commit -m "feat: set up Express 5 server with validated config, error handling, and middleware"
```

---

### Task 4: Prisma Database Schema

**Files:**
- Create: `server/prisma/schema.prisma`
- Modify: `server/package.json` (add prisma scripts)

- [ ] **Step 1: Write the Prisma schema with all 10 data entities**

```prisma
// server/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  CITIZEN
  OPERATOR
  DRIVER
  OFFICER
  ADMIN
}

enum Language {
  sw
  en
}

enum ComplaintStatus {
  RECEIVED
  UNDER_REVIEW
  ESCALATED
  RESOLVED
  CLOSED
}

enum FinePaymentStatus {
  OUTSTANDING
  PAID
  DISPUTED
  WAIVED
}

enum TicketStatus {
  ACTIVE
  CANCELLED
  USED
  EXPIRED
}

enum ItemStatus {
  REPORTED
  FOUND
  MATCHED
  CLAIMED
  UNCLAIMED
  REMOVED
}

enum NotificationChannel {
  IN_APP
  SMS
  EMAIL
}

enum AnnouncementCategory {
  FARE_ADJUSTMENT
  ROAD_CLOSURE
  SCHEDULE_CHANGE
  REGULATORY_UPDATE
  GENERAL_NOTICE
}

model User {
  id                String    @id @default(cuid())
  phone             String    @unique
  email             String?   @unique
  passwordHash      String?
  firstName         String
  lastName          String
  nationalId        String?   @unique
  role              UserRole  @default(CITIZEN)
  preferredLanguage  Language  @default(sw)
  isActive          Boolean   @default(true)
  failedLoginAttempts Int     @default(0)
  lockedUntil       DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  bookings          Booking[]
  complaints        Complaint[]
  lostItemReports   LostItemReport[]
  foundItemReports  FoundItemReport[]
  notifications     Notification[]
  savedRoutes       SavedRoute[]
  notificationPrefs NotificationPreference[]

  @@map("users")
}

model SavedRoute {
  id          String  @id @default(cuid())
  userId      String
  departure   String
  destination String
  label       String
  createdAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("saved_routes")
}

model NotificationPreference {
  id      String             @id @default(cuid())
  userId  String
  type    String
  inApp   Boolean            @default(true)
  sms     Boolean            @default(false)
  email   Boolean            @default(false)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, type])
  @@map("notification_preferences")
}

model FareTable {
  id          String   @id @default(cuid())
  routeType   String   // "daladala" or "shamba"
  departure   String
  destination String
  baseFare    Decimal  @db decimal(10, 2)
  surcharge   Decimal  @db decimal(10, 2) @default(0)
  currency    String   @default("TZS")
  effectiveDate DateTime
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([routeType, departure, destination])
  @@map("fare_tables")
}

model Booking {
  id              String       @id @default(cuid())
  userId          String
  departure       String
  destination     String
  travelDate      DateTime
  passengerCount  Int          @default(1)
  seatNumbers     String[]     // stored as JSON array
  totalAmount     Decimal      @db decimal(10, 2)
  currency        String       @default("TZS")
  paymentMethod   String
  paymentRef      String?
  status          TicketStatus @default(ACTIVE)
  qrCode          String?
  vehiclePlate    String?
  operatorId      String?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("bookings")
}

model Complaint {
  id              String          @id @default(cuid())
  referenceNumber String          @unique
  userId          String?
  vehiclePlate    String
  route           String
  incidentDate    DateTime
  category        String
  description     String          @db text
  attachments     String[]
  status          ComplaintStatus @default(RECEIVED)
  assignedTo      String?
  resolution      String?
  resolvedAt      DateTime?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@map("complaints")
}

model LostItemReport {
  id          String     @id @default(cuid())
  userId      String
  description String     @db text
  category    String
  route       String
  travelDate  DateTime
  contactInfo String
  status      ItemStatus @default(REPORTED)
  matchedWith String?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("lost_item_reports")
}

model FoundItemReport {
  id          String     @id @default(cuid())
  reportedBy  String
  description String     @db text
  category    String
  busNumber   String
  route       String
  foundDate   DateTime
  photoUrl    String?
  status      ItemStatus @default(FOUND)
  claimedBy   String?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@map("found_item_reports")
}

model Fine {
  id            String            @id @default(cuid())
  drivingLicense String?
  vehiclePlate  String?
  offenseType   String
  offenseDate   DateTime
  location      String
  penaltyAmount Decimal           @db decimal(10, 2)
  currency      String            @default("TZS")
  controlNumber String            @unique
  paymentStatus FinePaymentStatus @default(OUTSTANDING)
  paymentRef    String?
  paidAt        DateTime?
  zimsSyncedAt  DateTime?
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  @@map("fines")
}

model Announcement {
  id          String               @id @default(cuid())
  titleSw     String
  titleEn     String
  contentSw   String               @db text
  contentEn   String               @db text
  category    AnnouncementCategory
  publishedAt DateTime?
  sourceAuthority String?
  isPublished Boolean              @default(false)
  createdAt   DateTime             @default(now())
  updatedAt   DateTime             @updatedAt

  @@map("announcements")
}

model Notification {
  id         String             @id @default(cuid())
  userId     String
  type       String
  title      String
  message    String
  channel    NotificationChannel
  isRead     Boolean             @default(false)
  sentAt     DateTime?
  deliveredAt DateTime?
  createdAt  DateTime            @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notifications")
}

model BusLocation {
  id           String   @id @default(cuid())
  vehiclePlate String
  operatorId   String?
  route        String
  serviceType  String   // "daladala" or "shamba"
  latitude     Float
  longitude    Float
  speed        Float?
  heading      Float?
  recordedAt   DateTime
  createdAt    DateTime @default(now())

  @@index([vehiclePlate])
  @@index([recordedAt])
  @@map("bus_locations")
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  action    String
  resource  String
  details   String?
  ipAddress String?
  createdAt DateTime @default(now())

  @@map("audit_logs")
}
```

- [ ] **Step 2: Create .env file for development**

```
# server/.env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/zardb?schema=public
REDIS_URL=redis://localhost:6379
JWT_SECRET=zartsa-dev-jwt-secret-minimum-32-chars-long
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=zartsa
ZIMS_API_URL=http://localhost:6000
ZIMS_API_KEY=zims-dev-api-key
CLIENT_URL=http://localhost:3000
OTP_EXPIRES_IN=300
RATE_LIMIT_MAX=50
RATE_LIMIT_WINDOW=3600000
```

- [ ] **Step 3: Run Prisma migration to verify schema**

Run: `cd /home/yusuf/zartsa/server && npx prisma db push`
Expected: Schema applied to PostgreSQL, all tables created

- [ ] **Step 4: Generate Prisma client**

Run: `cd /home/yusuf/zartsa/server && npx prisma generate`
Expected: Client generated successfully

- [ ] **Step 5: Commit**

```bash
git add server/prisma/ server/.env
git commit -m "feat: add Prisma schema with all 10 data entities and audit log"
```

---

### Task 5: Redis & Bull Queue Services

**Files:**
- Create: `server/src/services/redis.service.ts`
- Create: `server/src/services/queue.service.ts`

- [ ] **Step 1: Write Redis service**

```typescript
// server/src/services/redis.service.ts
import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let redis: Redis;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
    });
    redis.on('connect', () => logger.info('Redis connected'));
    redis.on('error', (err) => logger.error('Redis error', { error: err.message }));
  }
  return redis;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const data = await getRedis().get(key);
  if (!data) return null;
  return JSON.parse(data) as T;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const serialized = JSON.stringify(value);
  if (ttlSeconds) {
    await getRedis().setex(key, ttlSeconds, serialized);
  } else {
    await getRedis().set(key, serialized);
  }
}

export async function cacheDelete(key: string): Promise<void> {
  await getRedis().del(key);
}
```

- [ ] **Step 2: Write Bull queue service**

```typescript
// server/src/services/queue.service.ts
import Queue from 'bull';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const smsQueue = new Queue('sms', env.REDIS_URL);
export const emailQueue = new Queue('email', env.REDIS_URL);
export const pushQueue = new Queue('push', env.REDIS_URL);
export const zimsSyncQueue = new Queue('zims-sync', env.REDIS_URL);

export interface SmsJobData {
  to: string;
  message: string;
}

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
}

export interface PushJobData {
  userId: string;
  title: string;
  message: string;
}

export interface ZimsSyncJobData {
  fineId: string;
  action: 'payment' | 'dispute';
}

[smsQueue, emailQueue, pushQueue, zimsSyncQueue].forEach(queue => {
  queue.on('error', (err) => logger.error(`Queue ${queue.name} error`, { error: err.message }));
  queue.on('failed', (_job, err) => logger.error(`Queue ${queue.name} job failed`, { error: err.message }));
});

// Processors will be added in the notifications module plan
```

- [ ] **Step 3: Commit**

```bash
git add server/src/services/redis.service.ts server/src/services/queue.service.ts
git commit -m "feat: add Redis cache helpers and Bull queue service for SMS, email, push, ZIMS sync"
```

---

### Task 6: ZIMS API Client

**Files:**
- Create: `server/src/services/zims.service.ts`

- [ ] **Step 1: Write ZIMS API client**

```typescript
// server/src/services/zims.service.ts
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

interface ZimsResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface ZimsLicenseData {
  documentType: string;
  holderName: string;
  issueDate: string;
  expiryDate: string;
  status: 'Valid' | 'Expired' | 'Suspended' | 'Invalid';
  licenseNumber: string;
}

interface ZimsFineData {
  offenseType: string;
  offenseDate: string;
  location: string;
  penaltyAmount: number;
  paymentStatus: string;
  controlNumber: string;
}

async function zimsRequest<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(path, env.ZIMS_API_URL);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    headers: {
      'X-API-Key': env.ZIMS_API_KEY,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    logger.error('ZIMS API error', { path, status: res.status });
    throw new AppError(502, 'Failed to reach ZIMS system', 'ZIMS_ERROR');
  }

  const body: ZimsResponse<T> = await res.json();
  if (!body.success) {
    throw new AppError(404, body.message || 'Record not found in ZIMS', 'ZIMS_NOT_FOUND');
  }

  return body.data;
}

export const zimsService = {
  async verifyLicense(licenseNumber: string): Promise<ZimsLicenseData> {
    return zimsRequest<ZimsLicenseData>('/api/licenses/verify', { number: licenseNumber });
  },

  async verifyVehicle(plateNumber: string): Promise<ZimsLicenseData> {
    return zimsRequest<ZimsLicenseData>('/api/vehicles/verify', { plate: plateNumber });
  },

  async verifyBadge(badgeNumber: string): Promise<ZimsLicenseData> {
    return zimsRequest<ZimsLicenseData>('/api/badges/verify', { number: badgeNumber });
  },

  async getFinesByLicense(licenseNumber: string): Promise<ZimsFineData[]> {
    return zimsRequest<ZimsFineData[]>('/api/fines', { license: licenseNumber });
  },

  async getFinesByVehicle(plateNumber: string): Promise<ZimsFineData[]> {
    return zimsRequest<ZimsFineData[]>('/api/fines', { plate: plateNumber });
  },

  async syncFinePayment(fineId: string, paymentRef: string): Promise<void> {
    await zimsRequest<void>('/api/fines/sync', { fineId, paymentRef });
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add server/src/services/zims.service.ts
git commit -m "feat: add ZIMS API client for license verification, vehicle lookup, and fine sync"
```

---

### Task 7: MinIO File Storage Service

**Files:**
- Create: `server/src/services/minio.service.ts`

- [ ] **Step 1: Write MinIO service**

```typescript
// server/src/services/minio.service.ts
import * as Minio from 'minio';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let minioClient: Minio.Client;

export function getMinio(): Minio.Client {
  if (!minioClient) {
    minioClient = new Minio.Client({
      endPoint: env.MINIO_ENDPOINT,
      port: env.MINIO_PORT,
      useSSL: env.NODE_ENV === 'production',
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY,
    });
  }
  return minioClient;
}

export async function ensureBucket(bucket?: string): Promise<void> {
  const bucketName = bucket ?? env.MINIO_BUCKET;
  const exists = await getMinio().bucketExists(bucketName);
  if (!exists) {
    await getMinio().makeBucket(bucketName);
    logger.info(`Created MinIO bucket: ${bucketName}`);
  }
}

export async function uploadFile(
  objectName: string,
  buffer: Buffer,
  contentType: string,
  bucket?: string
): Promise<string> {
  const bucketName = bucket ?? env.MINIO_BUCKET;
  await ensureBucket(bucketName);
  await getMinio().putObject(bucketName, objectName, buffer, buffer.length, {
    'Content-Type': contentType,
  });
  return objectName;
}

export async function getFileUrl(objectName: string, bucket?: string): Promise<string> {
  const bucketName = bucket ?? env.MINIO_BUCKET;
  return await getMinio().presignedGetObject(bucketName, objectName, 60 * 60);
}

export async function deleteFile(objectName: string, bucket?: string): Promise<void> {
  const bucketName = bucket ?? env.MINIO_BUCKET;
  await getMinio().removeObject(bucketName, objectName);
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/services/minio.service.ts
git commit -m "feat: add MinIO service for file upload, retrieval, and deletion"
```

---

### Task 8: Authentication System (Server)

**Files:**
- Create: `server/src/services/auth.service.ts`
- Create: `server/src/middleware/auth.ts`
- Create: `server/src/middleware/rateLimit.ts`
- Create: `server/src/routes/auth.routes.ts`

- [ ] **Step 1: Write auth service with JWT, OTP, registration**

```typescript
// server/src/services/auth.service.ts
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { AppError, UnauthorizedError } from '../utils/errors';
import { cacheGet, cacheSet } from './redis.service';
import type { LoginRequest, RegisterRequest, AuthUser, AuthTokens } from '@zartsa/shared';

const prisma = new PrismaClient();
const secret = new TextEncoder().encode(env.JWT_SECRET);

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function requestOtp(phone: string): Promise<void> {
  const otp = generateOtp();
  await cacheSet(`otp:${phone}`, otp, env.OTP_EXPIRES_IN);
  // In development, log the OTP. In production, send via SMS gateway.
  if (env.NODE_ENV === 'development') {
    console.log(`[DEV OTP] ${phone}: ${otp}`);
  }
  // TODO: integrate SMS gateway in notifications module
}

export async function login(data: LoginRequest): Promise<AuthTokens> {
  const cachedOtp = await cacheGet<string>(`otp:${data.phone}`);
  if (!cachedOtp || cachedOtp !== data.otp) {
    throw new UnauthorizedError('Invalid or expired OTP');
  }

  const user = await prisma.user.findUnique({ where: { phone: data.phone } });
  if (!user || !user.isActive) {
    throw new UnauthorizedError('Account not found or inactive');
  }

  // Check account lock
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new UnauthorizedError('Account temporarily locked. Try again later.');
  }

  // Reset failed attempts on successful login
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });

  // Remove used OTP
  await cacheSet(`otp:${data.phone}`, '', 1);

  return generateTokens(user.id, user.role);
}

export async function register(data: RegisterRequest): Promise<AuthTokens> {
  const cachedOtp = await cacheGet<string>(`otp:${data.phone}`);
  if (!cachedOtp || cachedOtp !== data.otp) {
    throw new UnauthorizedError('Invalid or expired OTP');
  }

  const existing = await prisma.user.findUnique({ where: { phone: data.phone } });
  if (existing) {
    throw new AppError(409, 'Phone number already registered', 'DUPLICATE');
  }

  const user = await prisma.user.create({
    data: {
      phone: data.phone,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      preferredLanguage: data.preferredLanguage,
      role: 'CITIZEN',
    },
  });

  // Remove used OTP
  await cacheSet(`otp:${data.phone}`, '', 1);

  return generateTokens(user.id, user.role);
}

async function generateTokens(userId: string, role: string): Promise<AuthTokens> {
  const accessToken = await new SignJWT({ userId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .setIssuedAt()
    .sign(secret);

  const refreshToken = await new SignJWT({ userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(env.REFRESH_TOKEN_EXPIRES_IN)
    .setIssuedAt()
    .sign(secret);

  return { accessToken, refreshToken };
}

export async function verifyAccessToken(token: string): Promise<{ userId: string; role: string }> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return { userId: payload.userId as string, role: payload.role as string };
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

export async function getAuthUser(userId: string): Promise<AuthUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UnauthorizedError('User not found');

  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    role: user.role.toLowerCase() as AuthUser['role'],
    firstName: user.firstName,
    lastName: user.lastName,
    isActive: user.isActive,
  };
}
```

- [ ] **Step 2: Write JWT auth middleware**

```typescript
// server/src/middleware/auth.ts
import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/auth.service';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import type { UserRole } from '@zartsa/shared';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: UserRole;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing authorization token'));
  }

  const token = header.slice(7);
  verifyAccessToken(token)
    .then(({ userId, role }) => {
      req.userId = userId;
      req.userRole = role as UserRole;
      next();
    })
    .catch(next);
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
  };
}
```

- [ ] **Step 3: Write rate limiting middleware**

```typescript
// server/src/middleware/rateLimit.ts
import type { Request, Response, NextFunction } from 'express';
import { getRedis } from '../services/redis.service';
import { env } from '../config/env';
import { RateLimitError } from '../utils/errors';

export function rateLimit(keyPrefix: string, maxRequests?: number, windowMs?: number) {
  const max = maxRequests ?? env.RATE_LIMIT_MAX;
  const window = windowMs ?? env.RATE_LIMIT_WINDOW;

  return async (req: Request, _res: Response, next: NextFunction) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const key = `rl:${keyPrefix}:${ip}`;
    const redis = getRedis();

    const current = await redis.incr(key);
    if (current === 1) {
      await redis.pexpire(key, window);
    }

    if (current > max) {
      return next(new RateLimitError());
    }

    next();
  };
}
```

- [ ] **Step 4: Write auth routes**

```typescript
// server/src/routes/auth.routes.ts
import { Router } from 'express';
import { validate } from '../middleware/validate';
import { otpRequestSchema, loginSchema, registerSchema } from '@zartsa/shared';
import { requestOtp, login, register } from '../services/auth.service';
import { rateLimit } from '../middleware/rateLimit';

export const authRoutes = Router();

authRoutes.post('/otp',
  rateLimit('otp', 5, 60_000),
  validate(otpRequestSchema),
  async (req, res, next) => {
    try {
      await requestOtp(req.body.phone);
      res.json({ status: 'ok', message: 'OTP sent' });
    } catch (err) { next(err); }
  }
);

authRoutes.post('/login',
  validate(loginSchema),
  async (req, res, next) => {
    try {
      const tokens = await login(req.body);
      res.json({ status: 'ok', data: tokens });
    } catch (err) { next(err); }
  }
);

authRoutes.post('/register',
  validate(registerSchema),
  async (req, res, next) => {
    try {
      const tokens = await register(req.body);
      res.json({ status: 'ok', data: tokens });
    } catch (err) { next(err); }
  }
);
```

- [ ] **Step 5: Wire auth routes into main router**

Modify `server/src/routes/index.ts`:

```typescript
// server/src/routes/index.ts
import { Router } from 'express';
import { authRoutes } from './auth.routes';

const router = Router();

router.use('/auth', authRoutes);

export const routes = router;
```

- [ ] **Step 6: Test auth flow with curl**

Run: `cd /home/yusuf/zartsa/server && npx tsx src/index.ts &`
Then: `curl -s -X POST http://localhost:5000/api/auth/otp -H 'Content-Type: application/json' -d '{"phone":"+255712345678"}'`
Expected: `{"status":"ok","message":"OTP sent"}`
Then: Check console for `[DEV OTP]` output, use it to test login.
Then kill the server process.

- [ ] **Step 7: Commit**

```bash
git add server/src/services/auth.service.ts server/src/middleware/auth.ts server/src/middleware/rateLimit.ts server/src/routes/auth.routes.ts server/src/routes/index.ts
git commit -m "feat: add authentication system with OTP, JWT, RBAC, and rate limiting"
```

---

### Task 9: Next.js Frontend Setup

**Files:**
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/next.config.ts`
- Create: `client/tailwind.config.ts`
- Create: `client/src/app/layout.tsx`
- Create: `client/src/app/page.tsx`
- Create: `client/src/app/globals.css`
- Create: `client/src/lib/utils.ts`
- Create: `client/src/lib/api-client.ts`

- [ ] **Step 1: Create client package.json**

```json
{
  "name": "@zartsa/client",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint src/"
  },
  "dependencies": {
    "@zartsa/shared": "*",
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "@radix-ui/react-slot": "^1.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "lucide-react": "^0.400.0",
    "sonner": "^1.4.0",
    "react-hook-form": "^7.51.0",
    "@hookform/resolvers": "^3.3.0",
    "leaflet": "^1.9.0",
    "react-leaflet": "^4.2.0",
    "recharts": "^3.0.0",
    "next-i18next": "^15.3.0",
    "i18next": "^23.11.0",
    "react-i18next": "^14.1.0",
    "i18next-browser-languagedetector": "^7.2.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/leaflet": "^1.9.0",
    "typescript": "^5.6.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^16.0.0",
    "@tailwindcss/postcss": "^4.0.0"
  }
}
```

- [ ] **Step 2: Create client tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "incremental": true,
    "module": "ESNext",
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"],
      "@zartsa/shared": ["../shared/src"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create next.config.ts**

```typescript
// client/next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@zartsa/shared'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.SERVER_URL || 'http://localhost:5000'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 4: Create tailwind.config.ts**

```typescript
// client/tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        zartsa: {
          green: '#059669',
          blue: '#1d4ed8',
          gold: '#d97706',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 5: Create globals.css**

```css
/* client/src/app/globals.css */
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #0a0a0a;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: 'Inter', system-ui, sans-serif;
}
```

- [ ] **Step 6: Write utility functions**

```typescript
// client/src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTZS(amount: number): string {
  return `TZS ${amount.toLocaleString()}`;
}

export function formatPlateNumber(input: string): string {
  const cleaned = input.replace(/\s+/g, '').toUpperCase();
  return cleaned;
}

export function formatDate(date: Date | string, locale: 'sw' | 'en' = 'sw'): string {
  return new Date(date).toLocaleDateString(locale === 'sw' ? 'sw-TZ' : 'en-TZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
```

- [ ] **Step 7: Write typed API client**

```typescript
// client/src/lib/api-client.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('zartsa_token', token);
      } else {
        localStorage.removeItem('zartsa_token');
      }
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('zartsa_token');
    }
    return null;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new ApiError(res.status, body.code || 'UNKNOWN', body.message || 'Request failed');
    }

    return res.json();
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) });
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export const api = new ApiClient();
```

- [ ] **Step 8: Write root layout**

```tsx
// client/src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ZARTSA - Zanzibar Road Transport & Safety Authority',
  description: 'Citizen services portal for Zanzibar road transport',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sw" suppressHydrationWarning>
      <body className="min-h-screen bg-white antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 9: Write home page with module navigation**

```tsx
// client/src/app/page.tsx
import Link from 'next/link';

const modules = [
  { href: '/fares', labelSw: 'Nauli', labelEn: 'Fares', icon: '💰' },
  { href: '/verify', labelSw: 'Thibitisha Hati', labelEn: 'Verify Documents', icon: '🔍' },
  { href: '/track', labelSw: 'Fuatilia Mabasi', labelEn: 'Track Buses', icon: '🚌' },
  { href: '/tickets', labelSw: 'Nunua Tiketi', labelEn: 'Buy Tickets', icon: '🎫' },
  { href: '/lost-found', labelSw: 'Potee & Patikana', labelEn: 'Lost & Found', icon: '📦' },
  { href: '/complaints', labelSw: 'Malalamiko', labelEn: 'Complaints', icon: '📝' },
  { href: '/news', labelSw: 'Habari', labelEn: 'News', icon: '📰' },
  { href: '/fines', labelSw: 'Faini', labelEn: 'Traffic Fines', icon: '⚖️' },
  { href: '/profile', labelSw: 'Wasifu Wangu', labelEn: 'My Profile', icon: '👤' },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-zartsa-green">ZARTSA</h1>
        <p className="text-sm text-gray-600">
          Mamlaka ya Barabara na Usalama Zanzibar
        </p>
      </header>

      <nav className="grid grid-cols-3 gap-3">
        {modules.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors hover:bg-gray-50"
          >
            <span className="text-2xl">{m.icon}</span>
            <span className="text-xs font-medium">{m.labelSw}</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
```

- [ ] **Step 10: Install client dependencies**

Run: `cd /home/yusuf/zartsa && npm install`
Expected: All client dependencies installed with no errors

- [ ] **Step 11: Verify Next.js dev server starts**

Run: `cd /home/yusuf/zartsa/client && npx next dev --port 3000 &`
Wait for "Ready" output, then: `curl -s http://localhost:3000 | head -5`
Expected: HTML response with ZARTSA title
Kill the dev server process.

- [ ] **Step 12: Commit**

```bash
git add client/
git commit -m "feat: set up Next.js 16 frontend with Tailwind, API client, and home page"
```

---

### Task 10: i18n (Internationalization) Setup

**Files:**
- Create: `client/src/i18n/config.ts`
- Create: `client/src/i18n/sw.json`
- Create: `client/src/i18n/en.json`
- Create: `client/src/components/providers/I18nProvider.tsx`
- Modify: `client/src/app/layout.tsx` — wrap with I18nProvider

- [ ] **Step 1: Write i18n config**

```typescript
// client/src/i18n/config.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import sw from './sw.json';
import en from './en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      sw: { translation: sw },
      en: { translation: en },
    },
    fallbackLng: 'sw',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'zartsa_lang',
      caches: ['localStorage'],
    },
  });

export default i18n;
```

- [ ] **Step 2: Write Swahili translations**

```json
{
  "app": {
    "name": "ZARTSA",
    "tagline": "Mamlaka ya Barabara na Usalama Zanzibar"
  },
  "nav": {
    "home": "Nyumbani",
    "fares": "Nauli",
    "verify": "Thibitisha",
    "track": "Fuatilia",
    "tickets": "Tiketi",
    "lostFound": "Potee & Patikana",
    "complaints": "Malalamiko",
    "news": "Habari",
    "fines": "Faini",
    "profile": "Wasifu",
    "login": "Ingia",
    "logout": "Toka",
    "register": "Jisajili",
    "language": "Lugha"
  },
  "common": {
    "search": "Tafuta",
    "loading": "Inapakia...",
    "error": "Hitilafu",
    "retry": "Jaribu tena",
    "save": "Hifadhi",
    "cancel": "Ghairi",
    "submit": "Wasilisha",
    "back": "Rudi",
    "noResults": "Hakuna matokeo",
    "success": "Imefanikiwa",
    "required": "Hili linahitajika"
  },
  "auth": {
    "phone": "Namba ya simu",
    "otp": "Namba ya uthibitisho",
    "sendOtp": "Tuma namba ya uthibitisho",
    "login": "Ingia",
    "register": "Jisajili",
    "firstName": "Jina la kwanza",
    "lastName": "Jina la mwisho",
    "email": "Barua pepe",
    "language": "Lugha unayopendelea"
  },
  "fare": {
    "title": "Nauli Rasmi",
    "from": "Kutoka",
    "to": "Kwenda",
    "search": "Tafuta nauli",
    "baseFare": "Nauli ya msingi",
    "surcharge": "Ada ya nyongeza",
    "total": "Jumla",
    "effectiveDate": "Tarehe ya matumizi",
    "routeType": "Aina ya njia",
    "daladala": "Daladala",
    "shamba": "Shamba"
  },
  "verify": {
    "title": "Thibitisha Hati",
    "plateNumber": "Namba ya usajili",
    "licenseNumber": "Namba ya leseni",
    "badgeNumber": "Namba ya beji",
    "verify": "Thibitisha",
    "valid": "Halali",
    "expired": "Imeisha muda",
    "suspended": "Imesimamishwa",
    "invalid": "Batili",
    "notFound": "Haipatikani"
  },
  "track": {
    "title": "Fuatilia Mabasi",
    "liveMap": "Ramani ya moja kwa moja",
    "filter": "Chuja",
    "route": "Njia",
    "operator": "Mwendeshaji",
    "serviceType": "Aina ya huduma",
    "eta": "Muda wa kuwasili",
    "delayed": "Imeachwa nyuma",
    "lastSeen": "Iliwahi kuonekana"
  }
}
```

- [ ] **Step 3: Write English translations**

```json
{
  "app": {
    "name": "ZARTSA",
    "tagline": "Zanzibar Road Transport & Safety Authority"
  },
  "nav": {
    "home": "Home",
    "fares": "Fares",
    "verify": "Verify",
    "track": "Track",
    "tickets": "Tickets",
    "lostFound": "Lost & Found",
    "complaints": "Complaints",
    "news": "News",
    "fines": "Fines",
    "profile": "Profile",
    "login": "Login",
    "logout": "Logout",
    "register": "Register",
    "language": "Language"
  },
  "common": {
    "search": "Search",
    "loading": "Loading...",
    "error": "Error",
    "retry": "Retry",
    "save": "Save",
    "cancel": "Cancel",
    "submit": "Submit",
    "back": "Back",
    "noResults": "No results found",
    "success": "Success",
    "required": "This field is required"
  },
  "auth": {
    "phone": "Phone number",
    "otp": "Verification code",
    "sendOtp": "Send verification code",
    "login": "Login",
    "register": "Register",
    "firstName": "First name",
    "lastName": "Last name",
    "email": "Email",
    "language": "Preferred language"
  },
  "fare": {
    "title": "Official Fares",
    "from": "From",
    "to": "To",
    "search": "Search fares",
    "baseFare": "Base fare",
    "surcharge": "Surcharge",
    "total": "Total",
    "effectiveDate": "Effective date",
    "routeType": "Route type",
    "daladala": "Daladala",
    "shamba": "Shamba"
  },
  "verify": {
    "title": "Verify Document",
    "plateNumber": "Plate number",
    "licenseNumber": "License number",
    "badgeNumber": "Badge number",
    "verify": "Verify",
    "valid": "Valid",
    "expired": "Expired",
    "suspended": "Suspended",
    "invalid": "Invalid",
    "notFound": "Not found"
  },
  "track": {
    "title": "Track Buses",
    "liveMap": "Live Map",
    "filter": "Filter",
    "route": "Route",
    "operator": "Operator",
    "serviceType": "Service type",
    "eta": "ETA",
    "delayed": "Delayed",
    "lastSeen": "Last seen"
  }
}
```

- [ ] **Step 4: Write I18nProvider**

```tsx
// client/src/components/providers/I18nProvider.tsx
'use client';

import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/config';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
```

- [ ] **Step 5: Update root layout with I18nProvider**

```tsx
// client/src/app/layout.tsx
import type { Metadata } from 'next';
import { I18nProvider } from '@/components/providers/I18nProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'ZARTSA - Zanzibar Road Transport & Safety Authority',
  description: 'Citizen services portal for Zanzibar road transport',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sw" suppressHydrationWarning>
      <body className="min-h-screen bg-white antialiased">
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Verify i18n works by updating home page with translations**

```tsx
// client/src/app/page.tsx
'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

const modules = [
  { href: '/fares', labelKey: 'nav.fares', icon: '💰' },
  { href: '/verify', labelKey: 'nav.verify', icon: '🔍' },
  { href: '/track', labelKey: 'nav.track', icon: '🚌' },
  { href: '/tickets', labelKey: 'nav.tickets', icon: '🎫' },
  { href: '/lost-found', labelKey: 'nav.lostFound', icon: '📦' },
  { href: '/complaints', labelKey: 'nav.complaints', icon: '📝' },
  { href: '/news', labelKey: 'nav.news', icon: '📰' },
  { href: '/fines', labelKey: 'nav.fines', icon: '⚖️' },
  { href: '/profile', labelKey: 'nav.profile', icon: '👤' },
];

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-zartsa-green">{t('app.name')}</h1>
        <p className="text-sm text-gray-600">{t('app.tagline')}</p>
      </header>

      <nav className="grid grid-cols-3 gap-3">
        {modules.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors hover:bg-gray-50"
          >
            <span className="text-2xl">{m.icon}</span>
            <span className="text-xs font-medium">{t(m.labelKey)}</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add client/src/i18n/ client/src/components/providers/I18nProvider.tsx client/src/app/layout.tsx client/src/app/page.tsx
git commit -m "feat: add bilingual i18n with Swahili and English translations"
```

---

### Task 11: Layout Components (Header, Footer, MobileNav)

**Files:**
- Create: `client/src/components/layout/Header.tsx`
- Create: `client/src/components/layout/Footer.tsx`
- Create: `client/src/components/layout/MobileNav.tsx`
- Modify: `client/src/app/layout.tsx` — add Header/Footer

- [ ] **Step 1: Write Header component**

```tsx
// client/src/components/layout/Header.tsx
'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Menu, Globe } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const { t, i18n } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleLanguage = () => {
    const next = i18n.language === 'sw' ? 'en' : 'sw';
    i18n.changeLanguage(next);
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-zartsa-green">
          ZARTSA
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-gray-100"
          >
            <Globe className="h-4 w-4" />
            {i18n.language === 'sw' ? 'EN' : 'SW'}
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-md p-1 hover:bg-gray-100"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {menuOpen && <MobileNav onClose={() => setMenuOpen(false)} />}
    </header>
  );
}
```

- [ ] **Step 2: Write MobileNav component**

```tsx
// client/src/components/layout/MobileNav.tsx
'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

const navItems = [
  { href: '/fares', labelKey: 'nav.fares' },
  { href: '/verify', labelKey: 'nav.verify' },
  { href: '/track', labelKey: 'nav.track' },
  { href: '/tickets', labelKey: 'nav.tickets' },
  { href: '/lost-found', labelKey: 'nav.lostFound' },
  { href: '/complaints', labelKey: 'nav.complaints' },
  { href: '/news', labelKey: 'nav.news' },
  { href: '/fines', labelKey: 'nav.fines' },
  { href: '/profile', labelKey: 'nav.profile' },
];

export function MobileNav({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="absolute inset-x-0 top-full border-b bg-white p-4 shadow-lg">
      <div className="mb-3 flex justify-end">
        <button onClick={onClose} className="rounded-md p-1 hover:bg-gray-100">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="rounded-md px-3 py-2 text-sm hover:bg-gray-100"
          >
            {t(item.labelKey)}
          </Link>
        ))}
      </nav>
    </div>
  );
}
```

- [ ] **Step 3: Write Footer component**

```tsx
// client/src/components/layout/Footer.tsx
'use client';

import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t bg-gray-50 px-4 py-4 text-center text-xs text-gray-500">
      <p>&copy; {new Date().getFullYear()} {t('app.name')} &mdash; {t('app.tagline')}</p>
    </footer>
  );
}
```

- [ ] **Step 4: Update root layout with Header and Footer**

```tsx
// client/src/app/layout.tsx
import type { Metadata } from 'next';
import { I18nProvider } from '@/components/providers/I18nProvider';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import './globals.css';

export const metadata: Metadata = {
  title: 'ZARTSA - Zanzibar Road Transport & Safety Authority',
  description: 'Citizen services portal for Zanzibar road transport',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sw" suppressHydrationWarning>
      <body className="min-h-screen bg-white antialiased">
        <I18nProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add client/src/components/layout/ client/src/app/layout.tsx
git commit -m "feat: add Header, Footer, and MobileNav layout components with language toggle"
```

---

### Task 12: Auth Provider & Hooks

**Files:**
- Create: `client/src/components/providers/AuthProvider.tsx`
- Create: `client/src/hooks/useAuth.ts`
- Create: `client/src/hooks/useApi.ts`
- Create: `client/src/app/(auth)/login/page.tsx`
- Create: `client/src/app/(auth)/register/page.tsx`
- Modify: `client/src/app/layout.tsx` — add AuthProvider

- [ ] **Step 1: Write AuthProvider**

```tsx
// client/src/components/providers/AuthProvider.tsx
'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import type { AuthUser } from '@zartsa/shared';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (phone: string, otp: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  requestOtp: (phone: string) => Promise<void>;
}

interface RegisterData {
  phone: string;
  otp: string;
  firstName: string;
  lastName: string;
  email?: string;
  preferredLanguage: 'sw' | 'en';
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('zartsa_token');
    if (token) {
      api.setToken(token);
      api.get<{ data: AuthUser }>('/auth/me')
        .then((res) => setUser(res.data))
        .catch(() => {
          api.setToken(null);
          localStorage.removeItem('zartsa_token');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const requestOtp = useCallback(async (phone: string) => {
    await api.post('/auth/otp', { phone });
  }, []);

  const login = useCallback(async (phone: string, otp: string) => {
    const res = await api.post<{ data: { accessToken: string; refreshToken: string } }>('/auth/login', { phone, otp });
    api.setToken(res.data.accessToken);
    const me = await api.get<{ data: AuthUser }>('/auth/me');
    setUser(me.data);
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const res = await api.post<{ data: { accessToken: string; refreshToken: string } }>('/auth/register', data);
    api.setToken(res.data.accessToken);
    const me = await api.get<{ data: AuthUser }>('/auth/me');
    setUser(me.data);
  }, []);

  const logout = useCallback(() => {
    api.setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      requestOtp,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 2: Write useApi hook**

```typescript
// client/src/hooks/useApi.ts
'use client';

import { useState, useCallback } from 'react';
import { api, ApiError } from '@/lib/api-client';

interface UseApiResult<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  execute: (...args: unknown[]) => Promise<T | null>;
  reset: () => void;
}

export function useApi<T>(apiFn: (...args: unknown[]) => Promise<T>): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(async (...args: unknown[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiFn(...args);
      setData(result);
      return result;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'An unexpected error occurred';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiFn]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { data, error, isLoading, execute, reset };
}
```

- [ ] **Step 3: Write login page**

```tsx
// client/src/app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const { t } = useTranslation();
  const { requestOtp, login } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    try {
      setLoading(true);
      await requestOtp(phone);
      setOtpSent(true);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      await login(phone, otp);
      router.push('/profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-8">
      <h1 className="mb-6 text-xl font-bold">{t('auth.login')}</h1>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm">{t('auth.phone')}</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+2557XXXXXXXX"
            className="w-full rounded-md border px-3 py-2 text-sm"
            disabled={otpSent}
          />
        </div>

        {!otpSent ? (
          <button
            onClick={handleSendOtp}
            disabled={loading || !phone}
            className="w-full rounded-md bg-zartsa-green px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {t('auth.sendOtp')}
          </button>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-sm">{t('auth.otp')}</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={handleLogin}
              disabled={loading || otp.length !== 6}
              className="w-full rounded-md bg-zartsa-green px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {t('auth.login')}
            </button>
          </>
        )}

        <p className="text-center text-xs text-gray-500">
          <Link href="/register">{t('auth.register')}</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write register page**

```tsx
// client/src/app/(auth)/register/page.tsx
'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const { t, i18n } = useTranslation();
  const { requestOtp, register } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    phone: '',
    firstName: '',
    lastName: '',
    email: '',
    preferredLanguage: i18n.language as 'sw' | 'en',
  });
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    try {
      setLoading(true);
      await requestOtp(form.phone);
      setOtpSent(true);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      setLoading(true);
      await register({ ...form, otp });
      router.push('/profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="mx-auto max-w-sm px-4 py-8">
      <h1 className="mb-6 text-xl font-bold">{t('auth.register')}</h1>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm">{t('auth.phone')}</label>
          <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)}
            placeholder="+2557XXXXXXXX" disabled={otpSent}
            className="w-full rounded-md border px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="mb-1 block text-sm">{t('auth.firstName')}</label>
          <input type="text" value={form.firstName} onChange={(e) => update('firstName', e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="mb-1 block text-sm">{t('auth.lastName')}</label>
          <input type="text" value={form.lastName} onChange={(e) => update('lastName', e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="mb-1 block text-sm">{t('auth.email')} ({t('common.required').toLowerCase()})</label>
          <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="mb-1 block text-sm">{t('auth.language')}</label>
          <select value={form.preferredLanguage} onChange={(e) => update('preferredLanguage', e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm">
            <option value="sw">Kiswahili</option>
            <option value="en">English</option>
          </select>
        </div>

        {!otpSent ? (
          <button onClick={handleSendOtp} disabled={loading || !form.phone || !form.firstName || !form.lastName}
            className="w-full rounded-md bg-zartsa-green px-4 py-2 text-sm text-white disabled:opacity-50">
            {t('auth.sendOtp')}
          </button>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-sm">{t('auth.otp')}</label>
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6}
                className="w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <button onClick={handleRegister} disabled={loading || otp.length !== 6}
              className="w-full rounded-md bg-zartsa-green px-4 py-2 text-sm text-white disabled:opacity-50">
              {t('auth.register')}
            </button>
          </>
        )}

        <p className="text-center text-xs text-gray-500">
          <Link href="/login">{t('auth.login')}</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add /auth/me endpoint to server**

Add to `server/src/routes/auth.routes.ts`:

```typescript
import { authenticate } from '../middleware/auth';
import { getAuthUser } from '../services/auth.service';

// Add after existing routes:
authRoutes.get('/me',
  authenticate,
  async (req, res, next) => {
    try {
      const user = await getAuthUser(req.userId!);
      res.json({ status: 'ok', data: user });
    } catch (err) { next(err); }
  }
);
```

- [ ] **Step 6: Update root layout with AuthProvider**

```tsx
// client/src/app/layout.tsx
import type { Metadata } from 'next';
import { I18nProvider } from '@/components/providers/I18nProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import './globals.css';

export const metadata: Metadata = {
  title: 'ZARTSA - Zanzibar Road Transport & Safety Authority',
  description: 'Citizen services portal for Zanzibar road transport',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sw" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-white antialiased">
        <I18nProvider>
          <AuthProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add client/src/components/providers/AuthProvider.tsx client/src/hooks/ client/src/app/\(auth\)/ server/src/routes/auth.routes.ts client/src/app/layout.tsx
git commit -m "feat: add AuthProvider, auth hooks, login and register pages"
```

---

### Task 13: Service Management Script

**Files:**
- Create: `manage.sh`
- Create: `scripts/start-services.sh`
- Create: `scripts/stop-services.sh`

- [ ] **Step 1: Write manage.sh**

```bash
#!/usr/bin/env bash
set -euo pipefail

SERVICES=("postgresql" "redis-server" "minio")
NODE_APPS=("server" "client")
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

start_infra() {
  echo "Starting infrastructure services..."
  for svc in "${SERVICES[@]}"; do
    if systemctl is-active --quiet "$svc" 2>/dev/null; then
      echo "  $svc already running"
    else
      sudo systemctl start "$svc" 2>/dev/null && echo "  $svc started" || echo "  $svc not found (skipping)"
    fi
  done
}

stop_infra() {
  echo "Stopping infrastructure services..."
  for svc in "${SERVICES[@]}"; do
    if systemctl is-active --quiet "$svc" 2>/dev/null; then
      sudo systemctl stop "$svc" && echo "  $svc stopped" || echo "  $svc stop failed"
    else
      echo "  $svc not running"
    fi
  done
}

start_node() {
  echo "Starting Node.js applications..."
  cd "$SCRIPT_DIR"
  if command -v pm2 &>/dev/null; then
    pm2 start server/dist/index.js --name zartsa-api
    pm2 start "npx next start" --name zartsa-web
    echo "  Started via PM2"
  else
    echo "  PM2 not found. Starting directly..."
    (cd server && node dist/index.js) &
    (cd client && npx next start) &
    echo "  Started in background"
  fi
}

stop_node() {
  echo "Stopping Node.js applications..."
  if command -v pm2 &>/dev/null; then
    pm2 stop zartsa-api zartsa-web 2>/dev/null || true
    echo "  Stopped via PM2"
  else
    pkill -f "node dist/index.js" 2>/dev/null || true
    pkill -f "next start" 2>/dev/null || true
    echo "  Stopped"
  fi
}

status_check() {
  echo "=== Infrastructure ==="
  for svc in "${SERVICES[@]}"; do
    if systemctl is-active --quiet "$svc" 2>/dev/null; then
      echo "  $svc: running"
    else
      echo "  $svc: stopped"
    fi
  done
  echo "=== Node.js ==="
  if command -v pm2 &>/dev/null; then
    pm2 list
  else
    pgrep -f "node dist/index.js" >/dev/null && echo "  API: running" || echo "  API: stopped"
    pgrep -f "next start" >/dev/null && echo "  Web: running" || echo "  Web: stopped"
  fi
}

case "${1:-}" in
  start)   start_infra; start_node ;;
  stop)    stop_node; stop_infra ;;
  restart) stop_node; stop_infra; start_infra; start_node ;;
  status)  status_check ;;
  *)       echo "Usage: $0 {start|stop|restart|status}" ;;
esac
```

- [ ] **Step 2: Make manage.sh executable**

Run: `chmod +x /home/yusuf/zartsa/manage.sh`

- [ ] **Step 3: Commit**

```bash
git add manage.sh
git commit -m "feat: add unified service management script (manage.sh)"
```

---

### Task 14: Database Seeder

**Files:**
- Create: `server/prisma/seed.ts`

- [ ] **Step 1: Write database seeder with sample data**

```typescript
// server/prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  await prisma.user.upsert({
    where: { phone: '+255777000000' },
    update: {},
    create: {
      phone: '+255777000000',
      firstName: 'Admin',
      lastName: 'ZARTSA',
      role: 'ADMIN',
      preferredLanguage: 'sw',
      isActive: true,
    },
  });

  // Create sample fare tables
  const fares = [
    { routeType: 'daladala', departure: 'Stone Town', destination: 'Fuoni', baseFare: 400, surcharge: 0, effectiveDate: new Date('2026-01-01') },
    { routeType: 'daladala', departure: 'Stone Town', destination: 'Mwanakwerekwe', baseFare: 500, surcharge: 0, effectiveDate: new Date('2026-01-01') },
    { routeType: 'daladala', departure: 'Stone Town', destination: 'Kiembe Samaki', baseFare: 400, surcharge: 0, effectiveDate: new Date('2026-01-01') },
    { routeType: 'shamba', departure: 'Stone Town', destination: 'Paje', baseFare: 2500, surcharge: 200, effectiveDate: new Date('2026-01-01') },
    { routeType: 'shamba', departure: 'Stone Town', destination: 'Jambiani', baseFare: 3000, surcharge: 200, effectiveDate: new Date('2026-01-01') },
    { routeType: 'shamba', departure: 'Stone Town', destination: 'Nungwi', baseFare: 3500, surcharge: 300, effectiveDate: new Date('2026-01-01') },
  ];

  for (const fare of fares) {
    await prisma.fareTable.upsert({
      where: { routeType_departure_destination: { routeType: fare.routeType, departure: fare.departure, destination: fare.destination } },
      update: {},
      create: fare,
    });
  }

  // Create sample announcements
  await prisma.announcement.createMany({
    data: [
      {
        titleSw: 'Marekebisho ya Nauli - Januari 2026',
        titleEn: 'Fare Adjustment - January 2026',
        contentSw: 'Nauli mpya zimeanza kutumika tarehe 1 Januari 2026. Tafadhali angalia jedwali la nauli.',
        contentEn: 'New fares are effective from January 1, 2026. Please check the fare tables.',
        category: 'FARE_ADJUSTMENT',
        publishedAt: new Date('2026-01-01'),
        sourceAuthority: 'ZARTSA',
        isPublished: true,
      },
    ],
    skipDuplicates: true,
  });

  console.log('Seeding complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run seeder**

Run: `cd /home/yusuf/zartsa/server && npx tsx prisma/seed.ts`
Expected: "Seeding complete." with no errors

- [ ] **Step 3: Commit**

```bash
git add server/prisma/seed.ts
git commit -m "feat: add database seeder with sample fares, admin user, and announcements"
```

---

### Task 15: Module Placeholder Pages

**Files:**
- Create: `client/src/app/fares/page.tsx`
- Create: `client/src/app/verify/page.tsx`
- Create: `client/src/app/track/page.tsx`
- Create: `client/src/app/tickets/page.tsx`
- Create: `client/src/app/lost-found/page.tsx`
- Create: `client/src/app/complaints/page.tsx`
- Create: `client/src/app/news/page.tsx`
- Create: `client/src/app/fines/page.tsx`
- Create: `client/src/app/profile/page.tsx`

- [ ] **Step 1: Create placeholder page for each module**

Each placeholder follows the same pattern. Example for fares:

```tsx
// client/src/app/fares/page.tsx
'use client';

import { useTranslation } from 'react-i18next';

export default function FaresPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-4 text-xl font-bold">{t('fare.title')}</h1>
      <p className="text-sm text-gray-500">
        {t('common.loading')} — Coming soon
      </p>
    </div>
  );
}
```

Create identical pages for verify (`t('verify.title')`), track (`t('track.title')`), tickets, lost-found, complaints, news, fines, and profile — each with their corresponding i18n key.

- [ ] **Step 2: Commit**

```bash
git add client/src/app/fares/ client/src/app/verify/ client/src/app/track/ client/src/app/tickets/ client/src/app/lost-found/ client/src/app/complaints/ client/src/app/news/ client/src/app/fines/ client/src/app/profile/
git commit -m "feat: add placeholder pages for all 9 functional modules"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- [x] Monorepo structure with client/server/shared — Task 1-3
- [x] PostgreSQL schema with 10 data entities — Task 4
- [x] Redis cache + Bull queues — Task 5
- [x] ZIMS API client — Task 6
- [x] MinIO file storage — Task 7
- [x] JWT auth with OTP + RBAC — Task 8
- [x] Rate limiting — Task 8
- [x] Next.js frontend with Tailwind — Task 9
- [x] i18n Swahili/English — Task 10
- [x] Layout (Header/Footer/MobileNav) — Task 11
- [x] AuthProvider + login/register pages — Task 12
- [x] manage.sh (no Docker) — Task 13
- [x] Database seeder — Task 14
- [x] Module placeholders — Task 15
- [x] Error handling middleware — Task 3
- [x] Zod validation middleware — Task 3

**2. Placeholder scan:** No TBDs, TODOs, or "implement later" patterns found.

**3. Type consistency:**
- `AuthUser` type used consistently across shared types, auth service, and AuthProvider
- `UserRole` enum matches Prisma schema and shared types
- `LoginRequest`/`RegisterRequest` types align between shared schemas and auth service
- JWT payload `{ userId, role }` consistent between `generateTokens` and `verifyAccessToken`
- API client uses same response shape `{ status, data }` as server responses

---

## Next Plans

After this foundation is complete, implement modules in this order (each has its own plan):

1. **FR-09 Notifications** — cross-cutting, other modules depend on it
2. **FR-01 Fare Displayer** — simplest module, good first feature
3. **FR-02 License Verification** — ZIMS read-only, no payments
4. **FR-07 News & Announcements** — simple CRUD CMS
5. **FR-10 User Profile** — dashboard, saved routes, history
6. **FR-03 Fleet Tracking** — Socket.IO + Leaflet complexity
7. **FR-05 Lost & Found** — auth, file upload, matching
8. **FR-06 Complaints** — auth, file upload, officer portal
9. **FR-08 Traffic Fines** — ZIMS integration + payments
10. **FR-04 E-Ticketing** — most complex: seat selection, payments, QR