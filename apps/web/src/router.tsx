import { createRouter } from "@tanstack/react-router";

import { RouteNotFoundView } from "./components/common/route-not-found";
import { routeTree } from "./routeTree.gen";

export function getRouter(): ReturnType<typeof createRouter> {
  return createRouter({
    routeTree,
    defaultPreload: "intent",
    defaultPendingMs: 150,
    // Without this the router renders a bare "<p>Not Found</p>".
    defaultNotFoundComponent: RouteNotFoundView,
    scrollRestoration: true
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
