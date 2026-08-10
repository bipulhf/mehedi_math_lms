import { describe, expect, test } from "bun:test";

import {
  bannerIdParamsSchema,
  bannersQuerySchema,
  createBannerSchema,
  updateBannerSchema
} from "./banners";

describe("createBannerSchema", () => {
  test("a new banner is active by default", () => {
    expect(createBannerSchema.parse({ message: "20% off all courses" })).toMatchObject({
      isActive: true
    });
  });

  test("requires a message that survives trimming", () => {
    expect(createBannerSchema.safeParse({ message: "   " }).success).toBe(false);
    expect(createBannerSchema.parse({ message: "  Sale ends soon  " }).message).toBe(
      "Sale ends soon"
    );
  });

  test("a link, when present, must be a url", () => {
    expect(
      createBannerSchema.safeParse({ linkUrl: "not-a-url", message: "Sale" }).success
    ).toBe(false);
    expect(
      createBannerSchema.safeParse({ linkUrl: "https://example.com/sale", message: "Sale" })
        .success
    ).toBe(true);
    expect(createBannerSchema.safeParse({ linkUrl: "", message: "Sale" }).success).toBe(true);
  });
});

describe("updateBannerSchema", () => {
  test("every field is optional, but a supplied message still has to be one", () => {
    expect(updateBannerSchema.safeParse({}).success).toBe(true);
    expect(updateBannerSchema.safeParse({ message: "" }).success).toBe(false);
  });
});

describe("bannersQuerySchema", () => {
  test("active only, by default", () => {
    expect(bannersQuerySchema.parse({})).toEqual({ includeInactive: false });
  });

  test("a flag turned off in the URL stays off", () => {
    expect(bannersQuerySchema.parse({ includeInactive: "false" })).toEqual({
      includeInactive: false
    });
  });
});

describe("bannerIdParamsSchema", () => {
  test("guards the path parameter", () => {
    expect(bannerIdParamsSchema.safeParse({ id: "not-a-uuid" }).success).toBe(false);
  });
});
