import type { BannerPreset, createBannerSchema, updateBannerSchema } from "@mma/shared";
import type { z } from "zod";

import { buildCacheIndex, buildCacheKey, cacheTtlSeconds, invalidateCacheIndex, readThrough } from "@/lib/cache";
import { sanitizeHtml } from "@/lib/html";
import type { BannerRecord, BannerRepository } from "@/repositories/banner-repository";
import { NotFoundError } from "@/utils/errors";

const BANNER_CACHE_INDEX = buildCacheIndex("banners");
const ACTIVE_BANNER_CACHE_KEY = buildCacheKey("banners", "active");

type CreateBannerInput = z.infer<typeof createBannerSchema>;
type UpdateBannerInput = z.infer<typeof updateBannerSchema>;

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

function normalizeOptionalString(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function mapBanner(record: BannerRecord): Banner {
  return {
    backgroundPreset: record.backgroundPreset,
    createdAt: record.createdAt.toISOString(),
    id: record.id,
    isActive: record.isActive,
    linkLabel: record.linkLabel,
    linkUrl: record.linkUrl,
    message: record.message,
    updatedAt: record.updatedAt.toISOString()
  };
}

export class BannerService {
  public constructor(private readonly bannerRepository: BannerRepository) {}

  private async invalidateBannerCache(): Promise<void> {
    await invalidateCacheIndex(BANNER_CACHE_INDEX);
  }

  public async listBanners(): Promise<readonly Banner[]> {
    const banners = await this.bannerRepository.list();

    return banners.map(mapBanner);
  }

  public async getBannerById(id: string): Promise<Banner> {
    const banner = await this.bannerRepository.findById(id);

    if (!banner) {
      throw new NotFoundError("Banner not found");
    }

    return mapBanner(banner);
  }

  /** The one banner the public site shows: the most recently updated active row. */
  public async getActiveBanner(): Promise<Banner | null> {
    const banner = await readThrough({
      index: BANNER_CACHE_INDEX,
      key: ACTIVE_BANNER_CACHE_KEY,
      load: async () => this.bannerRepository.findLatestActive(),
      ttlSeconds: cacheTtlSeconds.banners
    });

    return banner ? mapBanner(banner) : null;
  }

  public async createBanner(input: CreateBannerInput): Promise<Banner> {
    const createdBanner = await this.bannerRepository.create({
      backgroundPreset: input.backgroundPreset,
      isActive: input.isActive,
      linkLabel: normalizeOptionalString(input.linkLabel),
      linkUrl: normalizeOptionalString(input.linkUrl),
      message: sanitizeHtml(input.message.trim())
    });

    await this.invalidateBannerCache();

    return mapBanner(createdBanner);
  }

  public async updateBanner(id: string, input: UpdateBannerInput): Promise<Banner> {
    const currentBanner = await this.bannerRepository.findById(id);

    if (!currentBanner) {
      throw new NotFoundError("Banner not found");
    }

    const updatedBanner = await this.bannerRepository.update(id, {
      backgroundPreset: input.backgroundPreset ?? currentBanner.backgroundPreset,
      isActive: input.isActive ?? currentBanner.isActive,
      linkLabel:
        input.linkLabel === undefined
          ? currentBanner.linkLabel
          : normalizeOptionalString(input.linkLabel),
      linkUrl:
        input.linkUrl === undefined ? currentBanner.linkUrl : normalizeOptionalString(input.linkUrl),
      message:
        input.message === undefined ? currentBanner.message : sanitizeHtml(input.message.trim())
    });

    if (!updatedBanner) {
      throw new NotFoundError("Banner not found");
    }

    await this.invalidateBannerCache();

    return mapBanner(updatedBanner);
  }

  public async deleteBanner(id: string): Promise<void> {
    const banner = await this.bannerRepository.findById(id);

    if (!banner) {
      throw new NotFoundError("Banner not found");
    }

    await this.bannerRepository.delete(id);
    await this.invalidateBannerCache();
  }
}
