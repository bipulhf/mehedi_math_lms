import { useMutation } from "@tanstack/react-query";
import type { JSX } from "react";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";

import { Body, Button, Caption, ErrorNotice, Field } from "@/src/components/ui";
import type { CouponPreview, CouponRejectionReason } from "@/src/lib/api/coupons";
import { previewCoupon } from "@/src/lib/api/coupons";
import { useFormat, useT } from "@/src/lib/locale";
import { fonts, radius, spacing } from "@/src/theme/tokens";
import { makeStyles, useThemeColors } from "@/src/theme/theme";
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
  const styles = useStyles();
  const colors = useThemeColors();
  const t = useT();
  const format = useFormat();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<CouponRejectionReason | null>(null);

  const preview = useMutation({
    mutationFn: async (value: string): Promise<CouponPreview> =>
      previewCoupon({ code: value, courseId }),
    onError: (cause: Error) => {
      onApplied(null);
      setError(cause.message);
    },
    onSuccess: (result) => {
      setError(null);
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
      <View style={styles.appliedPlate}>
        <View style={styles.appliedRow}>
          <Ionicons color={colors.success} name="pricetag" size={18} />
          <Text style={styles.appliedText}>{t("coupon.applied", { code: applied.code })}</Text>
          <Pressable
            accessibilityLabel={t("coupon.remove")}
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => {
              onApplied(null);
              setCode("");
            }}
          >
            <Text style={styles.removeText}>{t("coupon.remove")}</Text>
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
          setError(null);
          setReason(null);
        }}
        onSubmitEditing={() => submit(code)}
        placeholder={t("coupon.placeholder")}
        value={code}
      />
      <Button
        icon="pricetag"
        isBusy={preview.isPending}
        label={t("coupon.apply")}
        onPress={() => submit(code)}
        stretch
        variant="soft"
      />

      {error ? <ErrorNotice message={error} /> : null}
      {reason === null ? null : <ErrorNotice message={t(rejectionKeys[reason])} />}

      {publicCode === null ? null : (
        <Pressable
          accessibilityLabel={`${t("coupon.bannerApply")} ${publicCode}`}
          accessibilityRole="button"
          onPress={() => submit(publicCode)}
          style={styles.publicCode}
        >
          <Text style={styles.publicCodeText}>
            {t("coupon.bannerApply")} — {publicCode}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  appliedRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  appliedPlate: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    gap: spacing.sm,
    padding: spacing.md
  },
  appliedText: { color: colors.tint.mint.fg, flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 15 },
  container: { gap: spacing.md },
  removeText: { color: colors.muted, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  line: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  publicCode: {
    alignSelf: "flex-start",
    backgroundColor: colors.tint.gold.bg,
    borderRadius: radius.pill,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.md
  },
  publicCodeText: { color: colors.tint.gold.fg, fontFamily: fonts.bodySemiBold, fontSize: 13 }
}));
