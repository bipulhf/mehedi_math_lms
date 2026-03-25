import { Hono } from "hono";
import { slugParamsSchema } from "@mma/shared";

import { ogImageService } from "@/lib/container";
import type { AppBindings } from "@/types/app-bindings";
import { NotFoundError } from "@/utils/errors";

export const ogImageRoutes = new Hono<AppBindings>();

const svgHeaders = {
  "Cache-Control": "public, max-age=86400",
  "Content-Type": "image/svg+xml; charset=utf-8"
} as const;

ogImageRoutes.get("/default", (context) => {
  const svg = ogImageService.defaultSvg();

  return context.text(svg, 200, svgHeaders);
});

ogImageRoutes.get("/course/:slug", async (context) => {
  const params = slugParamsSchema.parse({ slug: context.req.param("slug") });

  try {
    const svg = await ogImageService.courseOgSvg(params.slug);

    return context.text(svg, 200, svgHeaders);
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
    const svg = await ogImageService.teacherOgSvg(params.slug);

    return context.text(svg, 200, svgHeaders);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return context.notFound();
    }

    throw error;
  }
});
