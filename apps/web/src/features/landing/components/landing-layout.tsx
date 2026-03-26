import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import type { PropsWithChildren } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSession } from "@/hooks/use-auth-session";

export function LandingLayout({ children, showGrid = true }: PropsWithChildren<{ showGrid?: boolean }>) {
  const { isPending, session } = useAuthSession();
  return (
    <div className="min-h-screen bg-background text-on-background font-body selection:bg-secondary-container selection:text-on-secondary-container relative">
      {/* Fixed background pattern */}
      {showGrid && (
        <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px] pointer-events-none z-0 opacity-60"></div>
      )}

      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl shadow-sm">
        <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-12">
            <Link
              to="/"
              className="text-xl font-bold tracking-tighter text-on-surface font-headline"
            >
              Mehedi's Math Academy
            </Link>
            <div className="hidden md:flex gap-8 items-center">
              <Link
                to="/categories"
                className="font-manrope tracking-tight text-sm font-semibold text-secondary border-b-2 border-secondary"
              >
                Catalog
              </Link>
              <Link
                to="/"
                className="font-manrope tracking-tight text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors duration-200"
              >
                Enterprise
              </Link>
              <Link
                to="/"
                className="font-manrope tracking-tight text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors duration-200"
              >
                SSC/HSC Prep
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center bg-surface-container-low px-4 py-2 rounded-full border border-outline-variant/10">
              <Search className="text-outline size-4" />
              <Input
                className="bg-transparent border-none outline-none ring-0 focus-visible:ring-0 shadow-none text-sm w-48 font-light py-0 h-auto"
                placeholder="Search courses..."
                type="text"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-6 w-px bg-outline-variant/30 mx-2"></div>
              {isPending ? (
                <div className="flex items-center gap-4">
                  <Skeleton className="h-11 w-32 rounded-2xl bg-surface-container-high" />
                </div>
              ) : session ? (
                <Button variant="gradient" asChild className="font-headline rounded-2xl px-6 h-11">
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    asChild
                    className="font-manrope tracking-tight text-sm font-semibold text-on-surface-variant hover:text-on-surface hover:bg-transparent"
                  >
                    <Link to="/auth/sign-in">Log In</Link>
                  </Button>
                  <Button
                    variant="gradient"
                    asChild
                    className="font-headline rounded-2xl px-6 h-11"
                  >
                    <Link to="/auth/sign-up">Get Started</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-24">{children}</main>

      {/* Footer */}
      <footer className="w-full border-t border-outline-variant/20 bg-surface-container-lowest">
        <div className="flex flex-col md:flex-row justify-between items-center px-12 py-16 gap-8 w-full max-w-7xl mx-auto">
          <div className="space-y-4 text-center md:text-left">
            <span className="text-lg font-black text-on-surface">Mehedi's Math Academy</span>
            <p className="font-inter text-xs tracking-wider uppercase text-on-surface-variant max-w-xs">
              © {new Date().getFullYear()} Mehedi's Math Academy.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <Link
              to="/"
              className="font-inter text-xs tracking-wider uppercase text-on-surface-variant hover:text-secondary transition-all"
            >
              Privacy Policy
            </Link>
            <Link
              to="/"
              className="font-inter text-xs tracking-wider uppercase text-on-surface-variant hover:text-secondary transition-all"
            >
              Terms of Service
            </Link>
            <Link
              to="/"
              className="font-inter text-xs tracking-wider uppercase text-on-surface-variant hover:text-secondary transition-all"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
