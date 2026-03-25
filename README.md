# Mehedi's Math Academy

A full-stack Learning Management System (LMS) monorepo for **mehedismathacademy.com**, built with **Bun**, **Turborepo**, **TanStack Start**, **Hono**, **Drizzle ORM**, and **React Native / Expo**.

This repository contains the web app, API, mobile app, shared packages, database layer, and internal tooling for the platform.

## Overview

Mehedi's Math Academy is designed as a modern multi-platform LMS focused on:

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
- **Redis / BullMQ**
- **Firebase Admin**
- **AWS S3**

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
mehedi_math_academy/
├── apps/
│   ├── api/
│   ├── mobile/
│   └── web/
├── packages/
│   ├── auth/
│   ├── config/
│   ├── db/
│   └── shared/
├── tooling/
│   └── scripts/
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
- **Redis**
- mobile tooling if you want to run the Expo app

## Getting Started

### 1. Install dependencies

From the repository root:

```bash
bun install
```

### 2. Configure environment variables

Create a local `.env` file in the repository root.

If you have an example environment file available, copy it first and then fill in your actual values.

Typical services used by this repo include:

- PostgreSQL
- Better Auth
- Redis
- AWS S3
- Firebase
- payment provider credentials
- SMS provider credentials

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
3. start PostgreSQL and Redis
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