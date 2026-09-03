import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, type JSX } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { PhoneOtpForm } from "@/components/auth/phone-otp-form";
import { RouteErrorView } from "@/components/common/route-error";
import { useAuthSession } from "@/hooks/use-auth-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Tabs } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth";
import { useZodForm } from "@/lib/forms/use-zod-form";
import { useT } from "@/lib/i18n/locale-context";
import { seo } from "@/lib/seo";

export const signUpSearchSchema = z.object({
  courseSlug: z.string().trim().min(1).optional()
});

export const Route = createFileRoute("/auth/sign-up")({
  head: () =>
    seo({
      description:
        "Create your Genex learner account with a mobile number or an email to unlock courses, progress, and messaging.",
      path: "/auth/sign-up",
      title: "Create account"
    }),
  validateSearch: (search) => signUpSearchSchema.parse(search),
  component: AuthSignUpRoutePage,
  errorComponent: RouteErrorView
});

type SignUpMethod = "email" | "phone";

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
  const t = useT();
  const router = useRouter();
  const { refetch: refetchSession } = useAuthSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Phone first, as on sign-in: a code on a handset is fewer things to
  // remember than an address and a password.
  const [method, setMethod] = useState<SignUpMethod>("phone");
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

      toast.success(t("auth.signUp"));
      // Signing up signs you in, and the cached session still says otherwise
      // -- see the same call in sign-in.tsx.
      await refetchSession();
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
      <Button
        className="group flex w-full items-center justify-center gap-3 border-line-strong transition-all duration-200 hover:border-accent hover:text-accent"
        onClick={async () => {
          const callbackURL = courseSlug
            ? `/dashboard/profile-complete?courseSlug=${encodeURIComponent(courseSlug)}`
            : "/dashboard/profile-complete";

          await authClient.signIn.social({
            callbackURL,
            provider: "google"
          });
        }}
        size="lg"
        type="button"
        variant="outline"
      >
        <svg className="size-5 shrink-0" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            fill="#EA4335"
          />
        </svg>
        <span>{t("auth.google")}</span>
      </Button>

      <Tabs
        label={t("auth.chooseMethod")}
        onChange={setMethod}
        tabs={[
          { label: t("auth.withPhone"), value: "phone" },
          { label: t("auth.withEmail"), value: "email" }
        ]}
        value={method}
      />

      {method === "phone" ? <PhoneOtpForm courseSlug={courseSlug} /> : null}

      {method === "email" ? (
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">{t("auth.name")}</Label>
            <Input autoComplete="name" error={errors.name?.message} id="name" {...register("name")} />
          </div>
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
          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <PasswordInput
              autoComplete="new-password"
              error={errors.password?.message}
              id="password"
              {...register("password")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
            <PasswordInput
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              id="confirmPassword"
              {...register("confirmPassword")}
            />
          </div>
          <Button className="w-full" disabled={isSubmitting} size="lg" type="submit">
            {isSubmitting ? t("auth.signingUp") : t("auth.signUp")}
          </Button>
        </form>
      ) : null}

      <p className="pt-2 text-center text-base font-light text-muted">
        {t("auth.haveAccount")}{" "}
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
