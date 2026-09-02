/// <reference types="vite/client" />
import type { JSX, PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { localeTags } from "@mma/i18n";

// Bengali first: it is the default locale, so it is the subset the first
// paint needs. Latin covers the English locale and the Archivo labels.
import hindBengaliWoff2 from "@fontsource/hind-siliguri/files/hind-siliguri-bengali-400-normal.woff2?url";
import hindLatinWoff2 from "@fontsource/hind-siliguri/files/hind-siliguri-latin-400-normal.woff2?url";

import { RouteErrorView } from "@/components/common/route-error";
import { LocaleProvider, useLocale } from "@/lib/i18n/locale-context";
import { readLocale } from "@/lib/i18n/locale-cookie";
import { createQueryClient } from "@/lib/query/query-client";
import { ThemeProvider } from "@/lib/theme/theme-context";
import type { Theme } from "@/lib/theme/theme-cookie";
import { readTheme, themeBootstrapScript } from "@/lib/theme/theme-cookie";
import { setActiveQueryClient } from "@/lib/query/refresh-on-mutation";
import { siteConfig } from "@/lib/site";
import appCss from "@/styles/app.css?url";
import katexCss from "katex/dist/katex.min.css?url";

export const Route = createRootRoute({
  // Reading the cookie here rather than in an effect is what stops the page
  // rendering in one language and then flipping to the other after hydration.
  beforeLoad: () => ({ locale: readLocale(), theme: readTheme() }),
  head: () => ({
    meta: [
      {
        charSet: "utf-8"
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1"
      },
      {
        title: siteConfig.name
      },
      {
        name: "description",
        content: siteConfig.description
      },
      {
        name: "theme-color",
        content: "#f7f9fc"
      },
      {
        property: "og:site_name",
        content: siteConfig.name
      },
      {
        property: "og:url",
        content: siteConfig.url
      }
    ],
    links: [
      { rel: "icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", href: "/brand/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      {
        as: "font",
        crossOrigin: "anonymous",
        href: hindBengaliWoff2,
        rel: "preload",
        type: "font/woff2"
      },
      {
        as: "font",
        crossOrigin: "anonymous",
        href: hindLatinWoff2,
        rel: "preload",
        type: "font/woff2"
      },
      { rel: "stylesheet", href: appCss },
      // KaTeX ships its own faces. Linked rather than imported so the maths on a
      // server-rendered question is styled in the first paint, not after it.
      { rel: "stylesheet", href: katexCss }
    ],
    // Runs before anything paints, and only does work on a first visit: it
    // turns the operating system's preference into `<html data-theme>` so the
    // page never renders in one theme and then corrects itself.
    scripts: [{ children: themeBootstrapScript }]
  }),
  errorComponent: RouteErrorView,
  component: RootComponent
});

function RootComponent(): JSX.Element {
  // useState, not module scope: on the server this component runs once per
  // request, and a shared client would hand one user's cache to the next.
  const [queryClient] = useState(createQueryClient);
  const { locale, theme } = Route.useRouteContext();

  // Browser only, by construction: effects do not run during SSR, and the
  // per-request client there must never be reachable from module scope.
  useEffect(() => {
    setActiveQueryClient(queryClient);

    return () => {
      setActiveQueryClient(null);
    };
  }, [queryClient]);

  return (
    <LocaleProvider initialLocale={locale}>
      <ThemeProvider initialTheme={theme}>
        <RootDocument theme={theme}>
          <QueryClientProvider client={queryClient}>
            <Outlet />
          </QueryClientProvider>
          <Toaster
            closeButton
            richColors
            position="top-right"
            toastOptions={{
              classNames: {
                toast: "!border !border-hairline !bg-popover !text-ink",
                description: "!text-ink/66",
                title: "!font-semibold"
              }
            }}
          />
        </RootDocument>
      </ThemeProvider>
    </LocaleProvider>
  );
}

/**
 * `data-theme` is omitted rather than guessed when the reader has never
 * chosen: React leaves an attribute it did not render alone during hydration,
 * so the value the bootstrap script wrote from the operating system survives.
 */
function RootDocument({
  children,
  theme
}: PropsWithChildren<{ theme: Theme | null }>): JSX.Element {
  const { locale } = useLocale();

  return (
    <html data-theme={theme ?? undefined} lang={localeTags[locale]}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
