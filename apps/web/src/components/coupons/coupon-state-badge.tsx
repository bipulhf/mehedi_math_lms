import type { CouponState } from "@mma/shared";
import type { JSX } from "react";

import { Badge } from "@/components/ui/badge";
import type { MessageKey } from "@mma/i18n";
import { useT } from "@/lib/i18n/locale-context";

const stateKeys = {
  ACTIVE: "coupon.stateACTIVE",
  DISABLED: "coupon.stateDISABLED",
  EXHAUSTED: "coupon.stateEXHAUSTED",
  EXPIRED: "coupon.stateEXPIRED",
  SCHEDULED: "coupon.stateSCHEDULED"
} as const satisfies Record<CouponState, MessageKey>;

/**
 * A coupon's state is derived, never stored, so this badge always agrees with
 * what checkout would do a second later.
 *
 * Only Active is `neutral`. Nothing here is wrong enough for `attention` —
 * DESIGN.md §2 keeps the accent for what needs somebody to act, and a coupon
 * that ran out is simply finished.
 */
export function CouponStateBadge({ state }: { state: CouponState }): JSX.Element {
  const t = useT();

  return (
    <Badge tone={state === "ACTIVE" ? "neutral" : state === "SCHEDULED" ? "quiet" : "faded"}>
      {t(stateKeys[state])}
    </Badge>
  );
}
