import { Outlet, createFileRoute } from "@tanstack/react-router";

/**
 * The flat-file-plus-matching-directory layout for everything under
 * `/categories/*` (same convention as `auth.tsx`/`dashboard.tsx`). Both
 * `categories/index.tsx` and `categories/$slug.tsx` already build their own
 * full `PublicLayout` — this route exists only so TanStack Router treats
 * `categories/` as this file's children rather than as unrelated routes, and
 * it must render nothing but `<Outlet />`. It had no `component` at all
 * before, which meant `categories/$slug.tsx` was never mounted for *any*
 * slug: the URL changed on navigation, the loader re-ran, but there was no
 * slot in the tree for its output to appear in.
 */
export const Route = createFileRoute("/categories")({
  component: () => <Outlet />
});
