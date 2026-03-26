import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, type JSX } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth";
import { useZodForm } from "@/lib/forms/use-zod-form";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/auth/sign-in")({
  head: () =>
    seo({
      description:
        "Secure email and Google sign-in for Mehedi's Math Academy dashboards, courses, and messaging.",
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

function SignInPage(): JSX.Element {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useZodForm({
    defaultValues: {
      email: "",
      password: ""
    },
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

      toast.success("Signed in successfully");
      await router.navigate({ to: "/dashboard" });
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <div className="space-y-6">
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" error={errors.email?.message} {...register("email")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            error={errors.password?.message}
            {...register("password")}
          />
        </div>
        <Button className="w-full h-12 bg-primary text-white hover:bg-on-surface font-headline font-semibold text-sm transition-all" type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="mr-2 h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" aria-hidden="true" />
          ) : null}
          {isSubmitting ? "Signing in..." : "Continue to workspace"}
        </Button>
      </form>

      <div className="grid gap-3">
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 font-headline font-semibold text-on-surface hover:bg-surface-container-high transition-all"
          onClick={async () => {
            await authClient.signIn.social({
              provider: "google",
              callbackURL: "/dashboard"
            });
          }}
        >
          Continue with Google
        </Button>
        <p className="text-sm leading-6 text-on-surface/62">
          Public student signup arrives in the next phases. This page already follows the shared
          React Hook Form + Zod pattern.
        </p>
      </div>
    </div>
  );
}
