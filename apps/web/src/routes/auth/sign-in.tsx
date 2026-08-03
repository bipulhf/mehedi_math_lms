import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, type JSX } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth";
import { useZodForm } from "@/lib/forms/use-zod-form";
import { useT } from "@/lib/i18n/locale-context";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/auth/sign-in")({
  head: () =>
    seo({
      description: "Secure email and Google sign-in for Genex.",
      path: "/auth/sign-in",
      title: "Sign in"
    }),
  component: SignInPage,
  errorComponent: RouteErrorView
});

const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(8)
});

export function SignInPage(): JSX.Element {
  const router = useRouter();
  const t = useT();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useZodForm({
    defaultValues: { email: "", password: "" },
    schema: signInSchema
  });

  const {
    formState: { errors },
    handleSubmit,
    register
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);

    try {
      const response = await authClient.signIn.email({
        email: values.email,
        password: values.password
      });

      if (response.error) {
        toast.error(response.error.message);

        return;
      }

      await router.navigate({ to: "/dashboard" });
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <div className="space-y-6">
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input error={errors.email?.message} id="email" type="email" {...register("email")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <PasswordInput
            error={errors.password?.message}
            id="password"
            {...register("password")}
          />
        </div>
        {/* Disabled until the form is submitting-capable rather than only while
            it submits: a click before hydration would post natively, putting the
            password in the URL and the browser history. */}
        <Button className="w-full" disabled={isSubmitting} size="lg" type="submit">
          {isSubmitting ? t("auth.signingIn") : t("auth.signIn")}
        </Button>
      </form>

      <div className="space-y-4">
        <Button
          className="w-full"
          onClick={async () => {
            await authClient.signIn.social({ callbackURL: "/dashboard", provider: "google" });
          }}
          size="lg"
          type="button"
          variant="outline"
        >
          {t("auth.google")}
        </Button>
        <p className="text-base font-light text-muted">
          {t("auth.newHere")}{" "}
          <Link
            className="border-b border-line-strong pb-0.5 text-ink transition-colors hover:border-accent hover:text-accent"
            to="/auth/sign-up"
          >
            {t("auth.signUp")}
          </Link>
        </p>
      </div>
    </div>
  );
}
