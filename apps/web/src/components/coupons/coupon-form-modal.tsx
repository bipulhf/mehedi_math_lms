import { useQuery } from "@tanstack/react-query";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import type { CouponKind } from "@genex/shared";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import type { CouponListItem } from "@/lib/api/coupons";
import { listCourses } from "@/lib/api/courses";
import { useT } from "@/lib/i18n/locale-context";
import { queryKeys } from "@/lib/query/keys";

export interface CouponFormValues {
  code: string;
  /** Null is every course — an admin-only choice, refused by the API otherwise. */
  courseId: string | null;
  expiresAt: string | null;
  isDisabled: boolean;
  isPublic: boolean;
  kind: CouponKind;
  maxRedemptions: number | null;
  startsAt: string | null;
  value: number;
}

interface CouponFormModalProps {
  canTargetEveryCourse: boolean;
  /** Editing when set; creating when null. Every field stays editable. ADR-0013. */
  coupon: CouponListItem | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: CouponFormValues) => void;
  open: boolean;
  /** Teachers only get the courses they own; the API enforces the same rule. */
  ownCoursesOnly: boolean;
}

/** `datetime-local` speaks local wall-clock; the API speaks ISO. */
function toLocalInput(iso: string | null): string {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIso(local: string): string | null {
  return local.trim().length === 0 ? null : new Date(local).toISOString();
}

export function CouponFormModal({
  canTargetEveryCourse,
  coupon,
  isSaving,
  onClose,
  onSubmit,
  open,
  ownCoursesOnly
}: CouponFormModalProps): JSX.Element {
  const t = useT();
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<CouponKind>("PERCENT");
  const [value, setValue] = useState("");
  const [courseId, setCourseId] = useState<string>("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);

  // 50 is the ceiling `listCoursesQuerySchema` allows; asking for more is a
  // validation error, not a bigger page. A catalogue past that needs a search
  // field here rather than a larger number.
  const coursesQuery = useQuery({
    enabled: open,
    queryFn: async () => listCourses({ limit: 50, mine: ownCoursesOnly || undefined }),
    queryKey: queryKeys.courses.list({ forCoupons: true, mine: ownCoursesOnly })
  });

  // Re-seeded whenever the modal opens on a different coupon, so editing one
  // row and then another does not carry the first one's values across.
  useEffect(() => {
    if (!open) {
      return;
    }

    setCode(coupon?.code ?? "");
    setKind(coupon?.kind ?? "PERCENT");
    setValue(coupon ? String(Number(coupon.value)) : "");
    setCourseId(coupon?.course?.id ?? "");
    setMaxRedemptions(coupon?.maxRedemptions === null ? "" : String(coupon?.maxRedemptions ?? ""));
    setStartsAt(toLocalInput(coupon?.startsAt ?? null));
    setExpiresAt(toLocalInput(coupon?.expiresAt ?? null));
    setIsPublic(coupon?.isPublic ?? false);
    setIsDisabled(coupon?.isDisabled ?? false);
  }, [coupon, open]);

  const courses = coursesQuery.data?.data ?? [];

  // A teacher has no "every course" option, so an unset select would submit
  // null and be refused as an admin-only choice. Seed it with whatever the
  // browser is already showing.
  useEffect(() => {
    if (canTargetEveryCourse || courseId !== "" || courses.length === 0) {
      return;
    }

    setCourseId(courses[0]?.id ?? "");
  }, [canTargetEveryCourse, courseId, courses]);

  const submit = (): void => {
    onSubmit({
      code: code.trim().toUpperCase(),
      courseId: courseId === "" ? null : courseId,
      expiresAt: toIso(expiresAt),
      isDisabled,
      isPublic,
      kind,
      maxRedemptions: maxRedemptions.trim() === "" ? null : Number(maxRedemptions),
      startsAt: toIso(startsAt),
      value: Number(value)
    });
  };

  return (
    <Modal
      className="max-w-xl"
      onClose={onClose}
      open={open}
      title={coupon ? t("coupon.editTitle") : t("coupon.createTitle")}
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="coupon-code">{t("coupon.code")}</Label>
            <Input
              autoCapitalize="characters"
              id="coupon-code"
              maxLength={32}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="EID25"
              required
              value={code}
            />
            <p className="text-xs text-muted-light">{t("coupon.codeHint")}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coupon-course">{t("coupon.course")}</Label>
            <Select
              id="coupon-course"
              onChange={(event) => setCourseId(event.target.value)}
              value={courseId}
            >
              {canTargetEveryCourse ? <option value="">{t("coupon.allCourses")}</option> : null}
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </Select>
            {canTargetEveryCourse ? null : (
              <p className="text-xs text-muted-light">{t("coupon.allCoursesHint")}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="coupon-kind">{t("coupon.kind")}</Label>
            <Select
              id="coupon-kind"
              onChange={(event) => setKind(event.target.value as CouponKind)}
              value={kind}
            >
              <option value="PERCENT">{t("coupon.kindPercent")}</option>
              <option value="FLAT">{t("coupon.kindFlat")}</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coupon-value">{t("coupon.value")}</Label>
            <Input
              id="coupon-value"
              inputMode="decimal"
              max={kind === "PERCENT" ? 100 : undefined}
              min={kind === "PERCENT" ? 1 : 0.01}
              onChange={(event) => setValue(event.target.value)}
              required
              step="0.01"
              type="number"
              value={value}
            />
            <p className="text-xs text-muted-light">
              {kind === "PERCENT" ? t("coupon.valuePercentHint") : t("coupon.valueFlatHint")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coupon-max">{t("coupon.maxRedemptions")}</Label>
            <Input
              id="coupon-max"
              inputMode="numeric"
              min={1}
              onChange={(event) => setMaxRedemptions(event.target.value)}
              step="1"
              type="number"
              value={maxRedemptions}
            />
            <p className="text-xs text-muted-light">{t("coupon.maxRedemptionsHint")}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coupon-starts">{t("coupon.startsAt")}</Label>
            <Input
              id="coupon-starts"
              onChange={(event) => setStartsAt(event.target.value)}
              type="datetime-local"
              value={startsAt}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coupon-expires">{t("coupon.expiresAt")}</Label>
            <Input
              id="coupon-expires"
              onChange={(event) => setExpiresAt(event.target.value)}
              type="datetime-local"
              value={expiresAt}
            />
          </div>
        </div>

        <div className="space-y-1 border-t border-hairline pt-4">
          <Checkbox
            checked={isPublic}
            label={t("coupon.isPublic")}
            onChange={(event) => setIsPublic(event.target.checked)}
          />
          <p className="pl-8 text-xs text-muted-light">{t("coupon.isPublicHint")}</p>
          <Checkbox
            checked={isDisabled}
            label={t("coupon.isDisabled")}
            onChange={(event) => setIsDisabled(event.target.checked)}
          />
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button className="w-full sm:w-auto" onClick={onClose} type="button" variant="outline">
            {t("action.cancel")}
          </Button>
          <Button className="w-full sm:w-auto" disabled={isSaving} type="submit">
            {t("action.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
