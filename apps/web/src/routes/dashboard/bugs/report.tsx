import { createFileRoute, useRouter } from "@tanstack/react-router";
import type { JSX } from "react";
import { toast } from "sonner";
import { createBugReportSchema } from "@mma/shared";

import { BugScreenshotUploadField } from "@/components/bugs/bug-screenshot-upload-field";
import { Skeleton } from "@/components/ui/skeleton";
import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CreateBugReportInput } from "@/lib/api/bugs";
import { createBugReport } from "@/lib/api/bugs";
import { useZodForm } from "@/lib/forms/use-zod-form";

export const Route = createFileRoute("/dashboard/bugs/report" as never)({
  component: ReportBugPage,
  errorComponent: RouteErrorView
} as never);

function ReportBugPage(): JSX.Element {
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
    toast.success("Bug report submitted");
    await router.navigate({ to: "/dashboard/bugs" });
  });

  return (
    <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 sm:p-10 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden group">
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none transition-all duration-1000 group-hover:bg-primary/10 z-[-1]"></div>
      <div className="mb-8">
        <h3 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">Report a bug</h3>
        <p className="mt-2 text-sm text-on-surface-variant font-light max-w-2xl leading-relaxed">
          Share the issue clearly, add a screenshot when helpful, and send it straight into the admin review queue.
        </p>
      </div>
      <form className="space-y-8" onSubmit={onSubmit}>
        <div className="grid gap-6">
          <div className="space-y-3">
             <Label htmlFor="bug-title" className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/60 pl-1">Title</Label>
             <Input id="bug-title" className="h-12 rounded-2xl bg-surface-container-low/50 border-outline-variant/30" error={errors.title?.message} {...register("title")} />
          </div>
          <div className="space-y-3">
             <Label htmlFor="bug-description" className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/60 pl-1">Description</Label>
             <Textarea id="bug-description" className="min-h-32 rounded-2xl bg-surface-container-low/50 border-outline-variant/30 text-base" error={errors.description?.message} {...register("description")} />
          </div>
          <div className="space-y-3">
             <Label className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/60 pl-1">Screenshot (Optional)</Label>
             <BugScreenshotUploadField
               id="bug-screenshot"
               error={errors.screenshotUrl?.message}
               value={screenshotUrl}
               onValueChange={(value) => setValue("screenshotUrl", value, { shouldDirty: true, shouldValidate: true })}
             />
          </div>
        </div>
        <div className="pt-4">
          <Button type="submit" disabled={isSubmitting} className="w-full h-14 rounded-2xl font-headline font-extrabold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] group/btn overflow-hidden relative">
            <div className="absolute inset-0 bg-linear-to-r from-primary to-primary/80 transition-transform group-hover/btn:scale-105"></div>
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isSubmitting ? (
                <>
                  <Skeleton className="h-4 w-4 rounded-full bg-white/20 animate-pulse" />
                  Submitting report...
                </>
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
