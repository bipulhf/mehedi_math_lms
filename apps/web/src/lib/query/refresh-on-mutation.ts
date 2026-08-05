import type { QueryClient } from "@tanstack/react-query";

/**
 * Why a write refreshes what is on screen, everywhere, without each screen
 * having to remember.
 *
 * Queries are cached for 30 seconds (`staleTime` in `query-client.ts`), which is
 * right for reads and wrong for the moment straight after a write: rename a user
 * and step back to the list inside that window and the list is the one from
 * before the rename. Screens that call `invalidateQueries` themselves were fine;
 * the rest — and there were more of those — needed a reload to tell the truth.
 *
 * So the rule lives at the one place every write already passes through, the ky
 * `afterResponse` hook: a POST, PUT, PATCH or DELETE that succeeded marks the
 * whole cache stale, and React Query refetches the queries that are actually
 * mounted. Screens are free to keep their own targeted invalidation — this is
 * the floor, not a replacement.
 *
 * Invalidating everything rather than guessing which keys a route touched is
 * deliberate: the mapping from `courses/:id/chapters` to the key `["content",
 * "course", id]` is not derivable, and a rule that is wrong occasionally is
 * worse than one that costs a few refetches.
 */

/**
 * The browser's client. `__root.tsx` builds one per mount and registers it here;
 * on the server there is one per request and none is registered, which is why
 * this stays null during SSR.
 */
let activeQueryClient: QueryClient | null = null;

/**
 * Long enough to fold a burst — a save that PUTs and then POSTs — into a single
 * refetch round, short enough that nobody sees the gap.
 */
const coalesceMs = 50;

let pendingHandle: ReturnType<typeof setTimeout> | null = null;

export function setActiveQueryClient(client: QueryClient | null): void {
  activeQueryClient = client;

  if (client === null && pendingHandle !== null) {
    clearTimeout(pendingHandle);
    pendingHandle = null;
  }
}

export function refreshAfterMutation(): void {
  if (activeQueryClient === null || pendingHandle !== null) {
    return;
  }

  pendingHandle = setTimeout(() => {
    pendingHandle = null;

    // Not awaited: the write's own promise must not wait on a refetch, and a
    // failed refetch is already the offline path every query has.
    void activeQueryClient?.invalidateQueries();
  }, coalesceMs);
}
