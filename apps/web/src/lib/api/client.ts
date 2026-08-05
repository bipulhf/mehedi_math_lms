import ky, { HTTPError } from "ky";
import { toast } from "sonner";

import { clientEnv } from "@/lib/env";

export interface ApiEnvelope<TData> {
  data: TData;
  message?: string;
  status: "success" | "error";
}

export interface PaginatedEnvelope<TData> extends ApiEnvelope<readonly TData[]> {
  pagination: {
    limit: number;
    page: number;
    pages: number;
    total: number;
  };
}

export interface PaginatedApiResponse<TData> {
  data: readonly TData[];
  pagination: {
    limit: number;
    page: number;
    pages: number;
    total: number;
  };
  status: "success";
}

export interface ApiClientOptions {
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
}

async function mergeHeaders(getHeaders?: ApiClientOptions["getHeaders"]): Promise<HeadersInit | undefined> {
  if (!getHeaders) {
    return undefined;
  }

  return getHeaders();
}

export function createApiClient(options: ApiClientOptions = {}): typeof ky {
  return ky.create({
    credentials: "include",
    prefix: clientEnv.apiBaseUrl,
    hooks: {
      beforeRequest: [
        async ({ request }) => {
          const headers = await mergeHeaders(options.getHeaders);

          if (!headers) {
            return;
          }

          const mergedHeaders = new Headers(headers);

          mergedHeaders.forEach((value, key) => {
            request.headers.set(key, value);
          });
        }
      ],
      afterResponse: [
        async ({ response }) => {
          if (response.ok || typeof window === "undefined") {
            return;
          }

          const payload = await response
            .clone()
            .json()
            .catch(() => null) as ApiEnvelope<null> | null;

          toast.error(payload?.message ?? "Something went wrong. Please try again.");
        }
      ]
    }
  });
}

export const apiClient = createApiClient();

/**
 * The sentence the server wrote, or the caller's fallback.
 *
 * ky's own message is "Request failed with status code 403 Forbidden: POST
 * http://localhost:3001/api/v1/tests/…", which is a stack trace wearing a
 * sentence. Every error response from this API carries a `message` written for
 * a reader; this is how a screen gets at it.
 */
export async function apiErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (!(error instanceof HTTPError)) {
    return fallback;
  }

  const payload = (await error.response
    .clone()
    .json()
    .catch(() => null)) as ApiEnvelope<null> | null;

  return payload?.message ?? fallback;
}

export async function apiGet<TData>(path: string): Promise<ApiEnvelope<TData>> {
  return apiClient.get(path).json() as Promise<ApiEnvelope<TData>>;
}

export async function apiGetPaginated<TData>(
  path: string,
  query?: { limit?: number; page?: number }
): Promise<PaginatedApiResponse<TData>> {
  const searchParams: Record<string, string> = {};

  if (query?.page !== undefined) {
    searchParams.page = String(query.page);
  }

  if (query?.limit !== undefined) {
    searchParams.limit = String(query.limit);
  }

  return apiClient
    .get(path, { searchParams })
    .json() as Promise<PaginatedApiResponse<TData>>;
}

export async function apiPost<TBody, TData>(path: string, json: TBody): Promise<ApiEnvelope<TData>> {
  return apiClient.post(path, { json }).json() as Promise<ApiEnvelope<TData>>;
}

export async function apiPut<TBody, TData>(path: string, json: TBody): Promise<ApiEnvelope<TData>> {
  return apiClient.put(path, { json }).json() as Promise<ApiEnvelope<TData>>;
}

export async function apiPatch<TBody, TData>(path: string, json: TBody): Promise<ApiEnvelope<TData>> {
  return apiClient.patch(path, { json }).json() as Promise<ApiEnvelope<TData>>;
}

export async function apiDelete<TData>(path: string): Promise<ApiEnvelope<TData>> {
  return apiClient.delete(path).json() as Promise<ApiEnvelope<TData>>;
}
