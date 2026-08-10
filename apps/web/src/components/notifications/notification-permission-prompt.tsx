import type { JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { clientEnv } from "@/lib/env";
import { requestWebPushPermission } from "@/lib/firebase/web-push";
import { useT } from "@/lib/i18n/locale-context";

export function NotificationPermissionPrompt(): JSX.Element | null {
  const t = useT();
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (
      !clientEnv.firebaseVapidKey ||
      typeof window === "undefined" ||
      !("Notification" in window) ||
      window.Notification.permission !== "default"
    ) {
      return;
    }

    setIsVisible(true);
  }, []);

  if (!isVisible) {
    return null;
  }

  const handleEnable = async (): Promise<void> => {
    setIsRequesting(true);

    try {
      const permission = await requestWebPushPermission();

      if (permission === "granted") {
        toast.success(t("notif.pushEnabled"));
      }

      setIsVisible(false);
    } catch {
      toast.error(t("notif.pushFailed"));
      setIsVisible(false);
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <section
      aria-live="polite"
      className="mb-6 flex flex-col gap-4 border border-hairline bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div>
        <p className="text-sm font-semibold text-ink">{t("notif.pushPromptTitle")}</p>
        <p className="mt-1 text-sm text-muted">{t("notif.pushPromptLead")}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          disabled={isRequesting}
          onClick={() => void handleEnable()}
          size="sm"
          type="button"
          variant="accent"
        >
          {t("notif.enablePush")}
        </Button>
        <Button
          disabled={isRequesting}
          onClick={() => setIsVisible(false)}
          size="sm"
          type="button"
          variant="outline"
        >
          {t("notif.notNow")}
        </Button>
      </div>
    </section>
  );
}
