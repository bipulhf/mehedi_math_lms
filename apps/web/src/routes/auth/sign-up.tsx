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

export const Route = createFileRoute("/auth/sign-up")({
  head: () =>
    seo({
      description:
        "Create your Mehedi's Math Academy learner account with email and password to unlock courses, progress, and messaging.",
      path: "/auth/sign-up",
      title: "Create account"
    }),
  component: SignUpPage,
  errorComponent: RouteErrorView
});

const signUpSchema = z.object({
  email: z.email(),
  name: z.string().trim().min(2).max(255),
  password: z.string().min(8)
});

function SignUpPage(): JSX.Element {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useZodForm({
    defaultValues: {
      email: "",
      name: "",
      password: ""
    },
    schema: signUpSchema
  });

  const {
    formState: { errors },
    handleSubmit,
    register
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);

    try {
      const client = authClient as typeof authClient & {
        signUp: { email: (input: { email: string; name: string; password: string }) => Promise<{ error?: { message: string } }> };
      };
      const response = await client.signUp.email({
        email: values.email,
        name: values.name,
        password: values.password
      });

      if (response.error) {
        toast.error(response.error.message);
        return;
      }

      toast.success("Account created — continue to your dashboard.");
      await router.navigate({ to: "/dashboard" });
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <div className="space-y-6">
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" error={errors.name?.message} {...register("name")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" error={errors.email?.message} {...register("email")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" error={errors.password?.message} {...register("password")} />
        </div>
        <Button className="w-full h-12 bg-primary text-white hover:bg-on-surface font-headline font-semibold text-sm transition-all" disabled={isSubmitting} type="submit">
          {isSubmitting ? (
            <span className="mr-2 h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" aria-hidden="true" />
          ) : null}
          {isSubmitting ? "Creating workspace..." : "Create workspace"}
        </Button>
      </form>
    </div>
  );
}
