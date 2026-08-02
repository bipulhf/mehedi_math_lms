import { ApiError, apiGet, apiGetPaginated, apiPost, buildQueryString } from "@/src/lib/api-client";
import { clearSessionCookie, readSessionCookie, writeSessionCookie } from "@/src/lib/session-store";

/**
 * Every product request goes through this module, so its two jobs are load
 * bearing: unwrap the envelope, and carry the API's own message out on a
 * failure. A generic "Request failed" here would erase every explanation the
 * server took the trouble to write.
 */

const fetchMock = jest.fn();

function respondWith(body: unknown, init: { status?: number; statusText?: string } = {}): void {
  fetchMock.mockResolvedValueOnce({
    json: async () => body,
    ok: (init.status ?? 200) < 400,
    status: init.status ?? 200,
    statusText: init.statusText ?? "OK"
  });
}

function lastRequestHeaders(): Headers {
  const [, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];

  return new Headers(init.headers);
}

beforeEach(async () => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  await clearSessionCookie();
});

describe("buildQueryString", () => {
  test("omits what was not asked for, rather than sending empty parameters", () => {
    expect(buildQueryString({ limit: 20, page: undefined, search: "" })).toBe("?limit=20");
  });

  test("is empty when nothing survives, so the path stays clean", () => {
    expect(buildQueryString({})).toBe("");
    expect(buildQueryString({ search: undefined })).toBe("");
  });

  test("encodes a value that would otherwise break the query", () => {
    expect(buildQueryString({ search: "a b&c" })).toBe("?search=a+b%26c");
  });
});

describe("apiGet", () => {
  test("returns the envelope's data rather than the envelope", async () => {
    respondWith({ data: { id: "course-1" }, status: "success" });

    await expect(apiGet<{ id: string }>("courses/course-1")).resolves.toEqual({ id: "course-1" });
  });

  test("replays the stored session cookie, because React Native has no cookie jar", async () => {
    await writeSessionCookie("better-auth.session_token=abc");
    respondWith({ data: null, status: "success" });

    await apiGet("profiles/me");

    expect(lastRequestHeaders().get("Cookie")).toBe("better-auth.session_token=abc");
  });

  test("sends no Cookie header at all when signed out", async () => {
    respondWith({ data: [], status: "success" });

    await apiGet("courses");

    expect(lastRequestHeaders().has("Cookie")).toBe(false);
  });
});

describe("apiGetPaginated", () => {
  test("keeps the pagination block, which the caller needs and the data does not carry", async () => {
    respondWith({
      data: [{ id: "course-1" }],
      pagination: { limit: 20, page: 1, pages: 3, total: 41 },
      status: "success"
    });

    await expect(apiGetPaginated("courses")).resolves.toMatchObject({
      pagination: { pages: 3, total: 41 }
    });
  });
});

describe("failures", () => {
  test("throws ApiError carrying the API's own message and status", async () => {
    respondWith(
      { message: "Complete your profile before enrolling", status: "error" },
      {
        status: 403
      }
    );

    await expect(apiPost("enrollments", { courseId: "course-1" })).rejects.toMatchObject({
      message: "Complete your profile before enrolling",
      name: "ApiError",
      status: 403
    });
  });

  test("falls back to the status text when a proxy answered instead of the API", async () => {
    // A 502 from a load balancer is not in the envelope. Without this the alert
    // would be blank, which reads as the app being broken rather than the link.
    fetchMock.mockResolvedValueOnce({
      json: async () => {
        throw new SyntaxError("Unexpected token < in JSON");
      },
      ok: false,
      status: 502,
      statusText: "Bad Gateway"
    });

    await expect(apiGet("courses")).rejects.toThrow("Bad Gateway");
  });

  test("an ApiError is recognisable by instance, which is what the retry rule keys on", async () => {
    respondWith({ message: "Not found", status: "error" }, { status: 404 });

    await expect(apiGet("courses/missing")).rejects.toBeInstanceOf(ApiError);
  });

  test("a request that never reached a server says so, rather than 'Network request failed'", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Network request failed"));

    const error = (await apiGet("courses").catch((cause: unknown) => cause)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.isOffline).toBe(true);
    expect(error.message).toContain("offline");
  });

  test("a server error is not offline, so the two are not treated alike", async () => {
    respondWith({ message: "Boom", status: "error" }, { status: 500 });

    const error = (await apiGet("courses").catch((cause: unknown) => cause)) as ApiError;

    expect(error.isOffline).toBe(false);
  });

  test("a 401 drops the stored cookie, so the app lands on sign-in rather than looping", async () => {
    // A session can end anywhere — expired while backgrounded, or revoked. If
    // the cookie survived, every screen would keep replaying it and keep
    // getting 401s, with nothing telling the app to ask for a sign-in.
    await writeSessionCookie("better-auth.session_token=expired");
    respondWith({ message: "Unauthorized", status: "error" }, { status: 401 });

    await expect(apiGet("profiles/me")).rejects.toBeInstanceOf(ApiError);
    await expect(readSessionCookie()).resolves.toBeNull();
  });

  test("a 403 keeps the cookie: the session is fine, the permission is not", async () => {
    await writeSessionCookie("better-auth.session_token=valid");
    respondWith({ message: "Only students can enroll", status: "error" }, { status: 403 });

    await expect(apiGet("enrollments/me")).rejects.toBeInstanceOf(ApiError);
    await expect(readSessionCookie()).resolves.toBe("better-auth.session_token=valid");
  });
});
