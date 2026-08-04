import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { JSX } from "react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-context";

interface BackButtonProps {
  readonly className?: string | undefined;
  readonly params?: Record<string, string> | undefined;
  readonly to: string;
}

export function BackButton({ className, params, to }: BackButtonProps): JSX.Element {
  const t = useT();

  return (
    <Button asChild className={className} size="sm" variant="outline">
      <Link params={params as never} to={to as never}>
        <ArrowLeft className="size-3.5" />
        {t("common.back")}
      </Link>
    </Button>
  );
}
