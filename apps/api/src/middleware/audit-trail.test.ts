import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { auditLogs, db, eq, users } from "@mma/db";
import { Hono } from "hono";

import { auditLogService } from "@/lib/container";
import { auditTrailMiddleware } from "@/middleware/audit-trail";
import type { AppBindings } from "@/types/app-bindings";
import { success } from "@/utils/response";

/**
 * The audit trail over the real app plumbing and the real table: what matters
 * is that a state-changing request leaves a row naming who made it, and that a
 * route describing itself properly is not written twice.
 */
const actorId = crypto.randomUUID();

function buildApp(): Hono<AppBindings> {
  const app = new Hono<AppBindings>();

  app.use("*", async (context, next) => {
    context.set("authUser", { id: actorId } as never);

    await next();
  });
  app.use("*", auditTrailMiddleware);

  app.get("/thing", (context) => success(context, { read: true }));
  app.post("/thing/:id", (context) => success(context, { changed: true }));
  app.patch("/scripts/answers/:id/claim", (context) => success(context, { renewed: true }));
  app.post("/described/:id", (context) => {
    auditLogService.log({
      action: "thing.described",
      actorId,
      entityId: context.req.param("id") ?? "",
      entityType: "thing"
    });

    return success(context, { changed: true });
  });
  app.post("/refused/:id", (context) => success(context, { refused: true }, 400));

  return app;
}

async function entriesFor(entityId: string): Promise<{ action: string; actorId: string | null }[]> {
  // The write is fire-and-forget by design, so give it a moment to land.
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const rows = await db.select().from(auditLogs).where(eq(auditLogs.entityId, entityId));

    if (rows.length > 0) {
      return rows.map((row) => ({ action: row.action, actorId: row.actorId }));
    }

    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  return [];
}

beforeAll(async () => {
  await db.insert(users).values({
    email: `audit-${actorId}@middleware.test`,
    id: actorId,
    name: "Audit Actor",
    role: "TEACHER",
    slug: `audit-actor-${actorId}`
  });
});

afterAll(async () => {
  await db.delete(auditLogs).where(eq(auditLogs.actorId, actorId));
  await db.delete(users).where(eq(users.id, actorId));
});

describe("audit trail middleware", () => {
  test("a change nobody logged still records who made it", async () => {
    const app = buildApp();
    const entityId = crypto.randomUUID();

    await app.request(`/thing/${entityId}`, { method: "POST" });

    const entries = await entriesFor(entityId);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.action).toBe("request.post");
    expect(entries[0]?.actorId).toBe(actorId);
  });

  test("a route that describes its own action is not logged twice", async () => {
    const app = buildApp();
    const entityId = crypto.randomUUID();

    await app.request(`/described/${entityId}`, { method: "POST" });

    const entries = await entriesFor(entityId);

    expect(entries).toEqual([{ action: "thing.described", actorId }]);
  });

  test("a read is not an action", async () => {
    const app = buildApp();

    await app.request("/thing");
    await new Promise((resolve) => setTimeout(resolve, 100));

    const rows = await db.select().from(auditLogs).where(eq(auditLogs.actorId, actorId));

    expect(rows.every((row) => row.metadata?.method !== "GET")).toBe(true);
  });

  test("a refused change is not recorded — nothing happened", async () => {
    const app = buildApp();
    const entityId = crypto.randomUUID();

    await app.request(`/refused/${entityId}`, { method: "POST" });
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(await entriesFor(entityId)).toEqual([]);
  });

  test("a marking claim heartbeat is not an action either", async () => {
    const app = buildApp();
    const entityId = crypto.randomUUID();

    await app.request(`/scripts/answers/${entityId}/claim`, { method: "PATCH" });
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(await entriesFor(entityId)).toEqual([]);
  });
});
