import { useMutation } from "@tanstack/react-query";
import { TicketPercent, X } from "lucide-react";
import type { JSX } from "react";
import { useState } from "react";
import type { CouponRejectionReason } from "@genex/shared";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CouponPreview } from "@/lib/api/coupons";
import { previewCoupon } from "@/lib/api/coupons";
import type { MessageKey } from "@genex/i18n";
import { useFormat, useT } from "@/lib/i18n/locale-context";

/** What the page holds once a code has been checked and accepted. */
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
 * The code box in the buy card.
 *
 * A refusal arrives from the API as a reason — EXPIRED, ALREADY_USED — not as a
 * sentence, so what the student reads is Bangla written here rather than an
 * English error from the server. The numbers it shows are a quote: checkout
 * prices the coupon again from the course row before any money moves. ADR-0013.
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

  const previewMutation = useMutation({
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
    previewMutation.mutate(trimmed);
  };

  if (applied) {
    return (
      <div className="space-y-3 border-t border-hairline pt-4">
        <div className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
            <TicketPercent aria-hidden="true" className="size-4 shrink-0 text-accent" />
            <span className="truncate">{t("coupon.applied", { code: applied.code })}</span>
          </span>
          <button
            aria-label={t("coupon.remove")}
            className="flex min-h-11 items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
            onClick={() => {
              onApplied(null);
              setCode("");
            }}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
            {t("coupon.remove")}
          </button>
        </div>

        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-light">{t("coupon.listPrice")}</dt>
            <dd className="text-muted line-through">{format.currency(applied.listAmount)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-light">{t("coupon.discount")}</dt>
            <dd className="text-accent">−{format.currency(applied.discountAmount)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-hairline pt-1.5">
            <dt className="text-ink">{t("coupon.payable")}</dt>
            <dd className="font-medium text-ink">{format.currency(applied.payable)}</dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t border-hairline pt-4">
      <label className="block text-sm text-ink" htmlFor="course-coupon">
        {t("coupon.have")}
      </label>
      <div className="flex gap-2">
        <Input
          autoCapitalize="characters"
          className="flex-1"
          id="course-coupon"
          maxLength={32}
          onChange={(event) => {
            setCode(event.target.value.toUpperCase());
            setReason(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit(code);
            }
          }}
          placeholder={t("coupon.placeholder")}
          value={code}
        />
        <Button
          disabled={previewMutation.isPending || code.trim().length === 0}
          onClick={() => submit(code)}
          type="button"
          variant="outline"
        >
          {previewMutation.isPending ? t("coupon.applying") : t("coupon.apply")}
        </Button>
      </div>

      {reason === null ? null : <p className="text-sm text-error">{t(rejectionKeys[reason])}</p>}

      {/* The advertised code, if the teacher chose to advertise one. One tap
          rather than asking somebody to copy what is already on the screen. */}
      {publicCode === null || previewMutation.isPending ? null : (
        <button
          className="text-sm text-muted transition-colors hover:text-accent"
          onClick={() => submit(publicCode)}
          type="button"
        >
          {t("coupon.bannerApply")} — <span className="font-mono">{publicCode}</span>
        </button>
      )}
    </div>
  );
}
