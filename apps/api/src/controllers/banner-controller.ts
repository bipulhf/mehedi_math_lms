import type { Context } from "hono";

import type { BannerService } from "@/services/banner-service";
import type { AppBindings } from "@/types/app-bindings";
import { success } from "@/utils/response";

export class BannerController {
  public constructor(private readonly bannerService: BannerService) {}

  public async listBanners(context: Context<AppBindings>): Promise<Response> {
    const banners = await this.bannerService.listBanners();

    return success(context, banners);
  }

  public async getActiveBanner(context: Context<AppBindings>): Promise<Response> {
    const banner = await this.bannerService.getActiveBanner();

    return success(context, banner);
  }

  public async getBannerById(context: Context<AppBindings>, id: string): Promise<Response> {
    const banner = await this.bannerService.getBannerById(id);

    return success(context, banner);
  }

  public async createBanner(
    context: Context<AppBindings>,
    input: Parameters<BannerService["createBanner"]>[0]
  ): Promise<Response> {
    const banner = await this.bannerService.createBanner(input);

    return success(context, banner, 201, "Banner created successfully");
  }

  public async updateBanner(
    context: Context<AppBindings>,
    id: string,
    input: Parameters<BannerService["updateBanner"]>[1]
  ): Promise<Response> {
    const banner = await this.bannerService.updateBanner(id, input);

    return success(context, banner, 200, "Banner updated successfully");
  }

  public async deleteBanner(context: Context<AppBindings>, id: string): Promise<Response> {
    await this.bannerService.deleteBanner(id);

    return success(context, { id }, 200, "Banner deleted successfully");
  }
}
