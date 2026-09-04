import type { JSX, ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { Card, Screen, SkeletonBlock, tabScrollInset } from "@/src/components/ui";
import { CurvedHeader } from "@/src/components/ui-layout";
import { radius, spacing } from "@/src/theme/tokens";
import { makeStyles } from "@/src/theme/theme";

/**
 * Skeletons shaped like the screen behind them.
 *
 * The generic one this replaces drew a title and a stack of identical cards on
 * a bare background, whatever the screen actually was. On the fourteen screens
 * that used it the load then ended in a jump: an indigo header arrived from
 * nowhere, a form appeared where three cards had been, a list of avatars
 * replaced a list of paragraphs. A skeleton that is the wrong shape is worse
 * than none — it makes a promise about the layout and then breaks it.
 *
 * So the pieces here mirror the app's own structures rather than standing in
 * for them: the curved header, the plate, the list row, the form field, the
 * hero cover. A screen composes the ones it is about to render, in the order it
 * renders them, and nothing moves when the data lands.
 */

/** The indigo block a top-level screen opens with, with its title standing in. */
export function SkeletonHeader({
  hasAction = false,
  hasLeading = false,
  overlap = true
}: {
  /** A trailing icon button sits in the header — a bell, a compose key. */
  hasAction?: boolean;
  /** A leading icon button sits in the header — a back key, an avatar. */
  hasLeading?: boolean;
  overlap?: boolean;
}): JSX.Element {
  const styles = useStyles();

  return (
    <CurvedHeader overlap={overlap}>
      <View style={styles.headerRow}>
        {hasLeading ? <SkeletonBlock height={44} style={styles.squircle} tone="onColor" width={44} /> : null}
        <View style={styles.headerText}>
          <SkeletonBlock height={11} tone="onColor" width="30%" />
          <SkeletonBlock height={22} tone="onColor" width="62%" />
        </View>
        {hasAction ? <SkeletonBlock height={44} style={styles.squircle} tone="onColor" width={44} /> : null}
      </View>
    </CurvedHeader>
  );
}

/** A screen heading and its lead line, the way a pushed screen opens. */
export function SkeletonHeading({ hasLead = true }: { hasLead?: boolean }): JSX.Element {
  const styles = useStyles();

  return (
    <View style={styles.heading}>
      <SkeletonBlock height={26} width="55%" />
      {hasLead ? <SkeletonBlock height={14} width="80%" /> : null}
    </View>
  );
}

/**
 * A list of rows: a leading shape, two lines of text, and whatever trails.
 *
 * `avatar` is a circle because circles belong to people; `tile` is the squircle
 * every non-person icon lives in. Getting that wrong is visible even in grey.
 */
export function SkeletonRows({
  hasTrailing = false,
  leading = "tile",
  rows = 4
}: {
  hasTrailing?: boolean;
  leading?: "avatar" | "none" | "tile";
  rows?: number;
}): JSX.Element {
  const styles = useStyles();

  return (
    <View style={styles.rowSheet}>
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} style={styles.row}>
          {leading === "none" ? null : (
            <SkeletonBlock
              height={leading === "avatar" ? 50 : 46}
              style={leading === "avatar" ? styles.circle : styles.squircle}
              width={leading === "avatar" ? 50 : 46}
            />
          )}
          <View style={styles.rowText}>
            <SkeletonBlock height={16} width="52%" />
            <SkeletonBlock height={13} width="78%" />
          </View>
          {hasTrailing ? <SkeletonBlock height={14} width={14} /> : null}
        </View>
      ))}
    </View>
  );
}

/** A plate with a few lines on it — the shape of most cards in the app. */
export function SkeletonCard({
  lines = 2,
  style
}: {
  lines?: number;
  style?: StyleProp<ViewStyle>;
}): JSX.Element {
  const styles = useStyles();

  return (
    <Card style={style}>
      <View style={styles.cardLines}>
        <SkeletonBlock height={18} width="58%" />
        {Array.from({ length: lines }).map((_, index) => (
          <SkeletonBlock height={13} key={index} width={index === lines - 1 ? "64%" : "100%"} />
        ))}
      </View>
    </Card>
  );
}

/** A form: label-and-field pairs on one plate, then the button under it. */
export function SkeletonForm({
  fields = 3,
  hasSubmit = true
}: {
  fields?: number;
  hasSubmit?: boolean;
}): JSX.Element {
  const styles = useStyles();

  return (
    <View style={styles.formWrap}>
      <Card>
        <View style={styles.formFields}>
          {Array.from({ length: fields }).map((_, index) => (
            <View key={index} style={styles.field}>
              <SkeletonBlock height={12} width="34%" />
              <SkeletonBlock height={52} style={styles.input} />
            </View>
          ))}
        </View>
      </Card>
      {hasSubmit ? <SkeletonBlock height={52} style={styles.input} /> : null}
    </View>
  );
}

/** A cover photo with the title block that sits under it. */
export function SkeletonHero({ coverHeight = 220 }: { coverHeight?: number }): JSX.Element {
  const styles = useStyles();

  return (
    <View>
      <SkeletonBlock height={coverHeight} style={styles.cover} />
      <View style={styles.heroBody}>
        <SkeletonBlock height={12} width="26%" />
        <SkeletonBlock height={26} width="80%" />
        <View style={styles.statRow}>
          {[0, 1, 2, 3].map((key) => (
            <SkeletonBlock height={78} key={key} style={styles.stat} />
          ))}
        </View>
        <SkeletonBlock height={13} />
        <SkeletonBlock height={13} width="72%" />
      </View>
    </View>
  );
}

/** A conversation: bubbles alternating sides, and the composer under them. */
export function SkeletonThread({ bubbles = 5 }: { bubbles?: number }): JSX.Element {
  const styles = useStyles();

  return (
    <View style={styles.thread}>
      {Array.from({ length: bubbles }).map((_, index) => (
        <SkeletonBlock
          height={index % 3 === 0 ? 62 : 44}
          key={index}
          style={index % 2 === 0 ? styles.bubbleIn : styles.bubbleOut}
          width={index % 2 === 0 ? "72%" : "58%"}
        />
      ))}
    </View>
  );
}

/** The bar docked to the bottom on a screen with one decision on it. */
export function SkeletonStickyBar(): JSX.Element {
  const styles = useStyles();

  return (
    <View style={styles.sticky}>
      <SkeletonBlock height={20} width="28%" />
      <SkeletonBlock height={52} style={styles.stickyButton} width="55%" />
    </View>
  );
}

/** The body a pushed screen scrolls, with the inset its content would have. */
export function SkeletonBody({
  children,
  tabInset = false
}: {
  children: ReactNode;
  /** True on a tab screen, whose footer has to clear the docked nav bar. */
  tabInset?: boolean;
}): JSX.Element {
  const styles = useStyles();

  return (
    <View style={[styles.body, tabInset ? styles.bodyTabInset : null]}>{children}</View>
  );
}

/** `Screen` and a body, for the screens that draw their own native header. */
export function SkeletonScreen({
  children,
  tabInset = false
}: {
  children: ReactNode;
  tabInset?: boolean;
}): JSX.Element {
  return (
    <Screen>
      <SkeletonBody tabInset={tabInset}>{children}</SkeletonBody>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  body: { flex: 1, gap: spacing.lg, padding: spacing.lg },
  bodyTabInset: { paddingBottom: tabScrollInset },
  bubbleIn: { alignSelf: "flex-start", borderRadius: radius.square },
  bubbleOut: { alignSelf: "flex-end", borderRadius: radius.square },
  cardLines: { gap: spacing.sm },
  circle: { borderRadius: radius.full },
  cover: { borderRadius: 0 },
  field: { gap: spacing.sm },
  formFields: { gap: spacing.lg },
  formWrap: { gap: spacing.lg },
  heading: { gap: spacing.sm },
  headerRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  headerText: { flex: 1, gap: spacing.sm },
  heroBody: { gap: spacing.md, padding: spacing.lg },
  input: { borderRadius: radius.tile },
  row: {
    alignItems: "center",
    borderBottomColor: colors.separator,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 84,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  rowSheet: { backgroundColor: colors.card, borderRadius: radius.square, overflow: "hidden" },
  rowText: { flex: 1, gap: spacing.sm },
  squircle: { borderRadius: radius.tile },
  stat: { borderRadius: radius.square, flex: 1 },
  statRow: { flexDirection: "row", gap: spacing.sm },
  sticky: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.curve,
    borderTopRightRadius: radius.curve,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg
  },
  stickyButton: { borderRadius: radius.tile },
  thread: { gap: spacing.md, padding: spacing.lg }
}));
