import { Link } from "@tanstack/react-router";
import { BookOpen, GraduationCap, LayoutDashboard, MessageSquareText } from "lucide-react";
import type { JSX, PropsWithChildren } from "react";

import { NotificationBell } from "@/components/notifications/notification-bell";
import { cn } from "@/lib/utils";

export interface AppShellNavItem {
  badge?: number | undefined;
  icon: typeof LayoutDashboard;
  label: string;
  to: string;
}

interface AppShellProps extends PropsWithChildren {
  description: string;
  navItems: readonly AppShellNavItem[];
  title: string;
}

export function AppShell({ children, description, navItems, title }: AppShellProps): JSX.Element {
  return (
    <div className="min-h-screen bg-surface px-4 py-4 text-on-surface sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-360 gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside
          className={cn(
            "rounded-[calc(var(--radius)+0.375rem)] bg-surface/80 p-4 backdrop-blur-xl",
            "shadow-[0_18px_38px_-20px_rgba(19,27,46,0.18)]"
          )}
        >
          <div className="mb-8 space-y-2 px-2 pt-2">
            <div className="inline-flex size-12 items-center justify-center rounded-full bg-surface-container-highest text-primary">
              <GraduationCap className="size-5" />
            </div>
            <div>
              <p className="font-display text-xl font-semibold">{title}</p>
              <p className="max-w-[24ch] text-sm leading-6 text-on-surface/62">{description}</p>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex min-h-11 items-center gap-3 rounded-full px-4 py-3 text-sm font-medium text-on-surface/68 transition-all duration-150 ease-out hover:bg-surface-container-highest hover:text-on-surface"
                  activeProps={{
                    className:
                      "bg-surface-container-highest text-on-surface shadow-[0_10px_24px_-16px_rgba(19,27,46,0.25)]"
                  }}
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                  {item.badge && item.badge > 0 ? (
                    <span className="ml-auto inline-flex min-w-6 items-center justify-center rounded-full bg-violet-100 px-2 py-1 text-[0.65rem] font-semibold text-violet-900">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-(--radius) bg-surface-container-low p-4">
            <div className="flex items-center gap-3">
              <BookOpen className="size-4 text-secondary-container" />
              <p className="text-sm font-semibold">Editorial Learning</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-on-surface/62">
              Smooth skeletons, quiet surfaces, and zero visual noise across every dashboard view.
            </p>
          </div>
        </aside>

        <div className="space-y-4">
          <header className="rounded-[calc(var(--radius)+0.375rem)] bg-surface-container-low p-4 shadow-[0_12px_30px_-18px_rgba(19,27,46,0.18)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[0.75rem] font-semibold uppercase tracking-[0.05em] text-on-surface/54">
                  Active Workspace
                </p>
                <h1 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-semibold tracking-[-0.03em]">
                  {title}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <NotificationBell />
                <Link
                  to="/dashboard/messages"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface transition-colors hover:bg-surface-container-highest"
                >
                  <MessageSquareText className="size-4" />
                </Link>
              </div>
            </div>
          </header>

          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
