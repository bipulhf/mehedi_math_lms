# Genex

A full-stack Learning Management System (LMS) monorepo for **genex.com.bd**, built with **Bun**, **Turborepo**, **TanStack Start**, **Hono**, **Drizzle ORM**, and **React Native / Expo**.

This repository contains the web app, API, mobile app, shared packages, database layer, and internal tooling for the platform.

## Overview

Genex is designed as a modern multi-platform LMS focused on:

- course publishing and structured learning content
- user authentication and role-based access
- enrollments and payments
- progress tracking
- comments, notices, messaging, and notifications
- admin operations and analytics
- web and mobile client experiences

The implementation follows the product/build plan in `PLAN.md` and the design direction described in `DESIGN.md`.

## Monorepo Architecture

This project is organized as a Turborepo workspace with Bun as the package manager/runtime.

### Apps

- `apps/web` — TanStack Start web frontend
- `apps/api` — Hono API backend running on Bun
- `apps/mobile` — React Native mobile app with Expo

### Packages

- `packages/auth` — authentication setup and auth utilities
- `packages/config` — shared configuration utilities
- `packages/db` — Drizzle schema, DB client, and migration config
- `packages/shared` — shared validators, types, and cross-app contracts

### Tooling

- `tooling/scripts` — internal scripts such as database seeding

## Tech Stack

### Core

- **Bun** for package management and runtime
- **Turborepo** for workspace orchestration
- **TypeScript** across the monorepo

### Frontend

- **TanStack Start**
- **React**
- **Vite**
- **Tailwind CSS**
- **Radix UI**
- **Zod**

### Backend

- **Hono**
- **Better Auth**
- **Drizzle ORM**
- **PostgreSQL**
- **Redis / BullMQ** (optional — see "Running without Redis")
- **Firebase Admin**
- **AWS S3**
- **Nodemailer / SMTP** (password-reset mail — set `SMTP_HOST` and `SMTP_FROM`, or the reset fails loudly)

### Mobile

- **Expo**
- **React Native**
- **Expo Router**

## Current Domain Model

Based on the current schema and route structure, the platform includes support for:

- users and authentication
- categories
- courses
- chapters
- lectures
- tests and questions
- comments
- enrollments
- reviews
- payments
- notices
- messages
- notifications
- uploads
- bug reports
- SMS
- admin dashboards and analytics

## Repository Structure

```text
genex/
├── apps/
│   ├── api/         (Dockerfile)
│   ├── mobile/
│   └── web/         (Dockerfile)
├── packages/
│   ├── auth/
│   ├── config/
│   ├── db/
│   └── shared/
├── tooling/
│   └── scripts/
├── docker-compose.yml
├── .env.example         (host dev)
├── .env.docker.example  (docker compose)
├── DESIGN.md
├── PLAN.md
├── package.json
└── turbo.json
```

## Prerequisites

Before running the project locally, make sure you have:

- **Bun** `1.3.11` or compatible
- **Node.js** available where needed by ecosystem tools
- **PostgreSQL**
- **Redis** — optional; see "Running without Redis" below
- mobile tooling if you want to run the Expo app

## Getting Started

### 1. Install dependencies

From the repository root:

```bash
bun install
```

### 2. Configure environment variables

Create a local `.env` file in the repository root by copying `.env.example` and filling in your actual values. (Running via Docker instead? Use `.env.docker.example` — see [Running with Docker](#running-with-docker).)

Typical services used by this repo include:

- PostgreSQL
- Better Auth
- Redis
- AWS S3
- Firebase
- payment provider credentials
- SMS provider credentials
- an SMTP relay (`SMTP_*`) — without it "forgot password" cannot send its link

### 3. Generate and apply database changes

```bash
bun run db:generate
bun run db:migrate
```

### 4. Seed the database

```bash
bun run db:seed
```

## Development

### Run everything in parallel

```bash
bun run dev
```

This uses Turborepo to start all package/app development tasks that define a `dev` script.

## Running with Docker

The whole stack (Postgres, Redis, API, web, and all four background workers)
runs from a single `docker-compose.yml` in the repository root — no local
Bun/Postgres/Redis install needed. Redis and the workers sit behind a compose
profile, so a deployment without them is a two-line change in `.env` — see
"Running without Redis" below.

### 1. Configure environment variables

```bash
cp .env.docker.example .env
```

Fill in the `replace-me` values — at minimum `BETTER_AUTH_SECRET` and either
S3 (`AWS_*`) or `UPLOADTHING_TOKEN` credentials, since the API container
refuses to start without a working storage provider. Everything else is
feature-gated and can stay as `replace-me` until you need that integration.

### 2. Build and start

```bash
docker compose up --build
```

This starts Postgres and Redis, waits for Postgres to be healthy, runs
migrations, runs the idempotent admin bootstrap (`ADMIN_EMAIL`/
`ADMIN_PASSWORD`), then starts the API, the web app, and the four workers
(notification, SMS, file-processing, audit-log-cleanup).

`apps/web/server.ts` serves the client build and forwards `/api/v1` and
`/api/health` to the API, the way Vite's dev proxy does — WebSocket upgrades
included. Point it somewhere other than `http://localhost:3001` with
`API_PROXY_TARGET`. A build that bakes an absolute `VITE_API_BASE_URL` has the
browser call the API directly and never uses the proxy; that origin then has to
appear in `CORS_ORIGINS`, since the session travels as a cookie.

### Running without Redis

Redis is optional. Set `REDIS_ENABLED="false"` and clear `COMPOSE_PROFILES` in
`.env`, and `docker compose up -d` starts five services instead of ten — no
Redis container and no workers. Running the apps directly on the host needs only
the `REDIS_ENABLED` line.

What changes when it is off:

- Caches always miss, so pages hit the database. The homepage keeps a
  five-minute snapshot in the API process.
- The rate limiter counts in the API process rather than in Redis.
- Background work — SMS broadcasts, push notifications, video metadata — runs in
  the API process after the response instead of in a worker. It is not durable:
  if the process restarts mid-send, the SMS batch stays `QUEUED` and can be
  resent.
- Realtime messages and notifications are delivered by the process holding the
  socket, **so exactly one API process is supported**. Two would mean one
  reader never sees the other's message.
- The audit log is pruned by the API daily rather than by the cleanup worker.

`GET /api/health` reports which mode a running deployment is in. The reasoning
is in `docs/adr/0015-redis-is-optional.md`; read it before switching an existing
Redis off, because any SMS batch still sitting in the queue will not be sent.

- Web: `http://localhost:3000`
- API: `http://localhost:3001`

### 3. Subsequent runs

```bash
docker compose up
```

Add `--build` again whenever you change a `Dockerfile`, `bun.lock`, or any
`VITE_*` variable (those are baked into the web image at build time — see
`apps/web/Dockerfile`). Everything else in `.env` is read at container
start, so a plain `docker compose up` (or `restart`) picks it up.

### Notes

- `.env.docker.example` differs from `.env.example` only in host names —
  services talk to each other as `postgres`/`redis`/`api` on the Docker
  network rather than `localhost`. `docker-compose.yml` overrides
  `DATABASE_URL`, `REDIS_URL`, and the SSR-side `VITE_SSR_API_BASE_URL`
  itself either way, so those three values in `.env` aren't actually load-bearing for the compose path — only kept there for consistency if you inspect the file.
- There's no bundled self-hosted object storage (e.g. MinIO) — a real S3
  bucket or UploadThing token is required.
- To reset the database: `docker compose down -v` (this deletes the
  `postgres-data` volume).

## App-Specific Commands

### Web app

Run the web frontend:

```bash
cd apps/web
bun run dev
```

Default local URL:

- `http://localhost:3000`

### API

Run the API backend:

```bash
cd apps/api
bun run dev
```

Default API port:

- `http://localhost:3001`

### Mobile app

Run the Expo mobile app:

```bash
cd apps/mobile
bun run start
```

Platform-specific commands:

```bash
bun run android
bun run ios
bun run web
```

## Database Commands

From the repository root:

### Generate migrations

```bash
bun run db:generate
```

### Run migrations

```bash
bun run db:migrate
```

### Seed data

```bash
bun run db:seed
```

## Quality Commands

From the repository root:

### Build everything

```bash
bun run build
```

### Lint everything

```bash
bun run lint
```

### Typecheck everything

```bash
bun run typecheck
```

## Package Notes

### `apps/api`

The API uses:

- Hono routing
- Better Auth integration
- Redis-backed queues
- WebSocket endpoints for messaging and notifications
- shared validators and contracts from `packages/shared`

### `apps/web`

The web app uses:

- TanStack Start
- Vite
- shared auth and shared validation/types
- proxy-friendly local development against the API on port `3001`

### `packages/db`

The database package contains:

- Drizzle schema definitions
- relations
- DB client setup
- migration configuration

### `packages/shared`

The shared package includes:

- Zod validators
- shared request/response shapes
- common app-level types

## Development Workflow

A typical local workflow looks like this:

1. install dependencies with `bun install`
2. create and fill the root `.env`
3. start PostgreSQL, and Redis if `REDIS_ENABLED=true`
4. run migrations
5. seed the database
6. start the API
7. start the web app
8. start the mobile app if needed

## Project Status

This repository follows a phased implementation plan documented in `PLAN.md`.

The plan describes a multi-phase build of the platform covering:

- monorepo foundation
- database schema
- backend core
- authentication
- frontend foundation
- LMS features
- messaging, notifications, payments, uploads, admin tooling, and more

Refer to `PLAN.md` for the detailed roadmap and implementation phases.

## Design Reference

UI and product design direction are documented in:

- `DESIGN.md`

## Root Scripts

The root `package.json` currently provides:

- `bun run dev`
- `bun run build`
- `bun run lint`
- `bun run typecheck`
- `bun run db:generate`
- `bun run db:migrate`
- `bun run db:seed`

## Notes

- Environment variables are expected from the repository root `.env`
- The API is intended to run on port `3001`
- The web app is intended to run on port `3000`
- Some integrations require valid third-party credentials before they can be used fully

## License

This repository is private and intended for internal/product development use unless stated otherwise.

## Linux: file watcher limits

The dev servers watch the workspace packages as source, so a package edit
hot-reloads. On Linux each watched file costs an inotify watch, and the
per-user ceilings are low by default — `bun run dev` can die with:

```
Error: ENOSPC: System limit for number of file watchers reached
```

Raise both ceilings (needs root, survives reboot):

```bash
echo 'fs.inotify.max_user_watches=524288'  | sudo tee /etc/sysctl.d/60-inotify.conf
echo 'fs.inotify.max_user_instances=1024' | sudo tee -a /etc/sysctl.d/60-inotify.conf
sudo sysctl --system
```

Before reaching for that, check what is already holding watches. `watchman`
(started by Expo) and editor indexers routinely hold tens of thousands:

```bash
cat /proc/sys/fs/inotify/max_user_watches
watchman shutdown-server   # if you are not running the mobile app
```

Running only the workspaces you need also helps:

```bash
bun run dev --filter=@genex/web --filter=@genex/api
```
