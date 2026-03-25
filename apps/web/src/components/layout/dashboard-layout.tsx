import { AlertTriangle, BookCopy, ChartColumn, Layers3, LayoutDashboard, Settings, UserRound, Users } from "lucide-react";
import type { JSX, PropsWithChildren } from "react";

import { AppShell } from "@/components/layout/app-shell";
import type { UserRole } from "@mma/shared";

interface DashboardLayoutProps extends PropsWithChildren {
  role?: UserRole;
}

const dashboardNavigation = {
  ACCOUNTANT: [
    { icon: LayoutDashboard, label: "Overview", to: "/dashboard" },
    { icon: UserRound, label: "Profile", to: "/dashboard/profile" },
    { icon: ChartColumn, label: "Payments", to: "/dashboard" },
    { icon: Settings, label: "Operations", to: "/dashboard" }
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
    { icon: BookCopy, label: "Courses", to: "/dashboard" },
    { icon: ChartColumn, label: "Progress", to: "/dashboard" },
    { icon: AlertTriangle, label: "My Bugs", to: "/dashboard/bugs" },
    { icon: Settings, label: "Report Bug", to: "/dashboard/bugs/report" }
  ],
  TEACHER: [
    { icon: LayoutDashboard, label: "Overview", to: "/dashboard" },
    { icon: UserRound, label: "Profile", to: "/dashboard/profile" },
    { icon: BookCopy, label: "Courses", to: "/dashboard/courses" },
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
  return (
    <AppShell
      title="Dashboard Atelier"
      description="A glassmorphic academic cockpit tuned for calm oversight and clear action."
      navItems={dashboardNavigation[role]}
    >
      {children}
    </AppShell>
  );
}
