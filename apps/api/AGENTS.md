# AGENTS.md — `@genex/api`

Hono API on the Bun runtime. Root conventions in [`../../AGENTS.md`](../../AGENTS.md) apply here too.

```bash
bun run dev                    # PORT=3010 bun --env-file ../../.env --watch src/index.ts
bun run typecheck
bun run lint
bun run worker:notifications   # BullMQ notification worker (separate process)
bun run worker:sms             # BullMQ SMS worker (separate process)
bun run worker:file-processing # BullMQ video metadata worker (separate process)
bun run worker:audit-log-cleanup # BullMQ audit log retention sweep (separate process)
```

Listens on `env.API_PORT` (default `3001`) in development. The `PORT=3010` in the dev script is only consulted when `NODE_ENV=production` — see `resolveListenPort()` in `src/index.ts`. Do not "fix" one to match the other without checking both.

## Layering

Every HTTP feature flows through four layers. Do not skip one. **Every layer file is `<name>-<layer>.ts`** — dashes, not dots. The build plan originally specified `course.route.ts`; the routes followed it and the other three layers did not, so the repo agreed with neither the plan nor itself until the routes were renamed to match the majority. Do not reintroduce the dotted form.

```
routes/v1/*-route.ts   Hono router. Parses input with a @genex/shared Zod schema. Attaches auth middleware.
controllers/*.ts       Class. Calls one service, wraps the result in success()/paginated(). No business logic.
services/*.ts          Class. Business rules, authorization decisions, domain mapping. Throws AppError subclasses.
repositories/*.ts      Class. Drizzle queries only. Returns plain records. No business rules, no HTTP types.
```

Controllers, services, and repositories are **classes with constructor injection**. They are instantiated once in `src/lib/container.ts` and exported as singletons. A new feature means: add the repository, service, and controller instances to the container in dependency order, then export the controller.

Layer rules:

- Repositories never import from `services/`, `controllers/`, or `utils/response.ts`.
- Services never touch the Hono `Context`. They take plain arguments and return plain data.
- Controllers never call a repository directly.
- Cross-feature reads go service → _other feature's repository_ (e.g. `CommentService` takes `courseRepository` and `enrollmentRepository`), not service → service. `AdminUserService` → `StaffAccountService` is the exception, not the pattern.

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

## Audit trail

Every state-changing request by a signed-in user leaves a row in `audit_logs`
saying who made it and when. Two layers produce those rows:

- **The route**, via `auditLogService.log(...)`, naming what actually happened —
  `course.published`, `answer.marked` — with the ids and metadata worth keeping.
  Do this wherever the action has a name a human would recognise.
- **`auditTrailMiddleware`**, which writes a `request.<method>` entry for any
  mutating request the route did not describe. It is the floor, not the
  intended path: a feature added next year is audited whether or not its author
  remembered to.

The two never double up. `AuditLogService.log` marks the request through
`src/lib/audit-trail-context.ts` (an `AsyncLocalStorage` scope opened by the
middleware), and the fallback stays quiet when that mark is set.

Not logged, deliberately: reads, requests that failed (nothing changed), and the
marking-claim heartbeat the browser sends every 45 seconds — the exclusion list
is at the top of the middleware.

## Errors

Throw the typed errors from `src/utils/errors.ts` — `ValidationError` (400), `UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `ConflictError` (409), or `AppError` with an explicit status. `app.onError` (`src/middleware/error-handler.ts`) logs and converts them. In production, non-`AppError` throws are flattened to `"Internal server error"`.

Do not catch-and-return an error response inside a service. Throw, and let the handler shape it.

## Validation

Schemas come from `@genex/shared`. Two patterns coexist:

1. **Inline parse in the route** (dominant, e.g. `categories-route.ts`) — `schema.parse(await context.req.json())`, result passed to the controller as a typed argument. A raw `ZodError` from this path is caught by `onError` and surfaces as a 500 in development / generic 500 in production.
2. **`validateJson` / `validateQuery` / `validateParams` middleware** (`src/middleware/validate.ts`) — wraps `ZodError` into a `ValidationError` with field-level `issues`, producing a proper 400.

Prefer the middleware when you need clean 400s with field errors. Match the surrounding file when extending an existing router.

## Auth

`sessionContextMiddleware` runs on all `/api/v1/*` and populates `authSession` / `authUser` / `logger` / `requestId` on the Hono context (`src/types/app-bindings.ts`). It does not reject anyone.

Enforcement is per-route via `src/middleware/auth.ts`:

```ts
requireAuth(); // active session
requireRole("TEACHER", "ADMIN"); // one of these roles
requireAdmin(); // requireRole("ADMIN")
```

Both delegate to `AuthGuardService`. Roles are `STUDENT | TEACHER | ACCOUNTANT | ADMIN` from `@genex/shared`. A route with no guard is public — be deliberate about that.

Ownership and resource-level authorization belongs in the **service**, not the route. Routes only gate by role.

## Infrastructure

- `src/lib/env.ts` — Zod-validated env plus derived `isS3Configured` / `isFirebaseConfigured` / `isSslCommerzConfigured` / `isOnecodesoftSmsConfigured` flags. Integrations default to `"replace-me"` placeholders; guard optional integrations behind these flags rather than assuming credentials exist.
- `src/lib/redis.ts`, `src/lib/queues.ts` — ioredis client and four BullMQ queues: `notification`, `sms`, `file-processing`, `audit-log-cleanup`. Queue names are typed as `QueueName` in `src/types/app-bindings.ts`; adding a queue means updating both. **Both exports are nullable**: `REDIS_ENABLED=false` is a supported way to run this API (ADR-0015), so `redis` is `Redis | null` and `queues` is `JobQueueMap | null`. New work picks one of three: `enqueue(...)` to run the job here when there is no queue, `requireQueue(...)` to refuse without one, or a plain `null` check with a fallback. The request client fails a command in a second rather than queueing it — never assume a Redis call will wait. There is deliberately no `email` queue — the staff-invite producer was removed and no transport was ever wired, so the queue went with it (see `BLOCKERS.md`).
- `src/lib/logger.ts` — pino. Inside a request use `context.get("logger")`, which is already bound to the request id.
- `src/lib/s3.ts` — AWS S3 client for uploads: presigned PUT for the client, plus `readStoredFile` / `writeStoredFile` / `deleteStoredFile` for objects the server itself handles.
- Workers in `src/workers/` run as **separate processes** and build their own dependencies — they deliberately do not import the container. Keep them that way. Each exits 1 when `REDIS_ENABLED=false`: a worker with no queue is a process pretending to work.

## Uploads and image variants

A confirmed image is resized into the widths in `@genex/shared`'s `imageVariantWidths` (400/800/1200), each copy stored beside the original as `<name>@<width>.<ext>`, and the row's `fileUrl` is marked with the widths that exist. `sharp` does the resizing; there is no ffmpeg-style shell-out.

Three things about that are deliberate:

- **It runs inside `confirmUpload`, not on the `file-processing` queue.** The only thing kept downstream of an upload is the URL that call returns — a course row holds `cover_image_url` and nothing else — and the editor saves it the instant confirm resolves. A worker would finish after that URL had already been written, leaving a marker nobody put on it.
- **It is never fatal.** A corrupt file, an unresizable format, S3 refusing the write: all of them log a warning and return the original, unmarked. The image the user just uploaded is already in the bucket and already usable.
- **`uploads.variant_widths` is the record of what exists.** Deletion reads it. Guessing the widths instead would orphan every variant the day that list changes.

S3 access from the upload service goes through the injected `UploadFileStore` — the same reason `file-processing-processor.ts` takes a `StoredFileReader`. This workspace injects its way around S3 rather than mocking the module, and the `isS3Configured` 409 lives in `s3UploadFileStore` so a new path through the bucket cannot forget it.

## WebSockets

`src/websocket/messages-ws-app.ts` and `src/websocket/notifications-ws-app.ts` are standalone Hono apps mounted by path match in `src/index.ts`, not by `app.route()`. They re-apply `sessionContextMiddleware` and `requireRole` themselves because the main app's middleware chain never runs for them. If you add a WebSocket path, wire it in `src/index.ts` and re-apply auth inside the new app.

Realtime fan-out goes through `MessageRealtimeService` / `NotificationRealtimeService`, which use their own Redis pub/sub connections.

## Adding an endpoint

1. Schema in `packages/shared/src/validators/<feature>.ts`, exported from that package's validator index.
2. Repository method — Drizzle query, explicit `.select({...})` column list, returns a `readonly` record array or `T | null`.
3. Service method — rules, authorization, mapping to the response shape (dates become ISO strings at this layer).
4. Controller method — call service, return `success(...)`.
5. Route — parse input, attach the guard, call the controller.
6. Register any new class in `src/lib/container.ts`.
7. Add the matching client function in `apps/web/src/lib/api/<feature>.ts`.
