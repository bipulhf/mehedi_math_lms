/// <reference types="vite/client" />
import type { JSX, PropsWithChildren } from "react";
import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { Toaster } from "sonner";

import interLatinWoff2 from "@fontsource/inter/files/inter-latin-400-normal.woff2?url";
import manropeLatinWoff2 from "@fontsource/manrope/files/manrope-latin-600-normal.woff2?url";

import { RouteErrorView } from "@/components/common/route-error";
import { siteConfig } from "@/lib/site";
import appCss from "@/styles/app.css?url";

export const Route = createRootRoute({
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
        content: "#faf8ff"
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
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      {
        as: "font",
        crossOrigin: "anonymous",
        href: interLatinWoff2,
        rel: "preload",
        type: "font/woff2"
      },
      {
        as: "font",
        crossOrigin: "anonymous",
        href: manropeLatinWoff2,
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
  return (
    <RootDocument>
      <Outlet />
      <Toaster
        closeButton
        richColors
        position="top-right"
        toastOptions={{
          classNames: {
            toast: "!bg-surface-container-lowest !text-on-surface !shadow-[0_16px_38px_-20px_rgba(19,27,46,0.22)]",
            description: "!text-on-surface/66",
            title: "!font-semibold"
          }
        }}
      />
    </RootDocument>
  );
}

function RootDocument({ children }: PropsWithChildren): JSX.Element {
  return (
    <html lang="en">
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
