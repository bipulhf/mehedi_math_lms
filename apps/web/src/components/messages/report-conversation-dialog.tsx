import { reportConversationSchema, type ReportConversationInput } from "@mma/shared";
import { ShieldAlert } from "lucide-react";
import type { JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { reportConversation } from "@/lib/api/messages";
import { useZodForm } from "@/lib/forms/use-zod-form";
import { useT } from "@/lib/i18n/locale-context";

export interface ReportConversationDialogProps {
  conversationId: string;
  onClose: () => void;
  onReported: () => void;
  participantName: string;
}

/**
 * Reporting is the only way a private conversation ever becomes readable by an
 * admin, so the dialog says so plainly rather than implying a silent complaint
 * box. ADR-0004.
 */
export function ReportConversationDialog({
  conversationId,
  onClose,
  onReported,
  participantName
}: ReportConversationDialogProps): JSX.Element {
  const t = useT();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useZodForm({
    defaultValues: { reason: "" },
    schema: reportConversationSchema
  });

  const handleSubmit = form.handleSubmit(async (values: ReportConversationInput) => {
    setIsSubmitting(true);

    try {
      await reportConversation(conversationId, values);
      toast.success(t("msg.reportSent"));
      onReported();
    } finally {
      // The ky interceptor has already surfaced the failure as a toast.
      setIsSubmitting(false);
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-[var(--radius-md)] border border-hairline bg-background">
        <div className="flex items-start gap-4 border-b border-hairline/20 px-6 py-5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-error/10 text-error">
            <ShieldAlert className="size-5" />
          </div>
          <div>
            <h3 className="font-body text-xl font-medium text-ink">{t("msg.reportTitle")}</h3>
            <p className="mt-1 text-sm font-light leading-relaxed text-muted">
              An administrator will be able to read your conversation with {participantName} while
              this report is open. Every time they do, it is recorded.
            </p>
          </div>
        </div>

        <form
          className="space-y-5 px-6 py-6"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit(event);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="report-reason">{t("msg.whatHappened")}</Label>
            <Textarea
              id="report-reason"
              placeholder={t("msg.reportHint")}
              error={form.formState.errors.reason?.message}
              {...form.register("reason")}
            />
            <p className="text-xs font-light text-muted">
              Messages are never deleted. An administrator can hide one from view, and the original
              is kept so it can still be looked at.
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={isSubmitting}>{t("msg.submitReport")}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
