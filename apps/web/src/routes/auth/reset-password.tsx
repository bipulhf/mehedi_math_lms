import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useState, type JSX } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth";
import { useZodForm } from "@/lib/forms/use-zod-form";
import { useT } from "@/lib/i18n/locale-context";
import { seo } from "@/lib/seo";

/**
 * Both halves of what the Better Auth callback can send back: `token` when the
 * link is still good, `error=INVALID_TOKEN` when it has expired or been used.
 */
export const resetPasswordSearchSchema = z.object({
  error: z.string().trim().min(1).optional(),
  token: z.string().trim().min(1).optional()
});

export const Route = createFileRoute("/auth/reset-password")({
  head: () =>
    seo({
      description: "Set a new password on your Mehedi's Math Academy account.",
      path: "/auth/reset-password",
      title: "Set a new password"
    }),
  validateSearch: (search) => resetPasswordSearchSchema.parse(search),
  component: ResetPasswordPage,
  errorComponent: RouteErrorView
});

const minPasswordLength = 8;
/** Kept in step with `passwordResetExpirySeconds` in `@mma/mailer`. */
const linkExpiryMinutes = 60;

const resetPasswordSchema = z
  .object({
    confirmPassword: z.string().min(minPasswordLength),
    password: z.string().min(minPasswordLength)
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

export function ResetPasswordPage(): JSX.Element {
  const t = useT();
  const router = useRouter();
  const search = Route.useSearch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useZodForm({
    defaultValues: { confirmPassword: "", password: "" },
    schema: resetPasswordSchema
  });

  const {
    formState: { errors },
    handleSubmit,
    register
  } = form;

  const token = search.token;

  const onSubmit = handleSubmit(async (values) => {
    if (token === undefined) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authClient.resetPassword({
        newPassword: values.password,
        token
      });

      if (response.error) {
        toast.error(response.error.message ?? t("auth.resetLinkFailed"));

        return;
      }

      toast.success(t("auth.resetDone"));
      // Every session was revoked with the password, this one included, so the
      // only place to go is back through the door.
      await router.navigate({ to: "/auth/sign-in" });
    } finally {
      setIsSubmitting(false);
    }
  });

  // No token means the link was opened without one or the callback refused it.
  // Either way there is nothing to submit, so the form is not shown at all.
  if (token === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-3 border border-hairline bg-panel-warm p-5">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-accent" />
          <div className="space-y-1">
            <p className="text-base font-medium text-ink">{t("auth.resetTokenInvalid")}</p>
            <p className="text-sm font-light leading-relaxed text-muted">
              {t("auth.resetTokenInvalidLead", { minutes: linkExpiryMinutes })}
            </p>
          </div>
        </div>

        <Button asChild className="w-full" size="lg">
          <Link to="/auth/forgot-password">{t("auth.sendResetLink")}</Link>
        </Button>

        <p className="pt-2 text-center text-base font-light text-muted">
          <Link
            className="border-b border-line-strong pb-0.5 font-medium text-ink transition-colors hover:border-accent hover:text-accent"
            to="/auth/sign-in"
          >
            {t("auth.signIn")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.newPassword")}</Label>
          <PasswordInput
            autoComplete="new-password"
            error={errors.password?.message}
            id="password"
            {...register("password")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t("auth.confirmNewPassword")}</Label>
          <PasswordInput
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            id="confirmPassword"
            {...register("confirmPassword")}
          />
        </div>
        <Button className="w-full" disabled={isSubmitting} size="lg" type="submit">
          {isSubmitting ? t("auth.resetting") : t("auth.resetPassword")}
        </Button>
      </form>

      <p className="pt-2 text-center text-base font-light text-muted">
        <Link
          className="border-b border-line-strong pb-0.5 font-medium text-ink transition-colors hover:border-accent hover:text-accent"
          to="/auth/sign-in"
        >
          {t("auth.signIn")}
        </Link>
      </p>
    </div>
  );
}
