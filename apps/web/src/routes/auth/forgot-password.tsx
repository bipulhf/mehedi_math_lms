import { Link, createFileRoute } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { useState, type JSX } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth";
import { useZodForm } from "@/lib/forms/use-zod-form";
import { useT } from "@/lib/i18n/locale-context";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/auth/forgot-password")({
  head: () =>
    seo({
      description: "Ask for a link to set a new password on your Mehedi's Math Academy account.",
      path: "/auth/forgot-password",
      title: "Forgot password"
    }),
  component: ForgotPasswordPage,
  errorComponent: RouteErrorView
});

const forgotPasswordSchema = z.object({
  email: z.email()
});

/**
 * Where the reset link is asked for.
 *
 * The confirmation never says whether the address is registered — Better Auth's
 * endpoint answers the same way either way, and so does this page. Telling a
 * stranger which of a list of emails has an account here is the one thing this
 * form could leak.
 */
export function ForgotPasswordPage(): JSX.Element {
  const t = useT();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useZodForm({
    defaultValues: { email: "" },
    schema: forgotPasswordSchema
  });

  const {
    formState: { errors },
    handleSubmit,
    register,
    reset
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);

    try {
      const response = await authClient.requestPasswordReset({
        email: values.email,
        // Relative on purpose: the link in the mail goes to the Better Auth
        // callback, which checks the token and then forwards here with it.
        redirectTo: "/auth/reset-password"
      });

      if (response.error) {
        toast.error(response.error.message ?? t("auth.resetLinkFailed"));

        return;
      }

      setSentTo(values.email);
    } finally {
      setIsSubmitting(false);
    }
  });

  if (sentTo !== null) {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-3 border border-hairline bg-panel-warm p-5">
          <MailCheck className="mt-0.5 size-5 shrink-0 text-accent" />
          <div className="space-y-1">
            <p className="text-base font-medium text-ink">{t("auth.resetLinkSent")}</p>
            <p className="text-sm font-light leading-relaxed text-muted">
              {t("auth.resetLinkSentLead", { email: sentTo })}
            </p>
          </div>
        </div>

        <Button
          className="w-full"
          onClick={() => {
            reset();
            setSentTo(null);
          }}
          size="lg"
          type="button"
          variant="outline"
        >
          {t("auth.sendToAnotherEmail")}
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
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input
            autoComplete="email"
            error={errors.email?.message}
            id="email"
            type="email"
            {...register("email")}
          />
        </div>
        <Button className="w-full" disabled={isSubmitting} size="lg" type="submit">
          {isSubmitting ? t("auth.sendingResetLink") : t("auth.sendResetLink")}
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
