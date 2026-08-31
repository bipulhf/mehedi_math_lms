import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import type { JSX } from "react";
import { memo, useCallback } from "react";
import { StyleSheet, View } from "react-native";

import {
  Badge,
  Caption,
  Card,
  EmptyState,
  Heading,
  PriceText,
  Screen,
  ScreenSkeleton,
  SkeletonBlock,
  Title
} from "@/src/components/ui";
import { listMyPayments, type PaymentHistoryItem } from "@/src/lib/api/payments";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { useSession } from "@/src/lib/use-session";
import { spacing } from "@/src/theme/tokens";

const STATUS_LABEL = {
  FAILED: "pay.failed",
  PENDING: "pay.pending",
  REFUNDED: "pay.refunded",
  SUCCESS: "pay.success"
} as const;

const PaymentRow = memo(function PaymentRow({ item }: { item: PaymentHistoryItem }): JSX.Element {
  const t = useT();
  const format = useFormat();

  return (
    <View style={styles.row}>
      <Card>
        <View style={styles.rowBody}>
          <View style={styles.rowHeader}>
            <Title>{item.course.title}</Title>
            <PriceText amount={item.amount} />
          </View>
          <View style={styles.rowMeta}>
            <Badge tone={item.status === "SUCCESS" ? "neutral" : "attention"}>
              {t(STATUS_LABEL[item.status])}
            </Badge>
            <Caption>{format.dateTime(item.createdAt)}</Caption>
          </View>
          <Caption tone="faint">{item.transactionId}</Caption>
        </View>
      </Card>
    </View>
  );
});

function PaymentsSkeleton(): JSX.Element {
  return (
    <View style={styles.skeletonList}>
      {[0, 1, 2].map((key) => (
        <Card key={key}>
          <View style={styles.rowBody}>
            <SkeletonBlock height={18} width="60%" />
            <SkeletonBlock height={14} width="40%" />
          </View>
        </Card>
      ))}
    </View>
  );
}

export default function PaymentsScreen(): JSX.Element {
  const t = useT();
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
    return <ScreenSkeleton rows={3} />;
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Heading>{t("mine.paymentHistory")}</Heading>
      </View>

      {isPending ? (
        <PaymentsSkeleton />
      ) : payments.length === 0 ? (
        <EmptyState message={t("pay.empty")} />
      ) : (
        <FlashList
          contentContainerStyle={styles.list}
          data={payments}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { padding: spacing.lg },
  list: { padding: spacing.lg },
  row: { marginBottom: spacing.lg },
  rowBody: { gap: spacing.sm, paddingTop: spacing.md },
  rowHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  rowMeta: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  skeletonList: { gap: spacing.lg, padding: spacing.lg }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
