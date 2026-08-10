import { banners, db, desc, eq } from "@genex/db";

export interface BannerRecord {
  createdAt: Date;
  id: string;
  isActive: boolean;
  linkLabel: string | null;
  linkUrl: string | null;
  message: string;
  updatedAt: Date;
}

export interface CreateBannerInput {
  isActive: boolean;
  linkLabel: string | null;
  linkUrl: string | null;
  message: string;
}

export type UpdateBannerInput = CreateBannerInput;

const bannerColumns = {
  createdAt: banners.createdAt,
  id: banners.id,
  isActive: banners.isActive,
  linkLabel: banners.linkLabel,
  linkUrl: banners.linkUrl,
  message: banners.message,
  updatedAt: banners.updatedAt
};

export class BannerRepository {
  public async list(): Promise<readonly BannerRecord[]> {
    return db.select(bannerColumns).from(banners).orderBy(desc(banners.updatedAt));
  }

  public async findById(id: string): Promise<BannerRecord | null> {
    const rows = await db.select(bannerColumns).from(banners).where(eq(banners.id, id)).limit(1);

    return rows[0] ?? null;
  }

  public async findLatestActive(): Promise<BannerRecord | null> {
    const rows = await db
      .select(bannerColumns)
      .from(banners)
      .where(eq(banners.isActive, true))
      .orderBy(desc(banners.updatedAt))
      .limit(1);

    return rows[0] ?? null;
  }

  public async create(input: CreateBannerInput): Promise<BannerRecord> {
    const rows = await db
      .insert(banners)
      .values({
        isActive: input.isActive,
        linkLabel: input.linkLabel,
        linkUrl: input.linkUrl,
        message: input.message
      })
      .returning(bannerColumns);

    const createdBanner = rows[0];

    if (!createdBanner) {
      throw new Error("Failed to create banner");
    }

    return createdBanner;
  }

  public async update(id: string, input: UpdateBannerInput): Promise<BannerRecord | null> {
    const rows = await db
      .update(banners)
      .set({
        isActive: input.isActive,
        linkLabel: input.linkLabel,
        linkUrl: input.linkUrl,
        message: input.message,
        updatedAt: new Date()
      })
      .where(eq(banners.id, id))
      .returning(bannerColumns);

    return rows[0] ?? null;
  }

  public async delete(id: string): Promise<void> {
    await db.delete(banners).where(eq(banners.id, id));
  }
}
