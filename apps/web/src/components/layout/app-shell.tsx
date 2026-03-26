import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { useState, type JSX, type PropsWithChildren, useEffect } from "react";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Close mobile menu on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [router.state.location.pathname]);

  return (
    <div className="min-h-screen bg-background text-on-background font-body selection:bg-secondary-container selection:text-on-secondary-container flex flex-col relative">
      {/* Background patterns and glowing orbs */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px] pointer-events-none z-0 opacity-60"></div>
      <div className="fixed top-0 right-0 w-200 h-200 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none z-[-1]"></div>
      <div className="fixed bottom-0 left-0 w-150 h-150 bg-secondary/5 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3 pointer-events-none z-[-1]"></div>

      {/* Sidebar Overlay for Mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-99 lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className="mx-auto flex w-full max-w-360 items-start gap-8 relative z-10 flex-1 p-4 sm:p-6 lg:p-8">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-100 w-72 transform bg-surface-container-lowest/95 p-6 backdrop-blur-3xl border-r border-outline-variant/40 transition-transform duration-500 ease-in-out lg:translate-x-0 lg:sticky lg:top-8 lg:flex lg:h-[calc(100vh-4rem)] lg:rounded-4xl lg:border lg:bg-surface-container-lowest/80 lg:shadow-2xl flex flex-col",
            isMobileMenuOpen ? "translate-x-0 shadow-3xl" : "-translate-x-full"
          )}
        >
          <div className="mb-10 flex items-center justify-between px-2 pt-2">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg">
                <Menu className="size-6 rotate-90" />
              </div>
              <p className="font-headline text-lg font-extrabold tracking-tight text-on-surface leading-tight">
                Mehedi&apos;s Math Academy
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden rounded-full size-8 p-0"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X className="size-5" />
            </Button>
          </div>

          <nav className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="px-3 mb-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-on-surface/40">
                Navigation
              </p>
            </div>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex h-12 items-center gap-3 rounded-2xl px-4 py-3">
                    <Skeleton className="size-5 rounded bg-surface-container-highest" />
                    <Skeleton className="h-4 w-24 bg-surface-container-highest" />
                  </div>
                ))
              : navItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="group flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-on-surface/68 transition-all duration-300 ease-out hover:bg-primary/5 hover:text-primary [&.active]:bg-primary [&.active]:text-white [&.active]:shadow-lg [&.active]:hover:bg-primary/95"
                      activeProps={{ className: "active" }}
                      activeOptions={{ exact: item.to === "/dashboard" }}
                      onClick={() => setIsMobileMenuOpen(false)}
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

          <div className="mt-auto space-y-3 pt-6 border-t border-outline-variant/20">
            <Button
              variant="outline"
              className="w-full justify-start rounded-2xl gap-3 h-12 border-outline-variant/30 text-on-surface/60 hover:text-primary transition-all"
              onClick={() => router.navigate({ to: "/courses" })}
            >
              <ArrowLeft className="size-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Academy Portal</span>
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 space-y-6">
          <header className="rounded-4xl bg-surface-container-lowest/80 p-4 backdrop-blur-3xl border border-outline-variant/40 shadow-xl relative overflow-hidden group min-h-20 flex items-center">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-secondary/5 rounded-full blur-2xl pointer-events-none transition-all duration-1000 group-hover:bg-secondary/10 z-[-1]"></div>
            <div className="flex items-center justify-between w-full relative z-10 px-2 lg:px-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden rounded-2xl size-12 bg-surface-container-low border border-outline-variant/20 shadow-sm"
                  onClick={() => setIsMobileMenuOpen(true)}
                >
                  <Menu className="size-6" />
                </Button>
                <div className="flex flex-col">
                  <span className="hidden lg:block text-[0.65rem] font-bold uppercase tracking-[0.25em] text-primary/60 mb-1 animate-in slide-in-from-left duration-500">
                    Workspace
                  </span>
                  <h1 className="font-headline text-xl sm:text-2xl font-extrabold tracking-tight text-on-surface leading-tight">
                    {title}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                <NotificationBell />
                <div className="w-px h-8 bg-outline-variant/30 mx-1 hidden sm:block"></div>
                <Button
                  type="button"
                  onClick={() => void handleSignOut()}
                  disabled={isSigningOut}
                  className="inline-flex size-12 items-center justify-center rounded-2xl bg-surface-container-low border border-outline-variant/30 text-on-surface transition-all duration-300 hover:bg-red-500/5 hover:text-red-500 hover:border-red-500/20 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Log out"
                >
                  <LogOut className="size-5" />
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
