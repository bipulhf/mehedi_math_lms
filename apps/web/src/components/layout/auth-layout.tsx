import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { JSX, PropsWithChildren } from "react";

interface AuthLayoutProps extends PropsWithChildren {
  description: string;
  title: string;
}

export function AuthLayout({ children, description, title }: AuthLayoutProps): JSX.Element {
  return (
    <div className="min-h-screen bg-surface px-4 py-16 sm:px-6 lg:px-8 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background patterns and glowing orbs */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px] pointer-events-none"></div>
      <div className="absolute top-0 right-0 w-200 h-200 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-150 h-150 bg-secondary/5 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>

      {/* Floating Back Button */}
      <div className="absolute top-6 left-6 sm:top-8 sm:left-8 z-50">
        <Link
          to="/"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-surface-container-lowest/80 backdrop-blur-md border border-outline-variant/30 px-5 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface hover:shadow-md transition-all duration-300"
        >
          <ArrowLeft className="size-4" />
          <span>Return to Academy</span>
        </Link>
      </div>

      <div className="w-full max-w-6xl grid gap-8 lg:gap-16 lg:grid-cols-[1.3fr_minmax(24rem,28rem)] items-center z-10 mt-12 sm:mt-0">
        {/* Left Side Marketing Area */}
        <section className="rounded-4xl bg-surface-container-low/50 backdrop-blur-sm p-10 lg:p-14 border border-outline-variant/10 shadow-2xl shadow-primary/5 relative overflow-hidden self-start hidden lg:block">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none z-0"></div>
          <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none z-0"></div>
          <h1 className="font-headline text-[clamp(2.5rem,4vw,4rem)] font-extrabold leading-[1.05] tracking-tight text-on-background relative z-10">
            Elevating Your <br />
            <span className="text-secondary italic font-light drop-shadow-sm">
              Academic Journey
            </span>
          </h1>

          <p className="mt-6 text-lg text-on-surface-variant leading-relaxed max-w-md font-light relative z-10">
            Welcome to the academic atelier designed for high-performance students. Enter your
            unified workspace to access curated courses, track your mastery, and connect with
            mentors.
          </p>
        </section>

        {/* Right Side Form Card */}
        <div className="bg-surface-container-lowest/90 backdrop-blur-3xl rounded-4xl p-8 sm:p-12 border border-outline-variant/40 shadow-[0_24px_64px_-16px_rgba(19,27,46,0.15)] relative self-start z-10 w-full group">
          <div className="mb-10 text-center sm:text-left">
            <h2 className="font-headline text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
              {title}
            </h2>
            <p className="mt-3 text-sm text-on-surface-variant font-light leading-relaxed">
              {description}
            </p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
