import type { MessageKey } from "@genex/i18n";

export interface SiteNavItem {
  readonly labelKey: MessageKey;
  readonly to: string;
}

/**
 * The public navigation, in one place because the desktop bar and the mobile
 * drawer both render it — a nav that disagrees with itself across a breakpoint
 * is worse than no nav at all.
 *
 * Three items, not the design's five. লাইভ ব্যাচ is cut with the rest of the
 * live-class feature (GENEX_MIGRATION.md §2). ফ্রি ক্লাস joins in Phase 6, once
 * the catalogue can actually filter to courses with a preview lesson — a nav
 * item that lands on an unfiltered list is a link that lies.
 */
export const siteNavItems: readonly SiteNavItem[] = [
  { labelKey: "nav.courses", to: "/courses" },
  { labelKey: "nav.categories", to: "/categories" },
  { labelKey: "nav.teachers", to: "/teachers" }
];
