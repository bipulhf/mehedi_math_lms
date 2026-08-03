import { reportConversationSchema, type ReportConversationInput } from "@genex/shared";
import { ShieldAlert } from "lucide-react";
import type { JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { reportConversation } from "@/lib/api/messages";
import { useZodForm } from "@/lib/forms/use-zod-form";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useZodForm({
    defaultValues: { reason: "" },
    schema: reportConversationSchema
  });

  const handleSubmit = form.handleSubmit(async (values: ReportConversationInput) => {
    setIsSubmitting(true);

    try {
      await reportConversation(conversationId, values);
      toast.success("Report submitted. An administrator will review this conversation.");
      onReported();
    } finally {
      // The ky interceptor has already surfaced the failure as a toast.
      setIsSubmitting(false);
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-4xl border border-outline-variant/40 bg-surface-container-lowest shadow-xl">
        <div className="flex items-start gap-4 border-b border-outline-variant/20 px-6 py-5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-error/10 text-error">
            <ShieldAlert className="size-5" />
          </div>
          <div>
            <h3 className="font-headline text-xl font-extrabold text-on-surface">
              Report this conversation
            </h3>
            <p className="mt-1 text-sm font-light leading-relaxed text-on-surface-variant">
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
            <Label htmlFor="report-reason">What happened?</Label>
            <Textarea
              id="report-reason"
              placeholder="Describe what you are reporting, in at least a sentence."
              error={form.formState.errors.reason?.message}
              {...form.register("reason")}
            />
            <p className="text-xs font-light text-on-surface-variant">
              Messages are never deleted. An administrator can hide one from view, and the original
              is kept so it can still be looked at.
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Submit report
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
