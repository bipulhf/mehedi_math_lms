import type { MessageKey } from "@mma/i18n";

export interface SiteNavItem {
  readonly labelKey: MessageKey;
  /** Query params the link carries, e.g. the free-class filter. */
  readonly search?: Readonly<Record<string, boolean>> | undefined;
  readonly to: string;
}

/**
 * The public navigation, in one place because the desktop bar and the mobile
 * drawer both render it — a nav that disagrees with itself across a breakpoint
 * is worse than no nav at all.
 *
 * Four items, not the design's five: লাইভ ব্যাচ is cut with the rest of the
 * live-class feature.
 */
export const siteNavItems: readonly SiteNavItem[] = [
  { labelKey: "nav.courses", to: "/courses" },
  { labelKey: "nav.categories", to: "/categories" },
  { labelKey: "nav.teachers", to: "/teachers" },
  // ফ্রি ক্লাস is the catalogue narrowed to courses with a preview lesson,
  // rather than a page of its own — the lessons live inside those courses.
  { labelKey: "nav.freeClasses", search: { free: true }, to: "/courses" }
];

/**
 * Which nav item the current URL belongs to.
 *
 * Router-level `activeProps` cannot answer this: কোর্স and ফ্রি ক্লাস share the
 * `/courses` path and differ only by `?free=true`, so a path-only test lights
 * both at once. Two items highlighted is worse than none — it tells the reader
 * the nav does not know where they are.
 */
export function isSiteNavItemActive(
  item: SiteNavItem,
  pathname: string,
  search: Readonly<Record<string, unknown>>
): boolean {
  const isFreeFilter = search.free === true;

  if (item.to === "/courses") {
    const wantsFreeFilter = item.search?.free === true;

    return pathname.startsWith("/courses") && wantsFreeFilter === isFreeFilter;
  }

  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}
