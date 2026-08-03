import {
  AlertTriangle,
  BookCopy,
  ChartColumn,
  Layers3,
  LayoutDashboard,
  Megaphone,
  MessageSquareText,
  Settings,
  ShieldAlert,
  Smartphone,
  UserRound,
  Users
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { JSX, PropsWithChildren } from "react";
import { useEffect, useMemo } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { listMessageConversations } from "@/lib/api/messages";
import { queryKeys } from "@/lib/query/keys";
import { useUiStore } from "@/stores/ui-store";
import type { UserRole } from "@genex/shared";

interface DashboardLayoutProps extends PropsWithChildren {
  isLoading?: boolean;
  role?: UserRole;
}

const dashboardNavigation = {
  ACCOUNTANT: [
    { icon: LayoutDashboard, label: "Overview", to: "/dashboard" },
    { icon: UserRound, label: "Profile", to: "/dashboard/profile" },
    { icon: ChartColumn, label: "Financial analytics", to: "/dashboard/accountant/analytics" },
    { icon: ChartColumn, label: "Payments", to: "/dashboard/payments" },
    { icon: Settings, label: "Operations", to: "/dashboard/payments" }
  ],
  ADMIN: [
    { icon: LayoutDashboard, label: "Overview", to: "/dashboard" },
    { icon: UserRound, label: "Profile", to: "/dashboard/profile" },
    { icon: Megaphone, label: "Notify", to: "/dashboard/notifications/send" },
    { icon: Smartphone, label: "SMS", to: "/dashboard/admin/sms" },
    { icon: Users, label: "Users", to: "/dashboard/admin/users" },
    { icon: Layers3, label: "Categories", to: "/dashboard/admin/categories" },
    { icon: AlertTriangle, label: "Bugs", to: "/dashboard/admin/bugs" },
    { icon: ShieldAlert, label: "Reports", to: "/dashboard/admin/message-reports" },
    { icon: BookCopy, label: "Courses", to: "/dashboard/admin/courses" },
    { icon: ChartColumn, label: "Analytics", to: "/dashboard/admin/analytics" }
  ],
  STUDENT: [
    { icon: LayoutDashboard, label: "Overview", to: "/dashboard" },
    { icon: UserRound, label: "Profile", to: "/dashboard/profile" },
    { icon: BookCopy, label: "My Courses", to: "/dashboard/my-courses" },
    { icon: MessageSquareText, label: "Messages", to: "/dashboard/messages" },
    { icon: ChartColumn, label: "Payments", to: "/dashboard/payments" },
    { icon: AlertTriangle, label: "My Bugs", to: "/dashboard/bugs" }
  ],
  TEACHER: [
    { icon: LayoutDashboard, label: "Overview", to: "/dashboard" },
    { icon: UserRound, label: "Profile", to: "/dashboard/profile" },
    { icon: BookCopy, label: "Courses", to: "/dashboard/courses" },
    { icon: Megaphone, label: "Notify", to: "/dashboard/notifications/send" },
    { icon: MessageSquareText, label: "Messages", to: "/dashboard/messages" },
    { icon: Users, label: "Students", to: "/dashboard/students" },
    { icon: ChartColumn, label: "Analytics", to: "/dashboard/analytics" },
    { icon: AlertTriangle, label: "My Bugs", to: "/dashboard/bugs" }
  ]
} as const;

export function DashboardLayout({ children, isLoading, role = "ADMIN" }: DashboardLayoutProps): JSX.Element {
  const canMessage = role === "STUDENT" || role === "TEACHER";
  const messageUnreadCount = useUiStore((state) => state.messageUnreadCount);
  const setMessageUnreadCount = useUiStore((state) => state.setMessageUnreadCount);
  // The badge's opening value. The messages page owns it from then on, pushing
  // socket-driven changes into the same store slice.
  const { data: conversations } = useQuery({
    enabled: canMessage,
    queryFn: async () => listMessageConversations(),
    queryKey: queryKeys.messages.conversations("")
  });

  useEffect(() => {
    if (!canMessage) {
      setMessageUnreadCount(0);

      return;
    }

    if (!conversations) {
      return;
    }

    setMessageUnreadCount(
      conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0)
    );
  }, [canMessage, conversations, setMessageUnreadCount]);

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
    <AppShell title="Dashboard Atelier" description={null} isLoading={isLoading} navItems={navItems}>
      {children}
    </AppShell>
  );
}
