import { useMutation } from "@tanstack/react-query";
import { TicketPercent, X } from "lucide-react";
import type { JSX } from "react";
import { useState } from "react";
import type { CouponRejectionReason } from "@mma/shared";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CouponPreview } from "@/lib/api/coupons";
import { previewCoupon } from "@/lib/api/coupons";
import type { MessageKey } from "@mma/i18n";
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
  publicDiscountAmount: string | null;
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
  publicDiscountAmount,
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
      {publicCode !== null && publicDiscountAmount !== null ? (
        <div className="border border-accent/30 bg-accent/5 p-3.5 sm:p-4">
          <div className="flex items-start gap-3">
            <div
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center border border-accent/25 bg-card text-accent"
            >
              <TicketPercent className="size-4" />
            </div>
            <p className="min-w-0 pt-0.5 text-base font-medium leading-snug text-ink">
              {t("coupon.bannerTitle", {
                amount: format.currency(publicDiscountAmount),
                code: publicCode
              })}
            </p>
          </div>
          <button
            className="mt-3 flex min-h-11 w-full items-center justify-between gap-3 border border-dashed border-accent/50 bg-card px-3 py-2.5 text-left transition-colors hover:border-accent hover:bg-paper disabled:pointer-events-none disabled:opacity-55"
            disabled={previewMutation.isPending}
            onClick={() => submit(publicCode)}
            type="button"
          >
            <span className="min-w-0">
              <span className="label-mono block text-[0.7rem] uppercase text-muted-faint">
                {t("coupon.code")}
              </span>
              <span className="block truncate font-mono text-sm font-medium text-ink">
                {publicCode}
              </span>
            </span>
            <span className="shrink-0 text-sm font-medium text-accent">
              {t("coupon.bannerApply")}
            </span>
          </button>
        </div>
      ) : null}

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
    </div>
  );
}
