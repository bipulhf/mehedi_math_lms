import { useMutation } from "@tanstack/react-query";
import type { JSX } from "react";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Body, Button, Caption, ErrorNotice, Field } from "@/src/components/ui";
import type { CouponPreview, CouponRejectionReason } from "@/src/lib/api";
import { previewCoupon } from "@/src/lib/api";
import { useFormat, useT } from "@/src/lib/locale";
import { colors, spacing } from "@/src/theme/tokens";
import type { MessageKey } from "@mma/i18n";

/** What the screen holds once a code has been checked and accepted. */
export interface AppliedCoupon {
  code: string;
  discountAmount: string;
  listAmount: string;
  payable: string;
}

const rejectionKeys = {
  ALREADY_ENROLLED: "coupon.rejectALREADY_ENROLLED",
  ALREADY_USED: "coupon.rejectALREADY_USED",
  COURSE_UNAVAILABLE: "coupon.rejectCOURSE_UNAVAILABLE",
  DISABLED: "coupon.rejectDISABLED",
  EXHAUSTED: "coupon.rejectEXHAUSTED",
  EXPIRED: "coupon.rejectEXPIRED",
  FREE_COURSE: "coupon.rejectFREE_COURSE",
  NOT_FOUND: "coupon.rejectNOT_FOUND",
  NOT_STARTED: "coupon.rejectNOT_STARTED"
} as const satisfies Record<CouponRejectionReason, MessageKey>;

interface CourseCouponFieldProps {
  applied: AppliedCoupon | null;
  courseId: string;
  onApplied: (coupon: AppliedCoupon | null) => void;
  /** The advertised code, offered as one tap before anybody types. */
  publicCode: string | null;
}

/**
 * The code box on the course screen, saying the same things the web buy card
 * says: what came off, what is left to pay, and why a code was refused — in
 * Bangla, from the reason the API returns rather than its English message.
 *
 * A student who buys in the app and one who buys on the web have to be offered
 * the same coupon; a code sent by SMS is not a web-only thing.
 */
export function CourseCouponField({
  applied,
  courseId,
  onApplied,
  publicCode
}: CourseCouponFieldProps): JSX.Element {
  const t = useT();
  const format = useFormat();
  const [code, setCode] = useState("");
  const [reason, setReason] = useState<CouponRejectionReason | null>(null);

  const preview = useMutation({
    mutationFn: async (value: string): Promise<CouponPreview> =>
      previewCoupon({ code: value, courseId }),
    onSuccess: (result) => {
      if (result.status === "REJECTED" || !result.pricing || !result.coupon) {
        setReason(result.reason);
        onApplied(null);

        return;
      }

      setReason(null);
      onApplied({
        code: result.coupon.code,
        discountAmount: result.pricing.discountAmount,
        listAmount: result.pricing.listAmount,
        payable: result.pricing.payable
      });
    }
  });

  const submit = (value: string): void => {
    const trimmed = value.trim().toUpperCase();

    if (trimmed.length === 0) {
      return;
    }

    setCode(trimmed);
    preview.mutate(trimmed);
  };

  if (applied) {
    return (
      <View style={styles.container}>
        <View style={styles.appliedRow}>
          <Body>{t("coupon.applied", { code: applied.code })}</Body>
          <Pressable
            accessibilityLabel={t("coupon.remove")}
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => {
              onApplied(null);
              setCode("");
            }}
          >
            <Caption>{t("coupon.remove")}</Caption>
          </Pressable>
        </View>

        <View style={styles.line}>
          <Caption>{t("coupon.discount")}</Caption>
          <Body>−{format.currency(applied.discountAmount)}</Body>
        </View>
        <View style={styles.line}>
          <Caption>{t("coupon.payable")}</Caption>
          <Body>{format.currency(applied.payable)}</Body>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Field
        autoCapitalize="characters"
        label={t("coupon.have")}
        maxLength={32}
        onChangeText={(value) => {
          setCode(value.toUpperCase());
          setReason(null);
        }}
        onSubmitEditing={() => submit(code)}
        placeholder={t("coupon.placeholder")}
        value={code}
      />
      <Button
        isBusy={preview.isPending}
        label={t("coupon.apply")}
        onPress={() => submit(code)}
        variant="outline"
      />

      {reason === null ? null : <ErrorNotice message={t(rejectionKeys[reason])} />}

      {publicCode === null ? null : (
        <Pressable accessibilityRole="button" onPress={() => submit(publicCode)}>
          <Caption>
            {t("coupon.bannerApply")} — {publicCode}
          </Caption>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  appliedRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  container: {
    borderTopColor: colors.hairline,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingTop: spacing.md
  },
  line: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  }
});
