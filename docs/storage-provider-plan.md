# Plan — pluggable storage provider (S3 / UploadThing)

Implements [ADR-0007](./adr/0007-pluggable-storage-provider.md). Read that first — this doc is the *how*,
the ADR is the *why*. Nothing here is implemented yet.

Ordering principle: **schema and env first (nothing depends on them breaking), then the parts every
provider shares, then each provider's adapter, then the web client last** (it's the only consumer, and it
needs both adapters to exist before it can branch on them).

---

## Stage 1 — schema: `uploads.provider`

**Why first:** every later stage reads or writes this column. Getting it in place, migrated, and backfilled
is a precondition, not a parallel task.

- `packages/db/src/schema/enums.ts`: add `export const storageProviderEnum = pgEnum("storage_provider", ["s3", "uploadthing"]);`
  next to `uploadStatusEnum` (`enums.ts:87`).
- `packages/db/src/schema/uploads.ts`: add `provider: storageProviderEnum("provider").notNull()` after
  `status` (`uploads.ts:24`). No default at the schema level — every insert path must say explicitly which
  provider it used, so a future third provider can never land silently through an inherited default.
- Migration: `bun run db:generate` won't have a source value for existing rows (every row predates this
  column, and every one of them is S3 — confirmed, zero UploadThing traces anywhere in the codebase). Since
  drizzle-kit can't infer a backfill, generate the column as nullable first, hand-edit *only the generated
  migration SQL* (not the schema file) to `UPDATE uploads SET provider = 's3' WHERE provider IS NULL;` before
  the `ALTER COLUMN ... SET NOT NULL`, matching the existing precedent at
  `packages/db/src/migrations/0003_backfill_course_owner_roles.sql`. This is the one exception to "never
  hand-write migration SQL" (`packages/db/AGENTS.md`) — that rule is about not hand-*authoring* schema
  diffs; a backfill statement inside a generated migration is standard practice and already precedented in
  this repo.
- `apps/api/src/repositories/upload-repository.ts`: add `provider: UploadProvider` to `UploadRecord` and
  `CreatePendingUploadInput`; `mapUploadRecord` and `createPendingUpload` thread it through.

**Done when:** `bun run db:generate && bun run db:migrate` runs clean, every existing row reads
`provider = 's3'`, and `bun run typecheck` in `packages/db`/`apps/api` passes.

---

## Stage 2 — shared: types, validators, env

- `packages/shared/src/validators/uploads.ts`: add `export const storageProviderValues = ["s3", "uploadthing"] as const;` and
  `storageProviderSchema = z.enum(storageProviderValues)`, exported as `type StorageProvider`. Add
  `provider: storageProviderSchema` to whatever response schema wraps an upload row (mirrors the DB change).
- `apps/api/src/lib/env.ts`: add to `apiEnvSchema`:
  ```ts
  STORAGE_PROVIDER: z.enum(["s3", "uploadthing"]).default("s3"),
  UPLOADTHING_TOKEN: z.string().default("replace-me"),
  ```
  and a fail-fast check, thrown eagerly at module load (same place `apiEnvSchema.parse` already runs,
  `env.ts:44`) rather than deferred to a lazy flag:
  ```ts
  if (parsedEnv.STORAGE_PROVIDER === "uploadthing" && parsedEnv.UPLOADTHING_TOKEN === "replace-me") {
    throw new Error("STORAGE_PROVIDER=uploadthing requires UPLOADTHING_TOKEN to be set");
  }
  if (parsedEnv.STORAGE_PROVIDER === "s3" && !env.isS3Configured) {
    throw new Error("STORAGE_PROVIDER=s3 requires AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/AWS_S3_BUCKET");
  }
  ```
  This is a genuine behavior change from today's soft `isS3Configured` flag (which stays, for the S3-specific
  check above) — deliberate, per ADR-0007: the *selected* provider must work, or the app should refuse to
  boot rather than 500 on someone's first upload in production.
- `apps/api/package.json`: add `uploadthing` (server SDK) as a dependency. `apps/web/package.json`: add
  `uploadthing` too (its client entrypoint, `uploadthing/client`, ships in the same package — no separate
  client package needed for a non-React-component integration).

**Done when:** `apiEnvSchema` rejects `STORAGE_PROVIDER=uploadthing` with a placeholder token in a quick
manual `bun run dev` smoke test, and accepts it with a real one.

---

## Stage 3 — provider-agnostic reads (delete the S3-only range/full reads)

This is the piece that shrinks every future provider adapter down to two methods. Do it before writing
either adapter, so both adapters are built against the smaller surface from day one instead of migrating
onto it later.

- New file `apps/api/src/lib/object-url-fetch.ts`:
  ```ts
  export async function fetchObjectBytes(fileUrl: string): Promise<Uint8Array> {
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error(`Failed to fetch ${fileUrl}: ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }

  export async function fetchObjectRange(
    fileUrl: string,
    start: number,
    endInclusive: number
  ): Promise<Uint8Array> {
    const response = await fetch(fileUrl, { headers: { Range: `bytes=${start}-${endInclusive}` } });
    if (!response.ok && response.status !== 206) {
      throw new Error(`Range fetch failed for ${fileUrl}: ${response.status}`);
    }
    return new Uint8Array(await response.arrayBuffer());
  }
  ```
  Both S3 (`public-read` ACL, confirmed at `lib/s3.ts:22,98`) and UploadThing (files are publicly served by
  design) already guarantee the URL stored in `fileUrl` is fetchable — no auth needed either way.
- `apps/api/src/lib/s3.ts`: delete `getStoredFileSize` and `getStoredFileRange` entirely. Delete
  `readStoredFile` too (superseded by `fetchObjectBytes`). What remains: `createSignedUploadUrl`,
  `getPublicFileUrl`, `writeStoredFile`, `deleteStoredFile` — exactly the operations that are genuinely
  S3-specific (write access needs credentials; a public GET does not).
- `apps/api/src/services/file-processing-processor.ts`: replace its `getSize`/`readRange` wiring (currently
  `getStoredFileSize`/`getStoredFileRange` from `lib/s3.ts`) with `fetchObjectRange`/response
  `Content-Length` (or a `HEAD` request) against the row's `fileUrl`, not its `fileKey` — this function no
  longer needs to know which provider stored the file at all.
- `apps/api/src/services/upload-service.ts`: `storeImageVariants` (`upload-service.ts:261-299`) swaps
  `this.fileStore.read(upload.fileKey)` for `fetchObjectBytes(upload.fileUrl)`.

**Done when:** `apps/api/src/services/upload-service.test.ts` and
`apps/api/src/services/file-processing-processor.test.ts` pass against a fake `fetch` instead of a fake S3
client (both already inject their dependencies — this is a fake swap, not a new test-infrastructure
problem).

---

## Stage 4 — the `StorageProvider` interface and the S3 adapter

- `apps/api/src/services/storage-provider.ts` (new): the interface every adapter implements, replacing
  `UploadFileStore`:
  ```ts
  export interface PreparedUpload {
    id: string;          // the DB row's id, created before this returns
    provider: StorageProvider;
    // S3 branch carries `uploadUrl`; UploadThing branch carries nothing here —
    // its client SDK talks to a *different* route (see Stage 5), not this one.
    uploadUrl?: string;
  }

  export interface StorageProviderAdapter {
    readonly provider: StorageProviderName;
    prepareUpload(input: { contentType: string; key: string }): Promise<{ uploadUrl: string; fileUrl: string }>;
    delete(key: string): Promise<void>;
  }
  ```
- `apps/api/src/services/s3-storage-provider.ts` (new): thin wrapper over the four functions left in
  `lib/s3.ts` after Stage 3 — `prepareUpload` calls `createSignedUploadUrl` + `getPublicFileUrl`, `delete`
  calls `deleteStoredFile`. This *is* today's behavior, just named and shaped to the new interface.
- `apps/api/src/services/upload-service.ts`: constructor takes a `StorageProviderAdapter` instead of
  `UploadFileStore`; `createPresignedUpload` → rename to `prepareUpload` (matches the interface verb and the
  route rename below); its S3-specific branch is now `this.storage.prepareUpload(...)` instead of two direct
  calls into `lib/s3.ts`.

**Done when:** with only the S3 adapter wired up, every existing `upload-service.test.ts` case still passes
unchanged in behavior (this stage is a pure refactor of the S3 path — the UploadThing path doesn't exist
yet).

---

## Stage 5 — the UploadThing adapter

UploadThing's real integration shape is **not** "call an endpoint, get JSON back, act on it" the way S3's
presigned flow is — it's a mounted route your server owns, whose protocol UploadThing's own client SDK
speaks directly. Confirmed against UploadThing's docs (Hono backend adapter exists and is officially
supported):

```ts
// apps/api/src/lib/uploadthing-router.ts (new)
import { createUploadthing, type FileRouter } from "uploadthing/server";
import { env } from "@/lib/env";

const f = createUploadthing();

export const uploadthingRouter = {
  // one named route per UploadPurpose, size/type limits mirroring uploadPurposeConfig
  courseCover: f({ image: { maxFileSize: "5MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const actor = /* same session lookup requireAuth() uses */;
      return { userId: actor.id, purpose: "COURSE_COVER" as const };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // the file already fully exists at this point -- create the row as READY
      // directly, stamped provider: "uploadthing". There is no PENDING phase
      // for this provider: that whole window is invisible to us, UploadThing's
      // SDK owns it.
      await uploadRepository.createReadyUpload({
        contentType: file.type, fileKey: file.key, fileUrl: file.url,
        fileSize: file.size, provider: "uploadthing", purpose: metadata.purpose,
        userId: metadata.userId, /* ... */
      });
    }),
  // lectureVideo, courseMaterial, profilePhoto, bugScreenshot: same pattern,
  // limits from uploadPurposeConfig. courseMaterial needs multiple route-type
  // keys in one f({...}) call (image + pdf + blob) since UploadThing's
  // FileRouter buckets by type, not by arbitrary MIME pattern -- map
  // uploadPurposeConfig.allowedContentTypes to the nearest bucket set by hand,
  // there's no mechanical translation between the two.
} satisfies FileRouter;

export type UploadthingRouter = typeof uploadthingRouter;
```

```ts
// apps/api/src/routes/v1/uploadthing-route.ts (new)
import { createRouteHandler } from "uploadthing/server";
import { uploadthingRouter } from "@/lib/uploadthing-router";

const handlers = createRouteHandler({ router: uploadthingRouter });
export const uploadthingRoutes = new Hono<AppBindings>();
uploadthingRoutes.all("/*", (context) => handlers(context.req.raw));
```
Mounted once, unconditionally, in `apps/api/src/index.ts` (or wherever routes are registered) — it's dead
weight when `STORAGE_PROVIDER=s3`, but mounting it conditionally buys nothing and complicates route
registration for no reason.

- `apps/api/src/services/uploadthing-storage-provider.ts` (new): implements `StorageProviderAdapter.delete`
  via `new UTApi().deleteFiles(key)`. `prepareUpload` is **not** meaningfully implementable for this
  provider in the same shape as S3's — the client never calls it; it's present only so the interface stays
  uniform, and throws if ever reached (a guard against the two flows getting crossed).
- `UploadRepository`: add `createReadyUpload` (parallel to `createPendingUpload`, skips the `PENDING`
  status entirely) for the UploadThing path's single-phase creation.

**Done when:** `bunx tsc --noEmit` passes with the UploadThing SDK's types satisfied, and a fake
`FileRouter`/`onUploadComplete` unit test (per the SDK's own testing guidance, or a hand-rolled fake calling
the exported `onUploadComplete` function directly) exercises the row-creation path without needing a real
UploadThing account. Real end-to-end verification is Stage 8, gated on your UploadThing token.

---

## Stage 6 — wiring: which adapter is active

- `apps/api/src/lib/container.ts`: replace the hardcoded `new UploadService(uploadRepository)` (currently
  always defaulting to S3, `container.ts:178`) with:
  ```ts
  const storageAdapter: StorageProviderAdapter =
    env.STORAGE_PROVIDER === "uploadthing" ? new UploadThingStorageProvider() : new S3StorageProvider();
  const uploadService = new UploadService(uploadRepository, storageAdapter);
  ```
- `deleteUpload` (`upload-service.ts:373-392`) now reads `upload.provider` from the fetched row and picks
  the matching adapter to call `.delete()` on — **not** `this.storage` (the currently-active one). This
  needs both adapters available inside `UploadService` regardless of which is "active" for new uploads;
  simplest shape is `UploadService` receiving a small `{ s3: StorageProviderAdapter, uploadthing:
  StorageProviderAdapter }` map plus a separate `activeProvider: StorageProvider` for `prepareUpload`, rather
  than a single injected adapter. This is the direct implementation of ADR-0007's "delete dispatches to the
  provider the row was created under."
- New route: `apps/api/src/routes/v1/upload-route.ts` gains `GET /provider`, returning
  `{ provider: env.STORAGE_PROVIDER }` — the one piece of information the web client needs before it can
  decide which upload mechanics to run.

**Done when:** flipping `STORAGE_PROVIDER` in `.env` and restarting changes what `GET /upload/provider`
reports, with no other code change required.

---

## Stage 7 — web client

- `apps/web/src/lib/api/uploads.ts`: `requestPresignedUpload`/`uploadFileToSignedUrl` stay, renamed to make
  clear they're the S3 branch (`prepareS3Upload`, `putToS3`). New `uploadthingUpload(file, purpose)` using
  `genUploader<UploadthingRouter>()` from `uploadthing/client`, pointed at the mounted
  `/api/v1/uploadthing` route.
- `uploadManagedFile` becomes the dispatcher:
  ```ts
  export async function uploadManagedFile(file: File, options: UploadFileOptions): Promise<UploadRecord> {
    const { provider } = await getActiveStorageProvider(); // GET /upload/provider, cached
    return provider === "uploadthing"
      ? uploadViaUploadThing(file, options)
      : uploadViaS3(file, options); // today's requestPresignedUpload -> PUT -> confirmUpload
  }
  ```
  `getActiveStorageProvider` is called once and memoized (module-level promise, or a TanStack Query with
  `staleTime: Infinity`) — it changes only on a redeploy, never mid-session.
- Every existing caller (`uploadBugScreenshot`, `uploadCourseCover`, `uploadCourseMaterial`,
  `uploadLectureVideo`, `uploadProfilePhoto`, and their consumers in `video-uploader.tsx`,
  `course-editor.tsx`, `course-lecture-builder.tsx`, `bug-screenshot-upload-field.tsx`,
  `profile-photo-upload-field.tsx`) is unchanged — they all go through `uploadManagedFile`, so the branch is
  invisible above that layer. This is the payoff of the dispatcher shape: five call sites, zero of them
  need to know which provider is live.
- Mobile: untouched. Confirmed zero upload call sites exist there today.

**Done when:** with `STORAGE_PROVIDER=s3` (unchanged default), every existing upload flow on web behaves
identically to today — this stage should produce **no visible behavior change** until the env var actually
flips.

---

## Stage 8 — verification

**Automated** (works today, no UploadThing account needed):
- `bun run typecheck && bun run lint && bun run test` at the root — extends the existing
  `upload-service.test.ts`/`file-processing-processor.test.ts` suites (already fake-injected, per Stage 3)
  with cases for: `deleteUpload` dispatching to the *row's* provider regardless of the currently-active one;
  `prepareUpload` on the S3 adapter producing the same shape as today; env boot-failure for each
  misconfigured-selected-provider case from Stage 2.

**Manual, gated on your UploadThing token** (per your answer — this is a hard gate before calling the
UploadThing path done, not a "nice to have"):
1. `STORAGE_PROVIDER=s3` (default): confirm every purpose (course cover, lecture video, course material, bug
   screenshot, profile photo) still uploads, confirms, and deletes exactly as today.
2. Set `STORAGE_PROVIDER=uploadthing` + real `UPLOADTHING_TOKEN`, restart: confirm `GET /upload/provider`
   flips, then repeat all five purposes — upload succeeds via UploadThing's SDK, `onUploadComplete` creates a
   `READY` row stamped `provider: "uploadthing"`, the resulting `fileUrl` renders correctly wherever it's
   consumed (course cover image, video player, material download link, profile photo).
3. Delete an UploadThing-provider upload; confirm it's actually gone from the UploadThing dashboard, not just
   the DB row.
4. **The provider-tracking test that matters most:** upload something on `s3`, switch to
   `STORAGE_PROVIDER=uploadthing`, then delete *that S3 row* through the normal delete flow — confirm it
   still succeeds (dispatches to the S3 adapter via `upload.provider`, not the now-active UploadThing one).
   This is the exact failure ADR-0007's `uploads.provider` column exists to prevent; it's the one scenario
   automated tests can characterize but a real click-through proves.

---

### Critical files

`packages/db/src/schema/{enums,uploads}.ts` · `packages/shared/src/validators/uploads.ts` ·
`apps/api/src/lib/env.ts` · `apps/api/src/lib/s3.ts` · `apps/api/src/lib/object-url-fetch.ts` (new) ·
`apps/api/src/lib/uploadthing-router.ts` (new) · `apps/api/src/services/storage-provider.ts` (new) ·
`apps/api/src/services/s3-storage-provider.ts` (new) ·
`apps/api/src/services/uploadthing-storage-provider.ts` (new) ·
`apps/api/src/services/upload-service.ts` · `apps/api/src/repositories/upload-repository.ts` ·
`apps/api/src/routes/v1/upload-route.ts` · `apps/api/src/routes/v1/uploadthing-route.ts` (new) ·
`apps/api/src/lib/container.ts` · `apps/web/src/lib/api/uploads.ts`
