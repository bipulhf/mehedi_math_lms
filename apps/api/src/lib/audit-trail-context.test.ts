import { describe, expect, test } from "bun:test";

import {
  hasExplicitAuditEntry,
  markExplicitAuditEntry,
  runWithAuditTrailScope
} from "@/lib/audit-trail-context";

describe("audit trail scope", () => {
  test("a request starts with nothing recorded", () => {
    expect(runWithAuditTrailScope(() => hasExplicitAuditEntry())).toBe(false);
  });

  test("a route logging its own action is remembered for that request", () => {
    const recorded = runWithAuditTrailScope(() => {
      markExplicitAuditEntry();

      return hasExplicitAuditEntry();
    });

    expect(recorded).toBe(true);
  });

  test("one request's entry does not silence the next", () => {
    runWithAuditTrailScope(() => {
      markExplicitAuditEntry();
    });

    expect(runWithAuditTrailScope(() => hasExplicitAuditEntry())).toBe(false);
  });

  test("the flag survives an await, which is where the route logs", async () => {
    const recorded = await runWithAuditTrailScope(async () => {
      await Promise.resolve();
      markExplicitAuditEntry();
      await Promise.resolve();

      return hasExplicitAuditEntry();
    });

    expect(recorded).toBe(true);
  });

  test("outside a request there is no scope to mark, and nothing throws", () => {
    markExplicitAuditEntry();

    expect(hasExplicitAuditEntry()).toBe(false);
  });
});
