import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, LogOut, MessageSquareText, type LucideIcon } from "lucide-react";
import { useState, type JSX, type PropsWithChildren } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { authClient } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

export interface AppShellNavItem {
  badge?: number | undefined;
  icon: LucideIcon;
  label: string;
  to: string;
}

interface AppShellProps extends PropsWithChildren {
  description: string | null;
  isLoading?: boolean | undefined;
  navItems: readonly AppShellNavItem[];
  title: string;
}

export function AppShell({ children, isLoading, navItems, title }: AppShellProps): JSX.Element {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async (): Promise<void> => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      await authClient.signOut();
      await router.navigate({ to: "/auth/sign-in" });
    } finally {
      setIsSigningOut(false);
    }
  };

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
                Mehedi&apos;s Math Academy
              </p>
            </div>
          </div>

          <nav className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex h-12 items-center gap-3 rounded-2xl px-4 py-3">
                  <Skeleton className="size-5 rounded bg-surface-container-highest" />
                  <Skeleton className="h-4 w-24 bg-surface-container-highest" />
                </div>
              ))
            ) : (
              navItems.map((item) => {
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
              })
            )}
          </nav>
          <Button variant={"outline"} onClick={() => router.navigate({ to: "/courses" })}>
            <ArrowLeft /> Courses Page
          </Button>
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
                <Button
                  type="button"
                  onClick={() => void handleSignOut()}
                  disabled={isSigningOut}
                  className="inline-flex size-12 items-center justify-center rounded-2xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface transition-all duration-300 hover:bg-surface-container-high hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Log out"
                >
                  <LogOut className="size-5" />
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 w-full">{children}</main>
        </div>
      </div>
    </div>
  );
}
