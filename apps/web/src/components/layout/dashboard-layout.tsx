import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BookCopy,
  ChartColumn,
  History,
  Layers3,
  LayoutDashboard,
  ListOrdered,
  Megaphone,
  MessageSquareText,
  ShieldAlert,
  Smartphone,
  UserRound,
  Users
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { JSX, PropsWithChildren } from "react";
import { useEffect, useMemo } from "react";

import { Link } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-context";
import { listMessageConversations } from "@/lib/api/messages";
import { queryKeys } from "@/lib/query/keys";
import { useUiStore } from "@/stores/ui-store";
import type { MessageKey } from "@genex/i18n";
import type { UserRole } from "@genex/shared";

interface DashboardLayoutProps extends PropsWithChildren {
  isLoading?: boolean;
  role?: UserRole;
}

/**
 * Labels are message keys, not strings: the sidebar is chrome, and chrome is
 * bilingual. The accountant row exists because ACCOUNTANT is a real fourth role
 * here — the handoff's fourth role is an institution admin, which is cut.
 */
const dashboardNavigation = {
  ACCOUNTANT: [
    { icon: LayoutDashboard, labelKey: "nav.overview", to: "/dashboard" },
    { icon: UserRound, labelKey: "nav.profile", to: "/dashboard/profile" },
    { icon: ChartColumn, labelKey: "nav.analytics", to: "/dashboard/accountant/analytics" },
    { icon: ChartColumn, labelKey: "nav.payments", to: "/dashboard/payments" }
  ],
  ADMIN: [
    { icon: LayoutDashboard, labelKey: "nav.overview", to: "/dashboard" },
    { icon: UserRound, labelKey: "nav.profile", to: "/dashboard/profile" },
    { icon: BookCopy, labelKey: "nav.courseApproval", to: "/dashboard/admin/courses" },
    { icon: ListOrdered, labelKey: "nav.featuredCourses", to: "/dashboard/admin/featured-courses" },
    { icon: Users, labelKey: "nav.users", to: "/dashboard/admin/users" },
    { icon: Layers3, labelKey: "nav.categoryAdmin", to: "/dashboard/admin/categories" },
    { icon: Megaphone, labelKey: "nav.notify", to: "/dashboard/notifications/send" },
    { icon: Smartphone, labelKey: "nav.sms", to: "/dashboard/admin/sms" },
    { icon: AlertTriangle, labelKey: "nav.bugs", to: "/dashboard/admin/bugs" },
    { icon: ShieldAlert, labelKey: "nav.reports", to: "/dashboard/admin/message-reports" },
    { icon: ChartColumn, labelKey: "nav.analytics", to: "/dashboard/admin/analytics" },
    { icon: History, labelKey: "nav.logs", to: "/dashboard/admin/logs" }
  ],
  STUDENT: [
    { icon: LayoutDashboard, labelKey: "nav.overview", to: "/dashboard" },
    { icon: BookCopy, labelKey: "nav.myCourses", to: "/dashboard/my-courses" },
    { icon: MessageSquareText, labelKey: "nav.messages", to: "/dashboard/messages" },
    { icon: ChartColumn, labelKey: "nav.payments", to: "/dashboard/payments" },
    { icon: UserRound, labelKey: "nav.profile", to: "/dashboard/profile" },
    { icon: AlertTriangle, labelKey: "nav.bugs", to: "/dashboard/bugs" }
  ],
  TEACHER: [
    { icon: LayoutDashboard, labelKey: "nav.overview", to: "/dashboard" },
    { icon: BookCopy, labelKey: "nav.teacherCourses", to: "/dashboard/courses" },
    { icon: MessageSquareText, labelKey: "nav.messages", to: "/dashboard/messages" },
    { icon: Users, labelKey: "nav.students", to: "/dashboard/students" },
    { icon: ChartColumn, labelKey: "nav.analytics", to: "/dashboard/analytics" },
    { icon: Megaphone, labelKey: "nav.notify", to: "/dashboard/notifications/send" },
    { icon: UserRound, labelKey: "nav.profile", to: "/dashboard/profile" },
    { icon: AlertTriangle, labelKey: "nav.bugs", to: "/dashboard/bugs" }
  ]
} as const satisfies Record<UserRole, readonly { icon: LucideIcon; labelKey: MessageKey; to: string }[]>;

export function DashboardLayout({ children, isLoading, role = "ADMIN" }: DashboardLayoutProps): JSX.Element {
  const t = useT();
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

  const navItems = useMemo(
    () =>
      dashboardNavigation[role].map((item) => ({
        icon: item.icon,
        label: t(item.labelKey),
        to: item.to,
        ...(item.to === "/dashboard/messages" ? { badge: messageUnreadCount } : {})
      })),
    [messageUnreadCount, role, t]
  );

  // DESIGN.md §1 allows exactly one accent action in an app shell. For a
  // teacher the design makes it "+ নতুন কোর্স"; no other role has an action
  // that earns it, so they get none rather than a different one.
  const primaryAction =
    role === "TEACHER" ? (
      <Button asChild size="sm" variant="accent">
        <Link to="/dashboard/courses/new">{t("nav.newCourse")}</Link>
      </Button>
    ) : undefined;

  return (
    <AppShell
      description={null}
      isLoading={isLoading}
      navItems={navItems}
      primaryAction={primaryAction}
      title={t("nav.dashboard")}
    >
      {children}
    </AppShell>
  );
}
