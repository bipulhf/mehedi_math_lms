import { deviceIdHeader, devicePlatformHeader } from "@mma/shared";

import { readDeviceId, readDevicePlatform } from "@/src/lib/device-id";
import { mobileEnv } from "@/src/lib/env";
import { clearSessionCookie, readSessionCookie } from "@/src/lib/session-store";

const UNAUTHORIZED_STATUS = 401;

/** Mirrors `apps/api/src/utils/response.ts`. */
export interface ApiEnvelope<TData> {
  data: TData;
  message?: string;
  status: "success" | "error";
}

export interface PaginatedEnvelope<TData> {
  data: readonly TData[];
  pagination: { limit: number; page: number; pages: number; total: number };
  status: "success";
}

export class ApiError extends Error {
  public constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }

  /**
   * `status` is 0 when the request never reached a server. A phone loses signal
   * constantly, and "You appear to be offline" is a different thing to tell a
   * student than "the server said no".
   */
  public get isOffline(): boolean {
    return this.status === OFFLINE_STATUS;
  }
}

export const OFFLINE_STATUS = 0;

type QueryValue = boolean | number | string | undefined;

export function buildQueryString(query: Record<string, QueryValue> = {}): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === "") {
      continue;
    }

    params.set(key, String(value));
  }

  const serialised = params.toString();

  return serialised.length > 0 ? `?${serialised}` : "";
}

/**
 * A phone on a degraded connection can open the TCP connection and then never
 * hear back — `fetch` has no default timeout, so that hangs the request (and
 * every screen waiting on it) forever rather than failing. This is the ceiling
 * on how long a screen is allowed to sit on a skeleton before it is told the
 * same "offline" story a lost signal gets.
 */
export const REQUEST_TIMEOUT_MS = 15_000;

async function request<TResponse>(path: string, init: RequestInit = {}): Promise<TResponse> {
  const cookie = await readSessionCookie();
  const headers = new Headers(init.headers);

  headers.set("Accept", "application/json");
  // Which handset this is. The device limit is counted where a session is
  // created, but the header rides along on everything -- one place to set it
  // beats remembering which call is a sign-in. ADR-0019.
  headers.set(deviceIdHeader, await readDeviceId());
  headers.set(devicePlatformHeader, readDevicePlatform());

  if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (cookie) {
    headers.set("Cookie", cookie);
  }

  let response: Response;

  try {
    response = await fetch(`${mobileEnv.apiBaseUrl}/${path.replace(/^\//, "")}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch {
    // `fetch` rejects rather than resolving when there is no route to the
    // server, and `AbortSignal.timeout` rejects the same way once the clock
    // above runs out. Left unhandled this surfaces as "Network request
    // failed" or "Aborted", which reads as a broken app rather than a missing
    // signal.
    throw new ApiError(
      "You appear to be offline. This needs a connection — try again in a moment.",
      OFFLINE_STATUS
    );
  }

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<unknown> | null;

  if (!response.ok) {
    if (response.status === UNAUTHORIZED_STATUS) {
      // The session ended somewhere other than the session query — expired
      // while backgrounded, or revoked. Dropping the cookie makes the next
      // session read return null, which is what sends the app to sign-in
      // instead of leaving a screen looping 401s.
      await clearSessionCookie();
    }

    // The API always answers in the envelope, so its own message is the best
    // thing to surface. Falling back to the status text keeps a proxy error
    // from becoming a blank alert.
    throw new ApiError(payload?.message ?? response.statusText, response.status);
  }

  return payload as TResponse;
}

export async function apiGet<TData>(path: string): Promise<TData> {
  const envelope = await request<ApiEnvelope<TData>>(path);

  return envelope.data;
}

export async function apiGetPaginated<TData>(path: string): Promise<PaginatedEnvelope<TData>> {
  return request<PaginatedEnvelope<TData>>(path);
}

export async function apiPost<TBody, TData>(path: string, body?: TBody): Promise<TData> {
  const envelope = await request<ApiEnvelope<TData>>(path, {
    body: JSON.stringify(body ?? {}),
    method: "POST"
  });

  return envelope.data;
}

export async function apiPut<TBody, TData>(path: string, body: TBody): Promise<TData> {
  const envelope = await request<ApiEnvelope<TData>>(path, {
    body: JSON.stringify(body),
    method: "PUT"
  });

  return envelope.data;
}

export async function apiPatch<TBody, TData>(path: string, body: TBody): Promise<TData> {
  const envelope = await request<ApiEnvelope<TData>>(path, {
    body: JSON.stringify(body),
    method: "PATCH"
  });

  return envelope.data;
}

export async function apiDelete<TData>(path: string): Promise<TData> {
  const envelope = await request<ApiEnvelope<TData>>(path, { method: "DELETE" });

  return envelope.data;
}
