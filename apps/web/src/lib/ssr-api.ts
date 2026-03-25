import type { CourseSummary } from "@/lib/api/courses";

interface ApiSuccessEnvelope<TData> {
  data: TData;
  status: "success";
}

function ssrApiBaseUrl(): string {
  const raw = import.meta.env.VITE_SSR_API_BASE_URL;

  if (typeof raw === "string" && raw.length > 0) {
    return raw.replace(/\/$/, "");
  }

  return "http://127.0.0.1:3001/api/v1";
}

export class SsrNotFoundError extends Error {
  public override readonly name = "SsrNotFoundError";

  public constructor() {
    super("Not found");
  }
}

export async function ssrApiGet<TData>(path: string): Promise<TData> {
  const base = ssrApiBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${base}${normalized}`, {
    headers: { Accept: "application/json" }
  });

  if (response.status === 404) {
    throw new SsrNotFoundError();
  }

  if (!response.ok) {
    throw new Error(`SSR request failed: ${response.status}`);
  }

  const body = (await response.json()) as ApiSuccessEnvelope<TData> | { status: "error" };

  if (body.status !== "success") {
    throw new Error("SSR API returned an error");
  }

  return body.data;
}

export async function ssrApiGetCourses(params: {
  categoryId?: string | undefined;
  limit?: number | undefined;
  page?: number | undefined;
  status?: string | undefined;
}): Promise<{ data: readonly CourseSummary[]; pagination: { total: number } }> {
  const base = ssrApiBaseUrl();
  const search = new URLSearchParams();

  if (params.categoryId) {
    search.set("categoryId", params.categoryId);
  }

  if (params.limit !== undefined) {
    search.set("limit", String(params.limit));
  }

  if (params.page !== undefined) {
    search.set("page", String(params.page));
  }

  if (params.status) {
    search.set("status", params.status);
  }

  const query = search.toString();
  const path = query.length > 0 ? `/courses?${query}` : "/courses";
  const response = await fetch(`${base}${path}`, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error(`SSR courses request failed: ${response.status}`);
  }

  const body = (await response.json()) as {
    data: readonly CourseSummary[];
    pagination: { total: number };
    status: "error" | "success";
  };

  if (body.status !== "success") {
    throw new Error("SSR courses API returned an error");
  }

  return { data: body.data, pagination: body.pagination };
}
