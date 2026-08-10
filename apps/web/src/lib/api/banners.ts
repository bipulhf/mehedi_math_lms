import type { createBannerSchema, updateBannerSchema } from "@genex/shared";
import type { z } from "zod";

import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";

export interface Banner {
  createdAt: string;
  id: string;
  isActive: boolean;
  linkLabel: string | null;
  linkUrl: string | null;
  message: string;
  updatedAt: string;
}

export type CreateBannerInput = z.infer<typeof createBannerSchema>;
export type UpdateBannerInput = z.infer<typeof updateBannerSchema>;

export async function listBanners(): Promise<readonly Banner[]> {
  const response = await apiGet<readonly Banner[]>("banners");

  return response.data;
}

export async function getActiveBanner(): Promise<Banner | null> {
  const response = await apiGet<Banner | null>("banners/active");

  return response.data;
}

export async function createBanner(values: CreateBannerInput): Promise<Banner> {
  const response = await apiPost<CreateBannerInput, Banner>("banners", values);

  return response.data;
}

export async function updateBanner(id: string, values: UpdateBannerInput): Promise<Banner> {
  const response = await apiPut<UpdateBannerInput, Banner>(`banners/${id}`, values);

  return response.data;
}

export async function deleteBanner(id: string): Promise<{ id: string }> {
  const response = await apiDelete<{ id: string }>(`banners/${id}`);

  return response.data;
}
