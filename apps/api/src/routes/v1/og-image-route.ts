import { Hono } from "hono";
import { slugParamsSchema } from "@genex/shared";

import { ogImageService } from "@/lib/container";
import type { AppBindings } from "@/types/app-bindings";
import { NotFoundError } from "@/utils/errors";

export const ogImageRoutes = new Hono<AppBindings>();

const pngHeaders = {
  "Cache-Control": "public, max-age=86400",
  "Content-Type": "image/png"
} as const;

ogImageRoutes.get("/default", (context) => {
  return context.body(ogImageService.defaultPng(), 200, pngHeaders);
});

ogImageRoutes.get("/course/:slug", async (context) => {
  const params = slugParamsSchema.parse({ slug: context.req.param("slug") });

  try {
    const png = await ogImageService.courseOgPng(params.slug);

    return context.body(png, 200, pngHeaders);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return context.notFound();
    }

    throw error;
  }
});

ogImageRoutes.get("/teacher/:slug", async (context) => {
  const params = slugParamsSchema.parse({ slug: context.req.param("slug") });

  try {
    const png = await ogImageService.teacherOgPng(params.slug);

    return context.body(png, 200, pngHeaders);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return context.notFound();
    }

    throw error;
  }
});
