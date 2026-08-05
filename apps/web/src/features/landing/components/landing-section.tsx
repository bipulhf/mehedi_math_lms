import type { JSX, PropsWithChildren, ReactNode } from "react";

import { Reveal } from "@/components/marketing/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";

interface LandingSectionProps extends PropsWithChildren {
  action?: ReactNode;
  className?: string | undefined;
  description?: string | undefined;
  eyebrow?: string | undefined;
  /** The warm band, for the sections that need separating from their neighbours. */
  tone?: "paper" | "warm";
  title: string;
}

/**
 * One band of the landing page.
 *
 * Every section used to set its own padding, its own container width and its own
 * heading markup, which is why the page read as a stack of unrelated pages. The
 * rhythm — eyebrow, title, description, action, then the content — is fixed
 * here, so the sections look like chapters of one thing.
 */
export function LandingSection({
  action,
  children,
  className,
  description,
  eyebrow,
  title,
  tone = "paper"
}: LandingSectionProps): JSX.Element {
  return (
    <section
      className={cn(
        "border-b border-hairline",
        tone === "warm" ? "bg-panel-warm" : null,
        className
      )}
    >
      <div className="mx-auto w-full max-w-[90rem] space-y-8 px-4 py-14 sm:px-8 lg:px-14 lg:py-20">
        <Reveal>
          <SectionHeading
            action={action}
            description={description}
            eyebrow={eyebrow}
            title={title}
          />
        </Reveal>

        {children}
      </div>
    </section>
  );
}
