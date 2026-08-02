import { mobileEnv } from "@/src/lib/env";
import { readSessionCookie } from "@/src/lib/session-store";

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
}

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

async function request<TResponse>(
  path: string,
  init: RequestInit = {}
): Promise<TResponse> {
  const cookie = await readSessionCookie();
  const headers = new Headers(init.headers);

  headers.set("Accept", "application/json");

  if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (cookie) {
    headers.set("Cookie", cookie);
  }

  const response = await fetch(`${mobileEnv.apiBaseUrl}/${path.replace(/^\//, "")}`, {
    ...init,
    headers
  });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<unknown> | null;

  if (!response.ok) {
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
