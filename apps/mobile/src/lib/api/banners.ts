import type { BannerPreset } from "@mma/shared";

import { apiGet } from "@/src/lib/api-client";

/** The site-wide announcement strip an admin publishes. */

export interface Banner {
  backgroundPreset: BannerPreset;
  createdAt: string;
  id: string;
  isActive: boolean;
  linkLabel: string | null;
  linkUrl: string | null;
  message: string;
  updatedAt: string;
}

/** Null when nothing is running, which is the ordinary case rather than an error. */
export async function getActiveBanner(): Promise<Banner | null> {
  return apiGet<Banner | null>("banners/active");
}
