import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
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

export const signUpSearchSchema = z.object({
  courseSlug: z.string().trim().min(1).optional()
});

export const Route = createFileRoute("/auth/sign-up")({
  head: () =>
    seo({
      description:
        "Create your Mehedi's Math Academy learner account with email and password to unlock courses, progress, and messaging.",
      path: "/auth/sign-up",
      title: "Create account"
    }),
  validateSearch: (search) => signUpSearchSchema.parse(search),
  component: AuthSignUpRoutePage,
  errorComponent: RouteErrorView
});

const signUpSchema = z
  .object({
    confirmPassword: z.string().min(8),
    email: z.email(),
    name: z.string().trim().min(2).max(255),
    password: z.string().min(8)
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

interface SignUpPageProps {
  courseSlug?: string | undefined;
}

function AuthSignUpRoutePage(): JSX.Element {
  const search = Route.useSearch();

  return <SignUpPage courseSlug={search.courseSlug} />;
}

export function SignUpPage({ courseSlug }: SignUpPageProps): JSX.Element {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useZodForm({
    defaultValues: {
      confirmPassword: "",
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
        signUp: {
          email: (input: {
            email: string;
            name: string;
            password: string;
          }) => Promise<{ error?: { message: string } }>;
        };
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

      toast.success("Student account created — complete your profile to enter the academy.");
      await router.navigate({
        to: "/dashboard/profile-complete",
        search: courseSlug ? { courseSlug } : {}
      });
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <div className="space-y-6">
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" autoComplete="name" error={errors.name?.message} {...register("name")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register("password")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
        </div>
        <Button
          className="w-full h-12 bg-primary text-white hover:bg-on-surface font-headline font-semibold text-sm transition-all"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? (
            <span
              className="mr-2 h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin"
              aria-hidden="true"
            />
          ) : null}
          {isSubmitting ? "Creating student account..." : "Create student account"}
        </Button>
      </form>

      <div className="grid gap-3">
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 font-headline font-semibold text-on-surface hover:bg-surface-container-high transition-all"
          onClick={async () => {
            const callbackURL = courseSlug
              ? `/dashboard/profile-complete?courseSlug=${encodeURIComponent(courseSlug)}`
              : "/dashboard/profile-complete";

            await authClient.signIn.social({
              provider: "google",
              callbackURL
            });
          }}
        >
          Continue with Google
        </Button>
        <p className="text-sm leading-6 text-on-surface/62">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-secondary-container hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
