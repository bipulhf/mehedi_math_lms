import type { Formatters, Translator } from "@mma/i18n";
import { Link } from "expo-router";
import type { JSX } from "react";
import { memo, useMemo, useState } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";

import { Badge, Card, CoverImage, SkeletonBlock } from "@/src/components/ui";
import { PriceText, RatingMark } from "@/src/components/ui-display";
import type { CourseSummary } from "@/src/lib/api/courses";
import { useFormat, useT } from "@/src/lib/locale";
import { fonts, spacing } from "@/src/theme/tokens";
import { makeStyles } from "@/src/theme/theme";

/**
 * The catalogue grid: two courses to a row, and the geometry that keeps them
 * looking like a grid rather than two lists that happen to sit side by side.
 *
 * Three measurements do that work and are named here rather than left to fall
 * out of two `spacing.sm` values that happened to add up:
 *
 * - `GRID_INSET` is the screen's own inset, the same `spacing.lg` the header,
 *   the chip strip and the result line use, so the grid's outer edge lands on
 *   the same rule as everything above it.
 * - `GRID_GUTTER` is deliberately *smaller* than the inset. A gutter as wide as
 *   the margin makes the two columns read as two separate lists; a tighter one
 *   binds them into a block.
 * - `GRID_ROW_GAP` is larger than the gutter, because the tiles are taller than
 *   they are wide and rows need more air than columns to stay distinct.
 */
const GRID_INSET = spacing.lg;
const GRID_GUTTER = spacing.md;
const GRID_ROW_GAP = spacing.lg;

/** Cover height as a share of the column: a calm 3:2, not a letterbox. */
const COVER_RATIO = 0.66;

/** Two lines of `tileTitle`, reserved whether or not the title needs them. */
const TITLE_BLOCK_HEIGHT = 42;

/**
 * The tile's `Pressable` style, as a **plain object** and nothing else.
 *
 * `Link asChild` renders its child through Radix's `Slot`, which merges the
 * child's style with `{ ...slotStyle, ...childStyle }`
 * (`@radix-ui/react-slot/dist/index.js:136`). Spreading is only meaningful for
 * a plain object: React Native's function form, `({ pressed }) => [...]`,
 * spreads to `{}` and the style is silently thrown away — no error, no warning,
 * the tile just never receives it. An array throws outright in development.
 *
 * So nothing inside a `Link asChild` may use the array or function form, and
 * the pressed state has to be tracked by hand and applied further down, on a
 * view the `Slot` does not touch.
 */
const TILE_PRESSABLE_STYLE = { flex: 1, width: "100%" } as const;

export interface CoursePair {
  key: string;
  left: CourseSummary;
  right: CourseSummary | null;
}

export interface CourseGridMetrics {
  columnWidth: number;
  coverHeight: number;
  rowWidth: number;
}

/**
 * Every width in the grid is measured from the window and then set outright —
 * the row's, the column's, the cover's. Nothing here resolves from flex.
 *
 * That is not belt-and-braces, it is the bug. A `FlashList` cell is not
 * constrained to the screen, and `flex: 1` in React Native means
 * `flexBasis: 0%`, which against an indefinite parent degrades to `auto` —
 * content width. So each tile ended up as wide as its own **title**: the course
 * called "Freelancing: your first client" got a wide tile and the one called
 * "সাপ্তাহিক মক টেস্ট ব্যাচ" got a narrow one, and the two rows disagreed with
 * each other as well. Giving the row a definite width is what stops the chain
 * from ever reaching content again.
 *
 * The cover then follows the column rather than sitting at a fixed height. A
 * fixed height is a different crop on every handset — nearly square on a 320pt
 * screen, a letterbox on a 430pt one.
 */
export function useCourseGridMetrics(): CourseGridMetrics {
  const { width } = useWindowDimensions();

  // Memoised so the object is stable between renders: it is a dependency of the
  // list's `renderItem`, and a fresh one every render re-renders every row.
  return useMemo(() => {
    const columnWidth = Math.max(0, Math.floor((width - GRID_INSET * 2 - GRID_GUTTER) / 2));

    return {
      columnWidth,
      coverHeight: Math.round(columnWidth * COVER_RATIO),
      rowWidth: width
    };
  }, [width]);
}

/** The one meta line a grid tile has room for: lessons, then free lessons. */
function courseMetaLine(
  course: CourseSummary,
  t: Translator,
  format: Formatters
): string {
  const parts: string[] = [];

  if (course.stats.lectureCount > 0) {
    parts.push(t("course.lessons", { count: format.number(course.stats.lectureCount) }));
  }

  if (course.stats.freeLessonCount > 0) {
    parts.push(t("course.freeLessons", { count: format.number(course.stats.freeLessonCount) }));
  }

  return parts.join(" · ");
}

/** Rows of two, so the list item is always a full row. */
export function pairCourses(courses: readonly CourseSummary[]): CoursePair[] {
  const rows: CoursePair[] = [];

  for (let index = 0; index < courses.length; index += 2) {
    const left = courses[index];

    if (left === undefined) {
      break;
    }

    rows.push({ key: left.id, left, right: courses[index + 1] ?? null });
  }

  return rows;
}

/**
 * A catalogue tile.
 *
 * The catalogue is a **two-column grid**, not a stack of full-width cards: a
 * student browsing is comparing courses, and a list that shows one and a half
 * of them at a time makes comparing impossible. What survives the narrower
 * column is what actually decides a tap — the cover, the name, the price.
 *
 * Comparing is also why the tile is built to a fixed rhythm rather than to its
 * own content. The title block reserves two lines and the meta line reserves
 * one whether or not there is anything to put in them, and the price row is
 * pushed to the bottom with `marginTop: "auto"`. Two tiles side by side then
 * agree on where the name ends and where the price sits, so the eye reads
 * across the row instead of hunting down each card in turn.
 */
export const CourseTile = memo(function CourseTile({
  course,
  metrics
}: {
  course: CourseSummary;
  metrics: CourseGridMetrics;
}): JSX.Element {
  const styles = useStyles();
  const t = useT();
  const format = useFormat();
  const [isPressed, setIsPressed] = useState(false);
  const meta = courseMetaLine(course, t, format);

  return (
    // The width lives out here, on a view of our own, because anything handed
    // to the `Pressable` below goes through `Slot` — see TILE_PRESSABLE_STYLE.
    <View style={[styles.tileWrap, { width: metrics.columnWidth }]}>
      <Link asChild href={{ params: { courseId: course.slug }, pathname: "/courses/[courseId]" }}>
        <Pressable
          accessibilityLabel={course.title}
          accessibilityRole="link"
          onPressIn={() => setIsPressed(true)}
          onPressOut={() => setIsPressed(false)}
          style={TILE_PRESSABLE_STYLE}
        >
          <Card flush style={[styles.tile, isPressed ? styles.pressed : null]}>
            <View>
              <CoverImage bleed height={metrics.coverHeight} uri={course.coverImageUrl} />
              {course.isExamOnly ? (
                <View style={styles.tileFlag}>
                  <Badge tone="attention">{t("course.examOnly")}</Badge>
                </View>
              ) : null}
            </View>
            <View style={styles.tileBody}>
              {course.category ? (
                <Text numberOfLines={1} style={styles.tileCategory}>
                  {course.category.name}
                </Text>
              ) : null}
              <Text numberOfLines={2} style={styles.tileTitle}>
                {course.title}
              </Text>
              <Text numberOfLines={1} style={styles.tileMeta}>
                {meta}
              </Text>
              <View style={styles.tileFoot}>
                {/* `md`, not the full-width `lg`: a 20pt price and a rating do
                    not both fit across half a phone without one of them
                    squeezing. */}
                <PriceText amount={course.price} size="md" />
                {course.stats.reviewCount > 0 ? (
                  <RatingMark value={course.stats.reviewAverage ?? 0} />
                ) : null}
              </View>
            </View>
          </Card>
        </Pressable>
      </Link>
    </View>
  );
});

/**
 * Two tiles on one row, and that row is what the list recycles.
 *
 * FlashList's own `numColumns` is not used here. A recycled item must not carry
 * `flex: 1` — the list warns about it, and a flexed tile measures wrong in a
 * column cell, which put every course in the left column and left the right one
 * empty. Owning the row means the halves are ours to size and the list only
 * ever sees a full-width item.
 */
export const CourseGridRow = memo(function CourseGridRow({
  metrics,
  pair
}: {
  metrics: CourseGridMetrics;
  pair: CoursePair;
}): JSX.Element {
  const styles = useStyles();

  return (
    <View style={[styles.gridRow, { width: metrics.rowWidth }]}>
      <CourseTile course={pair.left} metrics={metrics} />
      {pair.right === null ? (
        // The odd tile keeps its half of the row rather than stretching across it.
        <View style={{ width: metrics.columnWidth }} />
      ) : (
        <CourseTile course={pair.right} metrics={metrics} />
      )}
    </View>
  );
});

/**
 * The loading grid, measured from the same constants as the real one.
 *
 * A skeleton that is a different shape from what replaces it is a jump, not a
 * loading state — the point of it is that nothing moves when the data lands.
 */
export function CourseGridSkeleton({ rows = 3 }: { rows?: number }): JSX.Element {
  const styles = useStyles();
  const { columnWidth, coverHeight, rowWidth } = useCourseGridMetrics();

  return (
    <View>
      {Array.from({ length: rows }).map((_, row) => (
        <View key={row} style={[styles.gridRow, { width: rowWidth }]}>
          {[0, 1].map((column) => (
            <View key={column} style={[styles.tileWrap, { width: columnWidth }]}>
              <Card flush style={styles.tile}>
                <SkeletonBlock height={coverHeight} />
                <View style={styles.tileBody}>
                  <SkeletonBlock height={10} width="45%" />
                  <SkeletonBlock height={14} width="95%" />
                  <SkeletonBlock height={14} width="60%" />
                  <SkeletonBlock height={12} width="50%" />
                  <View style={styles.tileFoot}>
                    <SkeletonBlock height={18} width="45%" />
                  </View>
                </View>
              </Card>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  gridRow: {
    flexDirection: "row",
    gap: GRID_GUTTER,
    marginBottom: GRID_ROW_GAP,
    // The inset lives on the row, not on the list's content container, so the
    // header above it keeps its own padding and the banner keeps its bleed.
    paddingHorizontal: GRID_INSET
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  tile: { flex: 1, width: "100%" },
  tileBody: { flex: 1, gap: spacing.xs, padding: spacing.md },
  tileCategory: {
    // Muted, not accent: accent is the control colour, and a category is not
    // something the student can press.
    color: colors.muted,
    fontFamily: fonts.monoLabel,
    fontSize: 10,
    letterSpacing: 0.8,
    lineHeight: 14,
    textTransform: "uppercase"
  },
  tileFlag: { left: spacing.sm, position: "absolute", top: spacing.sm },
  tileFoot: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    // Pinned to the bottom of the card so the price sits on one line across the
    // row however tall the title above it turned out to be.
    marginTop: "auto",
    paddingTop: spacing.sm
  },
  tileMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
  tileTitle: {
    color: colors.ink,
    fontFamily: fonts.displayBold,
    fontSize: 15,
    lineHeight: 21,
    minHeight: TITLE_BLOCK_HEIGHT
  },
  // Width comes from `useCourseGridMetrics` at the call site, never from flex.
  tileWrap: { flexGrow: 0, flexShrink: 0 }
}));
