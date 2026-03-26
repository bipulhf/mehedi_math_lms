import { Link } from "@tanstack/react-router";
import { BookOpen, MessageSquareText, type LucideIcon } from "lucide-react";
import type { JSX, PropsWithChildren } from "react";

import { NotificationBell } from "@/components/notifications/notification-bell";
import { cn } from "@/lib/utils";

export interface AppShellNavItem {
  badge?: number | undefined;
  icon: LucideIcon;
  label: string;
  to: string;
}

interface AppShellProps extends PropsWithChildren {
  description: string | null;
  navItems: readonly AppShellNavItem[];
  title: string;
}

export function AppShell({ children, description, navItems, title }: AppShellProps): JSX.Element {
  return (
    <div className="min-h-screen bg-background text-on-background font-body selection:bg-secondary-container selection:text-on-secondary-container relative flex flex-col overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      {/* Background patterns and glowing orbs */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px] pointer-events-none z-0 opacity-60"></div>
      <div className="fixed top-0 right-0 w-200 h-200 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none z-[-1]"></div>
      <div className="fixed bottom-0 left-0 w-150 h-150 bg-secondary/5 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3 pointer-events-none z-[-1]"></div>

      <div className="mx-auto grid w-full max-w-360 gap-6 lg:gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] relative z-10 flex-1">
        <aside
          className={cn(
            "rounded-4xl bg-surface-container-lowest/80 p-6 backdrop-blur-3xl border border-outline-variant/40",
            "shadow-2xl flex flex-col lg:h-[calc(100vh-3rem)] lg:sticky lg:top-6"
          )}
        >
          <div className="mb-10 space-y-4 px-2 pt-2">
            <div>
              <p className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">
                {title}
              </p>
              <p className="mt-1 max-w-[24ch] text-sm leading-6 text-on-surface-variant font-light">
                {description}
              </p>
            </div>
          </div>

          <nav className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-on-surface/68 transition-all duration-300 ease-out hover:bg-surface-container-high hover:text-on-surface [&.active]:bg-primary [&.active]:text-white [&.active]:shadow-md [&.active]:hover:bg-primary"
                  activeProps={{ className: "active" }}
                  activeOptions={{ exact: item.to === "/dashboard" }}
                >
                  <Icon className="size-5 transition-transform group-hover:scale-110" />
                  <span>{item.label}</span>
                  {item.badge && item.badge > 0 ? (
                    <span className="ml-auto inline-flex min-w-6 items-center justify-center rounded-full bg-surface-container-highest px-2 py-1 text-[0.65rem] font-bold text-on-surface group-[.active]:bg-white/20 group-[.active]:text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-3xl bg-linear-to-br from-surface-container-low/50 to-surface-container-lowest p-5 border border-outline-variant/30 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/10 rounded-full blur-xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
            <div className="flex items-center gap-3 relative z-10">
              <BookOpen className="size-5 text-secondary" />
              <p className="text-sm font-headline font-semibold text-on-surface">
                Academic Atelier
              </p>
            </div>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant font-light relative z-10">
              Your frictionless environment for mastery and deep work.
            </p>
          </div>
        </aside>

        <div className="space-y-6 flex flex-col">
          <header className="rounded-4xl bg-surface-container-lowest/80 p-4 backdrop-blur-3xl border border-outline-variant/40 shadow-xl relative overflow-hidden group">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-secondary/5 rounded-full blur-2xl pointer-events-none transition-all duration-1000 group-hover:bg-secondary/10 z-[-1]"></div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between relative z-10">
              <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface leading-none">
                {title}
              </h1>
              <div className="flex items-center gap-4">
                <NotificationBell />
                <Link
                  to="/dashboard/messages"
                  className="inline-flex size-12 items-center justify-center rounded-2xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface transition-all duration-300 hover:bg-surface-container-high hover:shadow-sm"
                >
                  <MessageSquareText className="size-5" />
                </Link>
              </div>
            </div>
          </header>

          <main className="flex-1 w-full">{children}</main>
        </div>
      </div>
    </div>
  );
}
