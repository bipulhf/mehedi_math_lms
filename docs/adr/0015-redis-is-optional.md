---
status: accepted
---

# Redis is optional, and "off" means the capability is gone rather than faked

`REDIS_ENABLED` decides whether this deployment has a Redis. `true` — the
default — means *required*: the API refuses to start if it cannot reach one.
`false` runs the whole product on Postgres alone, with the degradations below
named rather than discovered.

## Context

Redis was mandatory and silently so. Worse, it was mandatory in a way that
failed badly: the client was built with `maxRetriesPerRequest: null` on top of
ioredis's offline queue, so a command issued while Redis was unreachable was
parked until it came back and the promise never settled. The `try/catch` in
`lib/cache.ts` — whose own docblock promises that "a cache outage must degrade
latency, never correctness or availability" — could not fire, because there was
nothing to catch. The rate limiter, which has no guard at all, hung every API
request for the length of any outage.

Meanwhile the owner wants to run this product on one small server. Redis backs
seven distinct capabilities here and they do **not** share a failure policy:
three are pure latency, two are cross-process guarantees, one is already
effectively single-process, and one — messaging presence — turned out to be
load-bearing on five read paths where nobody intended it.

## Decision

- **`REDIS_ENABLED=true|false`, default `true`.** `true` connects at boot and
  exits 1 if it cannot, so a typo'd `REDIS_URL` is a startup failure a deployer
  sees rather than a slow page a student does.
- **The classification rule.** An in-memory substitute is allowed *only where
  single-process semantics are the true semantics*. Where Redis provides a
  cross-process guarantee that cannot honestly be faked, the feature changes
  shape and says so. It never pretends.
- **`REDIS_ENABLED=false` therefore implies exactly one API process.** Two would
  mean a message published on one is never delivered by the other.
- **The type carries the switch.** `redis` is `Redis | null` and `queues` is
  `JobQueueMap | null`, so the compiler names every place that has to decide.
- **Background jobs run in this process** when there is no queue, through one
  seam (`enqueue` in `lib/queues.ts`), after the response. They are not durable
  and do not pretend to be — every job routed through it writes its database row
  first, so a restart mid-send leaves a `QUEUED` batch an operator can resend
  rather than a broadcast that vanished.
- **Two client shapes when Redis is on**, independent of the switch: the request
  path gets `enableOfflineQueue: false` and a command timeout so a failure is an
  error in a millisecond; BullMQ keeps `maxRetriesPerRequest: null` on its own
  connections, because its blocking reads legitimately sit for seconds.

### What each capability does when Redis is off

| Capability | Off behaviour |
| --- | --- |
| `lib/cache.ts` read-through | Calls the loader — the same path as a cache miss |
| Sitemap cache | Regenerated per request |
| Landing snapshot | Regenerated, with a per-process memo on the same 300s TTL |
| Rate limiting | Counted in this process, at the configured limit |
| SMS broadcast, FCM push, video metadata | Run in this process after the response |
| Audit-log retention | Swept by the API daily instead of by the cleanup worker |
| Realtime pub/sub | `publish` delivers to this process's sockets |
| Messaging presence | An in-process `Map` |
| Health | `redisEnabled: false`, `redisStatus: "disabled"`, `queues: []` |
| The four worker processes | Refuse to start and exit 1 |
| `backfill-video-metadata.ts` | Refuses, naming the switch |

## Considered options

- **A third `auto` state that uses Redis if it can reach it.** Rejected — it
  makes the mode depend on the time of day. Redis reachable at boot and gone at
  3am leaves nobody able to answer "does my SMS broadcast send?", and the
  degradations are not uniformly safe enough to apply without being asked.
- **A null-object `RedisPort` that accepts writes and discards them.** Rejected
  twice over: BullMQ needs a real ioredis instance, so the abstraction would
  cover half the surface; and silently swallowing a write is precisely the bug
  this decision exists to prevent.
- **Refusing SMS with a 503 when there is no queue.** Rejected by the owner:
  this deployment needs the feature, and the batch row plus an in-process send
  is honest as long as the page says which mode it is in.
- **An in-memory rate limiter as a general fallback.** Accepted here *only*
  because off implies one process. Under several processes each would grant the
  full limit — a different guarantee wearing the same name.

## Consequences

- One API process when the switch is off. This is the constraint to remember
  before scaling out.
- Turning an existing Redis off leaves any `QUEUED` SMS batch unsent until
  somebody resends it. Check before flipping.
- The API test suite now runs with no Redis at all — 242 tests against a dead
  port — which was impossible before, because importing the app built four
  queues and opened a connection.
- Rate limiting now fails open on a Redis error in *both* modes. That is a
  behaviour change for a Redis-on deployment, and the right one: refusing every
  request because a counter is unreachable is a worse failure than the abuse it
  prevents.
