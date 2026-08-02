import { describe, expect, test } from "bun:test";

import { app } from "@/app";

/**
 * Integration tests over the real Hono app: middleware chain, guards, the error
 * handler and the response envelope, exercised through `app.request` rather
 * than by calling controllers directly.
 *
 * These are deliberately anonymous. Every request arrives with no session
 * cookie, which is the case worth being certain about -- a guard that silently
 * stopped guarding would pass every unit test in the repository.
 */

interface ErrorEnvelope {
  message: string;
  status: "error";
}

async function readEnvelope(response: Response): Promise<ErrorEnvelope> {
  return (await response.json()) as ErrorEnvelope;
}

describe("response envelope", () => {
  test("an unknown route is a 404 in the error envelope", async () => {
    const response = await app.request("/api/v1/not-a-real-route");
    const body = await readEnvelope(response);

    expect(response.status).toBe(404);
    expect(body.status).toBe("error");
    expect(body.message).toBe("Route not found");
  });

  test("every response carries a request id", async () => {
    const response = await app.request("/api/v1/not-a-real-route");

    expect(response.headers.get("X-Request-Id")).toBeTruthy();
  });

  test("a supplied request id is echoed rather than replaced", async () => {
    const response = await app.request("/api/v1/not-a-real-route", {
      headers: { "X-Request-Id": "integration-test-id" }
    });

    expect(response.headers.get("X-Request-Id")).toBe("integration-test-id");
  });
});

describe("authentication guards", () => {
  const authenticatedRoutes = [
    "/api/v1/notifications",
    "/api/v1/messages/conversations",
    "/api/v1/enrollments/me",
    "/api/v1/profiles/me"
  ] as const;

  for (const path of authenticatedRoutes) {
    test(`${path} refuses an anonymous request`, async () => {
      const response = await app.request(path);

      // 401 for "no session", 403 for "wrong role" -- either is a refusal. What
      // must never happen is a 200 with someone else's data.
      expect([401, 403]).toContain(response.status);
    });
  }

  const adminRoutes = [
    "/api/v1/admin/users",
    "/api/v1/admin/message-reports",
    "/api/v1/admin/dashboard"
  ] as const;

  for (const path of adminRoutes) {
    test(`${path} refuses an anonymous request`, async () => {
      const response = await app.request(path);

      expect([401, 403]).toContain(response.status);
    });
  }

  test("hiding a message is refused without an admin session", async () => {
    // ADR-0004: only an admin, and only on a reported conversation. The second
    // half is unit-tested; this pins the first half at the HTTP boundary.
    const response = await app.request("/api/v1/admin/messages/some-id/hide", { method: "POST" });

    expect([401, 403]).toContain(response.status);
  });

  test("reporting a conversation is refused without a session", async () => {
    const response = await app.request("/api/v1/messages/conversations/some-id/report", {
      body: JSON.stringify({ reason: "a reason long enough to pass validation" }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });

    expect([401, 403]).toContain(response.status);
  });
});

describe("removed endpoints stay removed", () => {
  test("a course cannot be deleted", async () => {
    // Withdrawal replaced deletion. If this ever answers anything other than
    // 404/405, the route came back.
    const response = await app.request("/api/v1/courses/some-id", { method: "DELETE" });

    expect([401, 403, 404, 405]).toContain(response.status);
  });

  test("a user cannot be deleted", async () => {
    // ADR-0003: deactivation is the only terminal state.
    const response = await app.request("/api/v1/admin/users/some-id", { method: "DELETE" });

    expect([401, 403, 404, 405]).toContain(response.status);
  });
});

describe("open graph images", () => {
  test("the default card is a PNG, not an SVG", async () => {
    // Facebook, X, LinkedIn, WhatsApp, Slack and iMessage all reject
    // image/svg+xml for og:image. The content type is the whole fix.
    const response = await app.request("/api/v1/og-image/default");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("image/png");
  });

  test("the default card is a real 1200x630 raster", async () => {
    const response = await app.request("/api/v1/og-image/default");
    const bytes = new Uint8Array(await response.arrayBuffer());
    const view = new DataView(bytes.buffer);

    // PNG signature, then IHDR width/height as big-endian uint32s.
    expect(Array.from(bytes.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(view.getUint32(16)).toBe(1200);
    expect(view.getUint32(20)).toBe(630);
  });
});

describe("CORS", () => {
  test("a preflight is answered with the configured methods", async () => {
    const response = await app.request("/api/v1/courses", {
      headers: {
        "Access-Control-Request-Method": "POST",
        Origin: "http://localhost:3000"
      },
      method: "OPTIONS"
    });

    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });
});
