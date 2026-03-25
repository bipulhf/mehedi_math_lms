import { createFileRoute } from "@tanstack/react-router";

import { auth } from "../../../lib/auth-server";

export const Route = createFileRoute("/api/auth/$" as never)({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => auth.handler(request),
      POST: async ({ request }: { request: Request }) => auth.handler(request)
    }
  }
} as never);
