import ky from "ky";
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
    prefixUrl: clientEnv.apiBaseUrl,
    hooks: {
      beforeRequest: [
        async (request) => {
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
        async (_request, _options, response) => {
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

export async function apiGet<TData>(path: string): Promise<ApiEnvelope<TData>> {
  return apiClient.get(path).json() as Promise<ApiEnvelope<TData>>;
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
