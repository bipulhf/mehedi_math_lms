import type { MessageKey } from "@genex/i18n";

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
 * live-class feature (GENEX_MIGRATION.md §2).
 */
export const siteNavItems: readonly SiteNavItem[] = [
  { labelKey: "nav.courses", to: "/courses" },
  { labelKey: "nav.categories", to: "/categories" },
  { labelKey: "nav.teachers", to: "/teachers" },
  // ফ্রি ক্লাস is the catalogue narrowed to courses with a preview lesson,
  // rather than a page of its own — the lessons live inside those courses.
  { labelKey: "nav.freeClasses", search: { free: true }, to: "/courses" }
];
