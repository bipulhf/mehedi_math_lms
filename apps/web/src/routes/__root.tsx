/// <reference types="vite/client" />
import type { JSX, PropsWithChildren } from "react";
import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { localeTags } from "@genex/i18n";

// Bengali first: it is the default locale, so it is the subset the first
// paint needs. Latin covers the English locale and the Archivo labels.
import hindBengaliWoff2 from "@fontsource/hind-siliguri/files/hind-siliguri-bengali-400-normal.woff2?url";
import hindLatinWoff2 from "@fontsource/hind-siliguri/files/hind-siliguri-latin-400-normal.woff2?url";

import { RouteErrorView } from "@/components/common/route-error";
import { LocaleProvider, useLocale } from "@/lib/i18n/locale-context";
import { readLocale } from "@/lib/i18n/locale-cookie";
import { createQueryClient } from "@/lib/query/query-client";
import { siteConfig } from "@/lib/site";
import appCss from "@/styles/app.css?url";

export const Route = createRootRoute({
  // Reading the cookie here rather than in an effect is what stops the page
  // rendering in one language and then flipping to the other after hydration.
  beforeLoad: () => ({ locale: readLocale() }),
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
        content: "#fcfbf9"
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
      // The traced PNG mark, until the client supplies the original vector.
      { rel: "icon", href: "/brand/genex-mark.png", type: "image/png" },
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
      { rel: "stylesheet", href: appCss }
    ]
  }),
  errorComponent: RouteErrorView,
  component: RootComponent
});

function RootComponent(): JSX.Element {
  // useState, not module scope: on the server this component runs once per
  // request, and a shared client would hand one user's cache to the next.
  const [queryClient] = useState(createQueryClient);
  const { locale } = Route.useRouteContext();

  return (
    <LocaleProvider initialLocale={locale}>
      <RootDocument>
        <QueryClientProvider client={queryClient}>
          <Outlet />
        </QueryClientProvider>
        <Toaster
          closeButton
          richColors
          position="top-right"
          toastOptions={{
            classNames: {
              toast:
                "!bg-card !text-ink !shadow-[0_16px_38px_-20px_rgba(19,27,46,0.22)]",
              description: "!text-ink/66",
              title: "!font-semibold"
            }
          }}
        />
      </RootDocument>
    </LocaleProvider>
  );
}

function RootDocument({ children }: PropsWithChildren): JSX.Element {
  const { locale } = useLocale();

  return (
    <html lang={localeTags[locale]}>
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
