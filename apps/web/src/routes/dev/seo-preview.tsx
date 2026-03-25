import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMemo, useState, type JSX } from "react";
import { z } from "zod";

import { RouteErrorView } from "@/components/common/route-error";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { seo } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

const searchSchema = z.object({
  description: z.string().optional(),
  path: z.string().optional(),
  title: z.string().optional()
});

export const Route = createFileRoute("/dev/seo-preview")({
  beforeLoad: () => {
    if (import.meta.env.PROD) {
      throw notFound();
    }
  },
  head: () =>
    seo({
      description: "Inspect how Mehedi's Math Academy meta tags render before publishing to production.",
      path: "/dev/seo-preview",
      title: "SEO preview (dev)"
    }),
  validateSearch: (search) => searchSchema.parse(search),
  component: DevSeoPreviewPage,
  errorComponent: RouteErrorView
});

function DevSeoPreviewPage(): JSX.Element {
  const search = Route.useSearch();
  const [path, setPath] = useState(search.path ?? "/");
  const [title, setTitle] = useState(search.title ?? "Sample page");
  const [description, setDescription] = useState(
    search.description ?? siteConfig.description
  );

  const preview = useMemo(
    () =>
      seo({
        description,
        path,
        title
      }),
    [description, path, title]
  );

  return (
    <PublicLayout
      eyebrow="Developer utility"
      title="Share-preview harness"
      subtitle="Tune path, title, and description to see the same head payload TanStack Start would emit on any public route."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant bg-surface-container-low p-4">
          <div className="space-y-2">
            <Label htmlFor="seo-path">Path</Label>
            <Input id="seo-path" value={path} onChange={(event) => setPath(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seo-title">Title</Label>
            <Input id="seo-title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seo-description">Description</Label>
            <Input id="seo-description" value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>
          <Button type="button" variant="outline" onClick={() => setPath("/")}>
            Reset sample
          </Button>
        </div>
        <div className="space-y-3 rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant bg-surface-container-low p-4 text-sm">
          <p className="font-semibold text-on-surface">Computed meta</p>
          <ul className="space-y-2 text-on-surface/80">
            {preview.meta.map((tag, index) => (
              <li key={`meta-${index}`} className="rounded-md bg-surface px-3 py-2 font-mono text-xs">
                {JSON.stringify(tag)}
              </li>
            ))}
          </ul>
          {preview.scripts !== undefined && preview.scripts.length > 0 ? (
            <>
              <p className="font-semibold text-on-surface">JSON-LD (scripts)</p>
              <ul className="space-y-2 text-on-surface/80">
                {preview.scripts.map((tag, index) => (
                  <li key={`script-${index}`} className="rounded-md bg-surface px-3 py-2 font-mono text-xs">
                    {JSON.stringify(tag)}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <p className="font-semibold text-on-surface">Canonical</p>
          <pre className="overflow-x-auto rounded-md bg-surface px-3 py-2 text-xs">{JSON.stringify(preview.links, null, 2)}</pre>
        </div>
      </div>
    </PublicLayout>
  );
}
