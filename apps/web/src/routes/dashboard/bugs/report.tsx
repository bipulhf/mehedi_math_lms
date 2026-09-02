import { createFileRoute, useRouter } from "@tanstack/react-router";
import type { JSX } from "react";
import { toast } from "sonner";
import { createBugReportSchema } from "@mma/shared";

import { BugScreenshotUploadField } from "@/components/bugs/bug-screenshot-upload-field";
import { BackButton } from "@/components/ui/back-button";
import { Skeleton } from "@/components/ui/skeleton";
import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import type { CreateBugReportInput } from "@/lib/api/bugs";
import { createBugReport } from "@/lib/api/bugs";
import { useZodForm } from "@/lib/forms/use-zod-form";
import { seo } from "@/lib/seo";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/bugs/report")({
  head: () =>
    seo({
      description: "Tell us what went wrong so the team can fix it.",
      path: "/dashboard/bugs/report",
      title: "Report a Bug"
    }),
  component: ReportBugPage,
  errorComponent: RouteErrorView
} as never);

function ReportBugPage(): JSX.Element {
  const t = useT();

  const router = useRouter();
  const form = useZodForm<CreateBugReportInput>({
    defaultValues: {
      description: "",
      screenshotUrl: "",
      title: ""
    },
    schema: createBugReportSchema
  });
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setValue,
    watch
  } = form;
  const screenshotUrl = watch("screenshotUrl") ?? "";

  const onSubmit = handleSubmit(async (values) => {
    await createBugReport(values);
    toast.success(t("bugs.submitted"));
    await router.navigate({ to: "/dashboard/bugs" });
  });

  return (
    <div className="bg-card p-4 sm:p-6 lg:p-10 border border-hairline relative w-full overflow-hidden group">
      <BackButton className="mb-6" to="/dashboard/bugs" />
      <div className="mb-8">
        <h3 className="font-body text-3xl font-medium tracking-tight text-ink">{t("bugs.report")}</h3>
        <p className="mt-2 text-sm text-muted font-light max-w-2xl leading-relaxed">
          Share the issue clearly, add a screenshot when helpful, and send it straight into the admin review queue.
        </p>
      </div>
      <form className="space-y-8" onSubmit={onSubmit}>
        <div className="grid gap-6">
          <div className="space-y-3">
             <Label htmlFor="bug-title" className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/60 pl-1">{t("bugs.fieldTitle")}</Label>
             <Input id="bug-title" className="h-12 bg-panel-warm/50 border-hairline/30" error={errors.title?.message} {...register("title")} />
          </div>
          <div className="space-y-3">
             <Label htmlFor="bug-description" className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/60 pl-1">{t("bugs.fieldDescription")}</Label>
             <RichTextEditor
               id="bug-description"
               className="bg-panel-warm/50 border-hairline/30"
               error={errors.description?.message}
               value={watch("description") ?? ""}
               onChange={(value) => setValue("description", value, { shouldDirty: true, shouldValidate: true })}
             />
          </div>
          <div className="space-y-3">
             <Label className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/60 pl-1">{t("bugs.fieldScreenshot")}</Label>
             <BugScreenshotUploadField
               id="bug-screenshot"
               error={errors.screenshotUrl?.message}
               value={screenshotUrl}
               onValueChange={(value) => setValue("screenshotUrl", value, { shouldDirty: true, shouldValidate: true })}
             />
          </div>
        </div>
        <div className="pt-4">
          <Button type="submit" disabled={isSubmitting} className="w-full h-14 font-body font-medium text-lg transition-all group/btn overflow-hidden relative">
             <div className="absolute inset-0 bg-linear-to-r from-accent to-accent/80 group-hover/btn:scale-105"></div>
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isSubmitting ? (
                <>
                  <Skeleton className="h-4 w-4 rounded-full bg-on-accent/20" />{t("bugs.submitting")}</>
              ) : (
                "Submit bug report"
              )}
            </span>
          </Button>
        </div>
      </form>
    </div>
  );
}
