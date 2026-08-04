---
status: accepted
---

# File storage is a pluggable provider, chosen by `STORAGE_PROVIDER`

Uploads switch backends (`s3` or `uploadthing`) via one env var. Because the two providers' native upload
flows are architecturally different — S3 is a bare presigned PUT, UploadThing is its own client SDK plus a
signed server callback — the abstraction covers the whole upload journey, not just server-side storage
operations. Every already-uploaded object records which provider it lives on, independent of whichever
provider is active today.

## Context

Storage is currently S3-only, and S3 usage is hardcoded in three separate places: `UploadFileStore`
(`upload-service.ts:24-28`, already an interface but only covers read/write/delete of finished objects),
presigned-PUT and public-URL generation (called directly from `lib/s3.ts`, bypassing that interface), and
video byte-range reads for metadata extraction (`file-processing-processor.ts`, also calling `lib/s3.ts`
directly). The web client uploads via a bare `XMLHttpRequest PUT` to a presigned URL — no SDK, no
abstraction on that side either.

UploadThing does not offer a presigned-PUT-shaped endpoint. Its idiomatic flow is its own client SDK
talking directly to its edge infrastructure, with a signed webhook calling back to the app's server when
the upload completes. Forcing UploadThing through a fake "presigned PUT" shape (server-proxied bytes, no
native SDK) would work, but throws away UploadThing's reliability/retry handling and its confirmation
guarantee — and it isn't really using UploadThing, just a slower S3.

## Decision

- The abstraction is a `StorageProvider` with two methods: `prepareUpload` (returns provider-specific
  client-upload instructions for a given purpose/content-type/size) and `delete`. Reading bytes back
  (image-variant generation, video byte-range extraction) is provider-agnostic: a plain `fetch` against the
  object's already-public `fileUrl`, not a provider SDK call. This is what shrank the interface to two
  methods — every provider, including a future third one, always exposes a fetchable URL.
- `STORAGE_PROVIDER=s3|uploadthing`, one value for the whole app, no per-purpose override. Defaults to
  `s3` when unset, matching every existing deploy's current behavior.
- The web client uses UploadThing's official client SDK for that branch, not a hand-rolled fetch — its
  retry/chunking behavior matters for lecture-video uploads.
- The `PENDING → READY` transition is provider-appropriate, not uniform: S3 keeps the client calling
  `POST /confirm` (unchanged). UploadThing uses its own signed server-to-server callback instead — more
  idiomatic, and a client can't fake a webhook UploadThing itself signs.
- `uploads.provider` is stamped once at row creation and never changes. `delete` and any read dispatch to
  the provider *that row* was created under, never to whichever provider `STORAGE_PROVIDER` names today.
  Without this, flipping the env var would silently break delete (and any reprocessing) for every object
  uploaded under the previous provider.
- Config for the *selected* provider is validated at boot, not lazily on first use. Picking
  `uploadthing` without a real token fails the app's startup, not the first course-cover upload in
  production.

## Considered options

- **Storage-backend only: keep the presigned-PUT contract for every provider.** Rejected — for UploadThing
  this means never using its native client SDK, instead having the app's server accept raw bytes and
  forward them server-side. Smaller change, but discards the reason to pick UploadThing at all.
- **Uniform client-confirm for both providers, ignore UploadThing's webhook.** Rejected — a client could
  claim success without the upload having actually finished, for no benefit over using UploadThing's own
  signed confirmation.
- **Soft/lazy config validation (mirror today's `isS3Configured` flag) instead of fail-fast.** Rejected —
  appropriate when a fallback exists; here the selected provider *is* the only path, so a silent
  misconfiguration would surface as a 500 on someone's first real upload instead of at deploy time.

## Consequences

- A new provider (a third backend, someday) only ever needs to implement `prepareUpload` and `delete`.
- `lib/s3.ts` shrinks to exactly the operations that are genuinely S3-specific: presigned PUT creation,
  public-URL building, write, delete. `getStoredFileSize`/`getStoredFileRange` are deleted outright —
  their callers move to the generic URL-range fetch.
- `uploads.provider` needs a migration; every existing row backfills to `"s3"`, the only provider that has
  ever existed in this codebase.
- Mobile has no upload functionality today, so it isn't touched by this change.
