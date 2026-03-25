import { createFileRoute, useRouter } from "@tanstack/react-router";
import type { JSX } from "react";
import { toast } from "sonner";
import { createBugReportSchema } from "@mma/shared";

import { BugScreenshotUploadField } from "@/components/bugs/bug-screenshot-upload-field";
import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle>Report a bug</CardTitle>
        <CardDescription>
          Share the issue clearly, add a screenshot when helpful, and send it straight into the admin review queue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="bug-title">Title</Label>
            <Input id="bug-title" error={errors.title?.message} {...register("title")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bug-description">Description</Label>
            <Textarea id="bug-description" error={errors.description?.message} {...register("description")} />
          </div>
          <BugScreenshotUploadField
            id="bug-screenshot"
            error={errors.screenshotUrl?.message}
            value={screenshotUrl}
            onValueChange={(value) => setValue("screenshotUrl", value, { shouldDirty: true, shouldValidate: true })}
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <span className="h-4 w-16 rounded-full bg-white/25" aria-hidden="true" /> : null}
            {isSubmitting ? "Submitting bug" : "Submit bug report"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
