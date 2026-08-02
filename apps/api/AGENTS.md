# AGENTS.md — `@mma/api`

Hono API on the Bun runtime. Root conventions in [`../../AGENTS.md`](../../AGENTS.md) apply here too.

```bash
bun run dev                    # PORT=3010 bun --env-file ../../.env --watch src/index.ts
bun run typecheck
bun run lint
bun run worker:notifications   # BullMQ notification worker (separate process)
bun run worker:sms             # BullMQ SMS worker (separate process)
```

Listens on `env.API_PORT` (default `3001`) in development. The `PORT=3010` in the dev script is only consulted when `NODE_ENV=production` — see `resolveListenPort()` in `src/index.ts`. Do not "fix" one to match the other without checking both.

## Layering

Every HTTP feature flows through four layers. Do not skip one.

```
routes/v1/*.route.ts   Hono router. Parses input with a @mma/shared Zod schema. Attaches auth middleware.
controllers/*.ts       Class. Calls one service, wraps the result in success()/paginated(). No business logic.
services/*.ts          Class. Business rules, authorization decisions, domain mapping. Throws AppError subclasses.
repositories/*.ts      Class. Drizzle queries only. Returns plain records. No business rules, no HTTP types.
```

Controllers, services, and repositories are **classes with constructor injection**. They are instantiated once in `src/lib/container.ts` and exported as singletons. A new feature means: add the repository, service, and controller instances to the container in dependency order, then export the controller.

Layer rules:

- Repositories never import from `services/`, `controllers/`, or `utils/response.ts`.
- Services never touch the Hono `Context`. They take plain arguments and return plain data.
- Controllers never call a repository directly.
- Cross-feature reads go service → *other feature's repository* (e.g. `CommentService` takes `courseRepository` and `enrollmentRepository`), not service → service. `AdminUserService` → `StaffAccountService` is the exception, not the pattern.

## Entry points

- `src/index.ts` — `Bun.serve()`. Routes two WebSocket paths to their own Hono apps before falling through to `app.fetch`.
- `src/app.ts` — middleware stack and route mounting. Global middleware order: request-id → request-logger → CORS → body-limit → compress → rate-limit (non-development only) → session-context (on `/api/v1/*`).
- `src/routes/v1/index.ts` — mounts every v1 router.

## Request/response contract

All responses go through `src/utils/response.ts`:

```ts
success(context, data, status?, message?)   // { status: "success", message?, data }
error(context, message, status, issues?)    // { status: "error", message, issues? }
paginated(context, data, pagination)        // { status: "success", data, pagination }
```

Never call `context.json()` directly in a controller. The web client (`apps/web/src/lib/api/client.ts`) depends on this envelope shape.

## Errors

Throw the typed errors from `src/utils/errors.ts` — `ValidationError` (400), `UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `ConflictError` (409), or `AppError` with an explicit status. `app.onError` (`src/middleware/error-handler.ts`) logs and converts them. In production, non-`AppError` throws are flattened to `"Internal server error"`.

Do not catch-and-return an error response inside a service. Throw, and let the handler shape it.

## Validation

Schemas come from `@mma/shared`. Two patterns coexist:

1. **Inline parse in the route** (dominant, e.g. `categories.route.ts`) — `schema.parse(await context.req.json())`, result passed to the controller as a typed argument. A raw `ZodError` from this path is caught by `onError` and surfaces as a 500 in development / generic 500 in production.
2. **`validateJson` / `validateQuery` / `validateParams` middleware** (`src/middleware/validate.ts`) — wraps `ZodError` into a `ValidationError` with field-level `issues`, producing a proper 400.

Prefer the middleware when you need clean 400s with field errors. Match the surrounding file when extending an existing router.

## Auth

`sessionContextMiddleware` runs on all `/api/v1/*` and populates `authSession` / `authUser` / `logger` / `requestId` on the Hono context (`src/types/app-bindings.ts`). It does not reject anyone.

Enforcement is per-route via `src/middleware/auth.ts`:

```ts
requireAuth()                          // active session
requireRole("TEACHER", "ADMIN")        // one of these roles
requireAdmin()                         // requireRole("ADMIN")
```

Both delegate to `AuthGuardService`. Roles are `STUDENT | TEACHER | ACCOUNTANT | ADMIN` from `@mma/shared`. A route with no guard is public — be deliberate about that.

Ownership and resource-level authorization belongs in the **service**, not the route. Routes only gate by role.

## Infrastructure

- `src/lib/env.ts` — Zod-validated env plus derived `isS3Configured` / `isFirebaseConfigured` / `isSslCommerzConfigured` / `isOnecodesoftSmsConfigured` flags. Integrations default to `"replace-me"` placeholders; guard optional integrations behind these flags rather than assuming credentials exist.
- `src/lib/redis.ts`, `src/lib/queues.ts` — ioredis client and four BullMQ queues: `email`, `notification`, `sms`, `file-processing`. Queue names are typed as `QueueName` in `src/types/app-bindings.ts`; adding a queue means updating both.
- `src/lib/logger.ts` — pino. Inside a request use `context.get("logger")`, which is already bound to the request id.
- `src/lib/s3.ts` — AWS S3 client for uploads.
- Workers in `src/workers/` run as **separate processes** and build their own dependencies — they deliberately do not import the container. Keep them that way.

## WebSockets

`src/routes/messages-ws-app.ts` and `src/routes/notifications-ws-app.ts` are standalone Hono apps mounted by path match in `src/index.ts`, not by `app.route()`. They re-apply `sessionContextMiddleware` and `requireRole` themselves because the main app's middleware chain never runs for them. If you add a WebSocket path, wire it in `src/index.ts` and re-apply auth inside the new app.

Realtime fan-out goes through `MessageRealtimeService` / `NotificationRealtimeService`, which use their own Redis pub/sub connections.

## Adding an endpoint

1. Schema in `packages/shared/src/validators/<feature>.ts`, exported from that package's validator index.
2. Repository method — Drizzle query, explicit `.select({...})` column list, returns a `readonly` record array or `T | null`.
3. Service method — rules, authorization, mapping to the response shape (dates become ISO strings at this layer).
4. Controller method — call service, return `success(...)`.
5. Route — parse input, attach the guard, call the controller.
6. Register any new class in `src/lib/container.ts`.
7. Add the matching client function in `apps/web/src/lib/api/<feature>.ts`.
