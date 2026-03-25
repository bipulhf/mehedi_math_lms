import { clientEnv } from "@/lib/env";

export function buildApiWebSocketUrl(pathSuffix: string): string {
  const base = clientEnv.apiBaseUrl.replace(/\/$/, "");

  if (base.startsWith("http://") || base.startsWith("https://")) {
    return `${base.replace(/^http/, "ws")}/${pathSuffix}`;
  }

  const protocol =
    typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = typeof window !== "undefined" ? window.location.host : "localhost:3001";

  return `${protocol}//${host}${base}/${pathSuffix}`;
}
