import { AlertTriangle, BookCopy, ChartColumn, Layers3, LayoutDashboard, MessageSquareText, Settings, UserRound, Users } from "lucide-react";
import type { JSX, PropsWithChildren } from "react";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { listMessageConversations, MESSAGES_UNREAD_EVENT } from "@/lib/api/messages";
import type { UserRole } from "@mma/shared";

interface DashboardLayoutProps extends PropsWithChildren {
  role?: UserRole;
}

const dashboardNavigation = {
  ACCOUNTANT: [
    { icon: LayoutDashboard, label: "Overview", to: "/dashboard" },
    { icon: UserRound, label: "Profile", to: "/dashboard/profile" },
    { icon: ChartColumn, label: "Payments", to: "/dashboard/payments" },
    { icon: Settings, label: "Operations", to: "/dashboard/payments" }
  ],
  ADMIN: [
    { icon: LayoutDashboard, label: "Overview", to: "/dashboard" },
    { icon: UserRound, label: "Profile", to: "/dashboard/profile" },
    { icon: Users, label: "Users", to: "/dashboard/admin/users" },
    { icon: Layers3, label: "Categories", to: "/dashboard/admin/categories" },
    { icon: AlertTriangle, label: "Bugs", to: "/dashboard/admin/bugs" },
    { icon: BookCopy, label: "Courses", to: "/dashboard/admin/courses" }
  ],
  STUDENT: [
    { icon: LayoutDashboard, label: "Overview", to: "/dashboard" },
    { icon: UserRound, label: "Profile", to: "/dashboard/profile" },
    { icon: BookCopy, label: "My Courses", to: "/dashboard/my-courses" },
    { icon: MessageSquareText, label: "Messages", to: "/dashboard/messages" },
    { icon: ChartColumn, label: "Payments", to: "/dashboard/payments" },
    { icon: AlertTriangle, label: "My Bugs", to: "/dashboard/bugs" },
    { icon: Settings, label: "Report Bug", to: "/dashboard/bugs/report" }
  ],
  TEACHER: [
    { icon: LayoutDashboard, label: "Overview", to: "/dashboard" },
    { icon: UserRound, label: "Profile", to: "/dashboard/profile" },
    { icon: BookCopy, label: "Courses", to: "/dashboard/courses" },
    { icon: MessageSquareText, label: "Messages", to: "/dashboard/messages" },
    { icon: Users, label: "Students", to: "/dashboard" },
    { icon: ChartColumn, label: "Analytics", to: "/dashboard" },
    { icon: AlertTriangle, label: "My Bugs", to: "/dashboard/bugs" },
    { icon: Settings, label: "Report Bug", to: "/dashboard/bugs/report" }
  ]
} as const;

export function DashboardLayout({
  children,
  role = "ADMIN"
}: DashboardLayoutProps): JSX.Element {
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);

  useEffect(() => {
    if (role !== "STUDENT" && role !== "TEACHER") {
      setMessageUnreadCount(0);
      return;
    }

    void (async () => {
      const conversations = await listMessageConversations();

      setMessageUnreadCount(
        conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0)
      );
    })();

    const handleUnreadEvent = (event: Event): void => {
      const customEvent = event as CustomEvent<{ count: number }>;

      setMessageUnreadCount(customEvent.detail.count);
    };

    window.addEventListener(MESSAGES_UNREAD_EVENT, handleUnreadEvent);

    return () => {
      window.removeEventListener(MESSAGES_UNREAD_EVENT, handleUnreadEvent);
    };
  }, [role]);

  const navItems = useMemo(() => {
    if (role !== "STUDENT" && role !== "TEACHER") {
      return dashboardNavigation[role];
    }

    return dashboardNavigation[role].map((item) =>
      item.to === "/dashboard/messages"
        ? {
            ...item,
            badge: messageUnreadCount
          }
        : item
    );
  }, [messageUnreadCount, role]);

  return (
    <AppShell
      title="Dashboard Atelier"
      description="A glassmorphic academic cockpit tuned for calm oversight and clear action."
      navItems={navItems}
    >
      {children}
    </AppShell>
  );
}
