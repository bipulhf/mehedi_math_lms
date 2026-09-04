import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { Redirect, Stack, useRouter } from "expo-router";
import type { JSX } from "react";
import { memo, useCallback } from "react";
import { Text, View } from "react-native";

import {
  Badge,
  Card,
  EmptyState,
  IconButton,
  Screen,
  SkeletonBlock
} from "@/src/components/ui";
import {
  SkeletonBody,
  SkeletonCard,
  SkeletonHeader,
  SkeletonRows
} from "@/src/components/skeletons";
import { CurvedHeader, HeaderBar } from "@/src/components/ui-layout";
import { IconTile } from "@/src/components/ui-display";
import { listMyPayments, type PaymentHistoryItem } from "@/src/lib/api/payments";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { useSession } from "@/src/lib/use-session";
import { fonts, layout, radius, spacing, type TintName } from "@/src/theme/tokens";
import { makeStyles } from "@/src/theme/theme";

/**
 * What the student has paid, and what is still owed.
 *
 * The screen opens with the total rather than with a list, because that is the
 * number anybody comes here to check. Each payment below it is one row with the
 * outcome in colour — paid green, waiting gold, failed coral — so the history
 * reads without being read.
 */

const STATUS_LABEL = {
  FAILED: "pay.failed",
  PENDING: "pay.pending",
  REFUNDED: "pay.refunded",
  SUCCESS: "pay.success"
} as const;

const STATUS_LOOK: Record<
  PaymentHistoryItem["status"],
  {
    icon: "card" | "checkmark-circle" | "close-circle" | "time";
    tint: TintName;
    tone: "attention" | "danger" | "info" | "success";
  }
> = {
  FAILED: { icon: "close-circle", tint: "coral", tone: "danger" },
  PENDING: { icon: "time", tint: "gold", tone: "attention" },
  REFUNDED: { icon: "card", tint: "sky", tone: "info" },
  SUCCESS: { icon: "checkmark-circle", tint: "mint", tone: "success" }
};

const PaymentRow = memo(function PaymentRow({ item }: { item: PaymentHistoryItem }): JSX.Element {
  const styles = useStyles();
  const t = useT();
  const format = useFormat();
  const look = STATUS_LOOK[item.status];

  return (
    <View style={styles.row}>
      <IconTile icon={look.icon} size={44} tint={look.tint} />
      <View style={styles.rowText}>
        <Text numberOfLines={2} style={styles.rowTitle}>
          {item.course.title}
        </Text>
        <Text style={styles.rowMeta}>{format.dateTime(item.createdAt)}</Text>
        <View style={styles.rowFoot}>
          <Badge tone={look.tone}>{t(STATUS_LABEL[item.status])}</Badge>
          <Text numberOfLines={1} style={styles.transaction}>
            {item.transactionId}
          </Text>
        </View>
      </View>
      <Text style={styles.amount}>{format.currency(item.amount)}</Text>
    </View>
  );
});

function PaymentsSkeleton(): JSX.Element {
  const styles = useStyles();

  return (
    <View style={styles.sheet}>
      {[0, 1, 2, 3].map((key) => (
        <View key={key} style={styles.row}>
          <SkeletonBlock height={44} style={styles.skeletonTile} width={44} />
          <View style={styles.rowText}>
            <SkeletonBlock height={16} width="70%" />
            <View style={{ height: spacing.sm }} />
            <SkeletonBlock height={13} width="40%" />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function PaymentsScreen(): JSX.Element {
  const styles = useStyles();
  const router = useRouter();
  const t = useT();
  const format = useFormat();
  const { isPending: isSessionPending, session } = useSession();
  const { data: payments = [], isPending } = useQuery({
    enabled: Boolean(session),
    queryFn: listMyPayments,
    queryKey: queryKeys.payments()
  });

  const renderItem = useCallback(
    ({ item }: { item: PaymentHistoryItem }) => <PaymentRow item={item} />,
    []
  );
  const keyExtractor = useCallback((item: PaymentHistoryItem) => item.id, []);

  if (isSessionPending) {
    return (
      <Screen>
        <SkeletonHeader hasLeading overlap={false} />
        <SkeletonBody>
          <SkeletonCard lines={1} />
          <SkeletonRows leading="tile" rows={4} />
        </SkeletonBody>
      </Screen>
    );
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  const paid = payments
    .filter((payment) => payment.status === "SUCCESS")
    .reduce((total, payment) => total + Number(payment.amount), 0);
  const pending = payments.filter((payment) => payment.status === "PENDING").length;

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />

      <CurvedHeader>
        <HeaderBar
          left={
            <IconButton
              accessibilityLabel={t("common.back")}
              icon="chevron-back"
              onPress={() => router.back()}
              tone="onPaper"
            />
          }
          subtitle={t("nav.payments")}
          title={t("mine.paymentHistory")}
        />
      </CurvedHeader>

      <View style={styles.body}>
        <Card style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{t("pay.success")}</Text>
            <Text style={styles.summaryValue}>{format.currency(paid)}</Text>
          </View>
          <View style={styles.summaryRule} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{t("pay.pending")}</Text>
            <Text style={styles.summaryValue}>{format.number(pending)}</Text>
          </View>
        </Card>
      </View>

      {isPending ? (
        <PaymentsSkeleton />
      ) : payments.length === 0 ? (
        <View style={styles.empty}>
          <EmptyState message={t("pay.empty")} />
        </View>
      ) : (
        <View style={styles.sheet}>
          <FlashList
            contentContainerStyle={styles.list}
            data={payments}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  amount: { color: colors.ink, fontFamily: fonts.numeric, fontSize: 17 },
  body: { paddingHorizontal: spacing.lg },
  empty: { paddingTop: spacing.xl },
  list: { paddingBottom: spacing.xxl },
  row: {
    alignItems: "center",
    borderBottomColor: colors.separator,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg
  },
  rowFoot: { alignItems: "center", flexDirection: "row", gap: spacing.sm, paddingTop: 2 },
  rowMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
  rowText: { flex: 1, gap: 1 },
  rowTitle: { color: colors.ink, fontFamily: fonts.displaySemiBold, fontSize: 15, lineHeight: 21 },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.curve,
    borderTopRightRadius: radius.curve,
    flex: 1,
    marginTop: spacing.lg,
    overflow: "hidden"
  },
  skeletonTile: { borderRadius: radius.tile },
  summary: { flexDirection: "row", marginTop: -layout.headerOverlap },
  summaryItem: { flex: 1, gap: 2 },
  summaryLabel: {
    color: colors.mutedFaint,
    fontFamily: fonts.monoLabel,
    fontSize: 10,
    letterSpacing: 0.9,
    textTransform: "uppercase"
  },
  summaryRule: { backgroundColor: colors.separator, marginHorizontal: spacing.lg, width: 1 },
  summaryValue: { color: colors.ink, fontFamily: fonts.numeric, fontSize: 22 },
  transaction: { color: colors.mutedFaint, flexShrink: 1, fontFamily: fonts.monoLabel, fontSize: 10 }
}));

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
