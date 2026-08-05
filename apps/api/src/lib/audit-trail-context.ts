import { AsyncLocalStorage } from "node:async_hooks";

interface AuditTrailScope {
  /** Set the moment a route writes its own, richer entry for this request. */
  hasExplicitEntry: boolean;
}

const storage = new AsyncLocalStorage<AuditTrailScope>();

/**
 * Whether the request being handled right now has already been written to the
 * audit trail by the route itself.
 *
 * This exists so the fallback entry can be exactly that — a fallback. Routes
 * that log their own action ("course.published", with the course id and the
 * metadata that matters) keep doing so, and anything that forgets still leaves
 * a record of who did it and when. Without the flag the two would double up and
 * the log would read as if every action happened twice.
 */
export function runWithAuditTrailScope<T>(callback: () => T): T {
  return storage.run({ hasExplicitEntry: false }, callback);
}

export function markExplicitAuditEntry(): void {
  const scope = storage.getStore();

  if (scope) {
    scope.hasExplicitEntry = true;
  }
}

export function hasExplicitAuditEntry(): boolean {
  return storage.getStore()?.hasExplicitEntry ?? false;
}
