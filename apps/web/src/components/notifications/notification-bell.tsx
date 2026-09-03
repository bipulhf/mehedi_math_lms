import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

import { NotificationListSkeleton } from "@/components/common/skeletons";
import { Button } from "@/components/ui/button";
import { clientEnv } from "@/lib/env";
import { tryRegisterWebPush } from "@/lib/firebase/web-push";
import {
  emitNotificationsUpdated,
  getNotificationUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATIONS_EVENT,
  type NotificationRecord
} from "@/lib/api/notifications";
import { queryKeys } from "@/lib/query/keys";
import { buildApiWebSocketUrl } from "@/lib/ws-url";
import { cn } from "@/lib/utils";
import { stripHtml } from "@/lib/html";
import { useT } from "@/lib/i18n/locale-context";

interface NotificationSocketMessage {
  data: {
    id?: string;
    items?: string;
    readAt?: string | null;
  };
  type: "notification:new" | "notification:read" | "notification:read-all";
}

function resolveNotificationLink(record: NotificationRecord): string {
  const data = record.data;

  if (data && typeof data.href === "string" && data.href.length > 0) {
    return data.href;
  }

  if (data && typeof data.courseId === "string") {
    return `/dashboard/learn/${data.courseId}`;
  }

  if (data && typeof data.conversationId === "string") {
    return "/dashboard/messages";
  }

  return "/dashboard";
}

export function NotificationBell(): JSX.Element | null {
  const t = useT();

  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const openRef = useRef(false);

  const { data: unread = 0 } = useQuery({
    queryFn: async () => getNotificationUnreadCount(),
    queryKey: queryKeys.notifications.unreadCount()
  });
  // The list is only fetched while the panel is open; the badge is always live.
  const listFilters = { limit: 12, page: 1 };
  const { data: notificationPage, isFetching: isLoading } = useQuery({
    enabled: open,
    queryFn: async () => listNotifications(listFilters),
    queryKey: queryKeys.notifications.list(listFilters)
  });
  const items: readonly NotificationRecord[] = notificationPage?.items ?? [];

  const refreshUnread = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
  };

  const refreshList = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list(listFilters) });
  };

  useEffect(() => {
    const handleDocClick = (event: MouseEvent): void => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("click", handleDocClick);

    return () => {
      document.removeEventListener("click", handleDocClick);
    };
  }, []);

  useEffect(() => {
    const handleGlobal = (): void => {
      void refreshUnread();
    };

    window.addEventListener(NOTIFICATIONS_EVENT, handleGlobal);

    return () => {
      window.removeEventListener(NOTIFICATIONS_EVENT, handleGlobal);
    };
  }, []);

  useEffect(() => {
    void tryRegisterWebPush().catch(() => undefined);
  }, []);

  openRef.current = open;

  useEffect(() => {
    const socket = new WebSocket(buildApiWebSocketUrl("notifications/ws"));

    socket.onmessage = (event) => {
      const payload = JSON.parse(String(event.data)) as NotificationSocketMessage;

      if (payload.type === "notification:new") {
        emitNotificationsUpdated();
        void refreshUnread();

        if (openRef.current) {
          void refreshList();
        }

        return;
      }

      if (payload.type === "notification:read" || payload.type === "notification:read-all") {
        emitNotificationsUpdated();
        void refreshUnread();

        if (openRef.current) {
          void refreshList();
        }
      }
    };

    return () => {
      socket.close();
    };
  }, []);

  const handleOpen = (): void => {
    setOpen((current) => !current);
  };

  const handleMarkAll = async (): Promise<void> => {
    await markAllNotificationsRead();
    await refreshUnread();
    await refreshList();
    emitNotificationsUpdated();
  };

  const handleItemClick = async (record: NotificationRecord): Promise<void> => {
    if (!record.readAt) {
      await markNotificationRead(record.id);
    }

    setOpen(false);
    await refreshUnread();
    emitNotificationsUpdated();
    await router.navigate({ to: resolveNotificationLink(record) });
  };

  return (
    // Static on a phone so the panel below is positioned against the header
    // rather than against this button: anchored to the button, a panel nearly
    // as wide as the viewport starts about 90px from the right edge and runs
    // off the left one. `relative` comes back once there is room for a real
    // dropdown.
    <div className="static sm:relative" ref={panelRef}>
      <button
        type="button"
        aria-label={t("notif.title")}
        className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-card text-ink transition-colors hover:bg-chip-active"
        onClick={(event) => {
          event.stopPropagation();
          handleOpen();
        }}
      >
        <Bell className="size-4" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-accent px-1 text-[0.6rem] font-bold leading-4 text-ink">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          className={cn(
            "absolute inset-x-3 top-full z-50 mt-2 sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-96 rounded-[calc(var(--radius)+0.25rem)]",
            "border border-hairline bg-paper p-3 shadow-[0_18px_38px_-20px_rgba(19,27,46,0.2)]"
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2 border-b border-hairline/15 pb-3">
            <p className="text-sm font-semibold text-ink">{t("notif.title")}</p>
            <Button
              type="button"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => void handleMarkAll()}
            >{t("notif.markAll")}</Button>
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto py-3">
            {isLoading ? (
              <NotificationListSkeleton rows={3} />
            ) : items.length > 0 ? (
              items.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-left transition-colors",
                    record.readAt ? "bg-panel-warm/60" : "bg-panel-warm"
                  )}
                  onClick={() => void handleItemClick(record)}
                >
                  <p className="text-sm font-semibold text-ink">{record.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink/62">
                    {record.body ? stripHtml(record.body).trim() : ""}
                  </p>
                  <p className="mt-2 text-[0.65rem] text-ink/45">{record.type}</p>
                </button>
              ))
            ) : (
              <p className="text-sm text-ink/58">{t("notif.empty")}</p>
            )}
          </div>
          {clientEnv.firebaseVapidKey ? (
            <p className="border-t border-hairline pt-2 text-[0.65rem] text-ink/50">{t("notif.pushOn")}</p>
          ) : (
            <p className="border-t border-hairline pt-2 text-[0.65rem] text-ink/50">{t("notif.pushKeyMissing")}</p>
          )}
          <div className="pt-2">
            <Button asChild variant="outline" className="h-9 w-full text-xs">
              <Link to="/dashboard">{t("notif.openDashboard")}</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
