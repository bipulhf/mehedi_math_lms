import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";

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
import { buildApiWebSocketUrl } from "@/lib/ws-url";
import { cn } from "@/lib/utils";

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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<readonly NotificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const openRef = useRef(false);

  const refreshUnread = async (): Promise<void> => {
    const count = await getNotificationUnreadCount();

    setUnread(count);
  };

  const refreshList = async (): Promise<void> => {
    setIsLoading(true);

    try {
      const page = await listNotifications({ limit: 12, page: 1 });

      setItems(page.items);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshUnread();

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
    void tryRegisterWebPush();
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

  useEffect(() => {
    if (open) {
      void refreshList();
    }
  }, [open]);

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
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-label="Notifications"
        className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface transition-colors hover:bg-surface-container-highest"
        onClick={(event) => {
          event.stopPropagation();
          handleOpen();
        }}
      >
        <Bell className="size-4" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-violet-600 px-1 text-[0.6rem] font-bold leading-4 text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          className={cn(
            "absolute right-0 z-50 mt-3 w-[min(100vw-1.5rem,24rem)] rounded-[calc(var(--radius)+0.25rem)]",
            "border border-outline-variant/40 bg-surface p-3 shadow-[0_18px_38px_-20px_rgba(19,27,46,0.2)]"
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2 border-b border-outline-variant/50 pb-3">
            <p className="text-sm font-semibold text-on-surface">Notifications</p>
            <Button type="button" variant="outline" className="h-8 text-xs" onClick={() => void handleMarkAll()}>
              Mark all read
            </Button>
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto py-3">
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-12 rounded-md bg-surface-container-low" />
                <div className="h-12 rounded-md bg-surface-container-low" />
              </div>
            ) : items.length > 0 ? (
              items.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-left transition-colors",
                    record.readAt ? "bg-surface-container-low/60" : "bg-surface-container-low"
                  )}
                  onClick={() => void handleItemClick(record)}
                >
                  <p className="text-sm font-semibold text-on-surface">{record.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-on-surface/62">{record.body}</p>
                  <p className="mt-2 text-[0.65rem] text-on-surface/45">{record.type}</p>
                </button>
              ))
            ) : (
              <p className="text-sm text-on-surface/58">No notifications yet.</p>
            )}
          </div>
          {clientEnv.firebaseVapidKey ? (
            <p className="border-t border-outline-variant/40 pt-2 text-[0.65rem] text-on-surface/50">
              Browser push is active when permission is granted.
            </p>
          ) : (
            <p className="border-t border-outline-variant/40 pt-2 text-[0.65rem] text-on-surface/50">
              Set VITE_FIREBASE_VAPID_KEY for web push.
            </p>
          )}
          <div className="pt-2">
            <Button asChild variant="outline" className="h-9 w-full text-xs">
              <Link to="/dashboard">Open dashboard</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
