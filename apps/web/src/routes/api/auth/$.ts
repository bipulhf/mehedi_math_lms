import { createFileRoute } from "@tanstack/react-router";

async function authHandler(request: Request): Promise<Response> {
  const { auth } = await import("../../../lib/auth-server");
  return auth.handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => authHandler(request),
      POST: async ({ request }: { request: Request }) => authHandler(request)
    }
  }
});
