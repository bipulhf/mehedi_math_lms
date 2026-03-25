import { BookCopy, ChartColumn, LayoutDashboard, Settings, UserRound, Users } from "lucide-react";
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
    { icon: Users, label: "Users", to: "/dashboard" },
    { icon: BookCopy, label: "Courses", to: "/dashboard" },
    { icon: ChartColumn, label: "Insights", to: "/dashboard" }
  ],
  STUDENT: [
    { icon: LayoutDashboard, label: "Overview", to: "/dashboard" },
    { icon: UserRound, label: "Profile", to: "/dashboard/profile" },
    { icon: BookCopy, label: "Courses", to: "/dashboard" },
    { icon: ChartColumn, label: "Progress", to: "/dashboard" }
  ],
  TEACHER: [
    { icon: LayoutDashboard, label: "Overview", to: "/dashboard" },
    { icon: UserRound, label: "Profile", to: "/dashboard/profile" },
    { icon: BookCopy, label: "Courses", to: "/dashboard" },
    { icon: Users, label: "Students", to: "/dashboard" },
    { icon: ChartColumn, label: "Analytics", to: "/dashboard" }
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
