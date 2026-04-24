# Technology Stack — Zanzibar Public Transport Management System

---

## 1. Frontend

| Layer               | Technology                        | Version / Notes                              |
|---------------------|-----------------------------------|----------------------------------------------|
| Framework           | Next.js (App Router + SSR)        | 16.x — SSR for fast first-load on 3G         |
| UI Library          | React                             | 19.x                                         |
| Language            | TypeScript                        | 5.x                                          |
| Styling             | Tailwind CSS                      | 4.x — mobile-first, responsive               |
| UI Components       | shadcn/ui (Radix UI)              | Latest                                       |
| Live Map            | Leaflet.js + OpenStreetMap tiles  | Free, open-source, no paid API key required  |
| Charts              | Recharts                          | 3.x                                          |
| Icons               | Lucide React                      | Latest                                       |
| Form Validation     | Zod + React Hook Form             | Latest                                       |
| Toast Notifications | Sonner                            | Latest                                       |
| Internationalisation| next-i18next / i18next            | Swahili (sw) + English (en)                  |

### Frontend Notes

- **Next.js SSR** dramatically improves first-load time on 3G connections common in Zanzibar. Pages are rendered server-side and sent as HTML, reducing JavaScript parse time on low-end devices.
- **Leaflet.js** with OpenStreetMap is preferred over Google Maps — it is fully open-source, self-hostable, and avoids licensing costs. It supports real-time GPS marker updates via WebSocket events from the backend.
- **Tailwind CSS** provides a responsive mobile-first layout with minimal CSS overhead — critical for users on low-bandwidth connections.
- **i18n** supports both Swahili and English with runtime language switching, persisting the user's preference in local storage.

---

## 2. Backend API

| Layer              | Technology               | Version / Notes                                      |
|--------------------|--------------------------|------------------------------------------------------|
| Runtime            | Node.js                  | 20.x LTS                                             |
| Framework          | Express.js               | 5.x — lightweight REST API layer                     |
| Language           | TypeScript               | 5.x                                                  |
| Real-time          | Socket.IO                | 4.x — WebSocket channel for live GPS bus tracking    |
| Authentication     | JWT (jose library)       | 6.x — stateless session tokens                       |
| OAuth2             | Passport.js              | OAuth2 strategy for third-party login                |
| Password Hashing   | bcryptjs                 | 3.x                                                  |
| Job Queue          | Bull (Redis-backed)      | 4.x — async SMS, email, push notifications           |
| Linting            | ESLint                   | 9.x                                                  |

### Backend Notes

- **Node.js + Express** handles concurrent connections efficiently — important for real-time features like GPS tracking and simultaneous booking requests. Express is minimal and highly composable, fitting the modular architecture of this project.
- **Socket.IO** powers the real-time WebSocket channel that pushes GPS bus location updates to the Leaflet.js map on the frontend without polling.
- **Bull** processes background jobs (SMS, email, push notifications) asynchronously so they never block the API response cycle. It uses Redis as its queue store.
- **JWT** tokens keep authentication stateless and scalable across multiple Node processes without a shared session store (Redis still caches user session metadata for fast lookup).

---

## 3. Data Layer

| Component      | Technology                        | Version / Notes                                       |
|----------------|-----------------------------------|-------------------------------------------------------|
| Primary DB     | PostgreSQL                        | 16.x — relational data: users, bookings, complaints, fines |
| In-memory Cache| Redis                             | 7.x — sessions, fare cache, real-time data, Bull queues|
| ORM            | Prisma (with `@prisma/adapter-pg`)| 7.x — schema management + type-safe queries           |
| File Storage   | MinIO (S3-compatible)             | Self-hosted — complaint photos, ticket PDFs           |

### Database Configuration

| Parameter         | Value                                                              |
|-------------------|--------------------------------------------------------------------|
| DBMS              | PostgreSQL                                                         |
| Host              | localhost                                                          |
| Port              | 5432                                                               |
| Database Name     | zardb                                                              |
| Username          | `postgres`                                                         |
| Password          | `postgres`                                                         |
| Schema            | `public`                                                           |
| Connection String | `postgresql://postgres:postgres@localhost:5432/zardb?schema=public`|

### Data Layer Notes

- **PostgreSQL** handles all structured relational data — bookings, complaints, fines, routes, user accounts. It supports complex queries, foreign key constraints, and ACID transactions critical for financial records.
- **Redis** serves three roles: (1) fast fare-table cache to reduce DB reads on high-traffic booking requests, (2) user session metadata lookup, (3) Bull job queue backing store. Data stored in Redis is always treated as ephemeral and reconstructable from PostgreSQL.
- **Prisma** provides type-safe database access and handles schema migrations. The `PrismaPg` driver adapter connects directly via `{ connectionString }` — no `pg.Pool` instance required in Prisma 7.x.
- **MinIO** is self-hosted S3-compatible object storage for complaint attachments and generated ticket PDFs. Self-hosting satisfies Tanzania data residency requirements — no data leaves the local infrastructure.



**Docker is NOT used in this project.** All services run directly on the host OS. A management shell script (`manage.sh`) handles start, stop, and restart of all services (PostgreSQL, Redis, MinIO, Node/Express API, Next.js frontend, Nginx) without any containerisation

---

## 4. Infrastructure  (not now - until we go to live server)

| Component      | Technology       | Notes                                          |
|----------------|------------------|------------------------------------------------|
| Reverse Proxy  | Nginx            | SSL termination, static file serving, proxying |
| Process Manager| PM2              | Node.js process management, auto-restart       |
| Service Scripts| Bash (.sh)       | Unified start / stop / restart for all services|

> ⚠️ **Docker is NOT used in this project.** All services run directly on the host OS. A management shell script (`manage.sh`) handles start, stop, and restart of all services (PostgreSQL, Redis, MinIO, Node/Express API, Next.js frontend, Nginx) without any containerisation.

### Example `manage.sh` structure

```bash
#!/bin/bash
# manage.sh — start | stop | restart | status

case "$1" in
  start)
    sudo systemctl start postgresql redis-server nginx
    pm2 start ecosystem.config.js
    ;;
  stop)
    pm2 stop all
    sudo systemctl stop nginx redis-server postgresql
    ;;
  restart)
    pm2 restart all
    sudo systemctl restart nginx redis-server postgresql
    ;;
  status)
    pm2 status
    sudo systemctl status postgresql redis-server nginx
    ;;
  *)
    echo "Usage: ./manage.sh {start|stop|restart|status}"
    exit 1
    ;;
esac
```

---

## 5. External Integrations

| Integration    | Protocol   | Purpose                                          |
|----------------|------------|--------------------------------------------------|
| ZIMS API       | REST (HTTPS)| Zanzibar Identity and civil registration lookup |
| SMS Gateway    | REST (HTTPS)| Outbound SMS for ticket confirmation, alerts     |
| Fleet GPS API  | REST / WebSocket | Live vehicle location feeds                |
| QR / PDF Engine| Internal   | Ticket QR code generation and PDF rendering      |

---

## 6. Language Choice — TypeScript Everywhere

TypeScript is used across **both** the Next.js frontend and the Express backend. This provides:

- Compile-time error detection before deployment
- Shared type definitions between frontend and backend (e.g. booking DTOs, GPS event payloads)
- Safer integration code for ZIMS, SMS Gateway, and GPS API responses
- Easier onboarding for new developers joining the team

---

## 7. Full Stack Summary

```
┌─────────────────────────────────────┐
│         Next.js Frontend (SSR)      │
│  React · Tailwind · Leaflet · i18n  │
└────────────────┬────────────────────┘
                 │ HTTPS / WebSocket
┌────────────────▼────────────────────┐
│       Express.js REST API           │
│  Socket.IO · JWT · Bull · Prisma    │
└──────┬─────────────────┬────────────┘
       │                 │
┌──────▼──────┐   ┌──────▼──────┐
│ PostgreSQL  │   │    Redis    │
│  (primary)  │   │  (cache +   │
│             │   │   queues)   │
└─────────────┘   └─────────────┘
       │
┌──────▼──────┐
│    MinIO    │
│ (files/PDFs)│
└─────────────┘
       │
┌──────▼──────────────────────────────┐
│             Nginx                   │
│  Reverse proxy · SSL · Static files │
└─────────────────────────────────────┘
```
