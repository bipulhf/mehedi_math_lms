import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Where the app talks to. On a device, `localhost` is the device itself, so the
 * dev host is taken from the Metro connection Expo already knows about. Set
 * `EXPO_PUBLIC_API_ORIGIN` to point a build at a real deployment.
 */
function inferDevHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.expoGoConfig as { debuggerHost?: string } | undefined)?.debuggerHost;

  if (!hostUri) {
    return null;
  }

  const [host] = hostUri.split(":");

  return host && host.length > 0 ? host : null;
}

const API_DEV_PORT = 3001;
const WEB_DEV_PORT = 3000;

export interface OriginSources {
  configuredApiOrigin: string | undefined;
  configuredWebOrigin: string | undefined;
  /** The host Metro is served from, or null outside a dev client. */
  devHost: string | null;
  platform: string;
}

function resolveOrigin(
  configured: string | undefined,
  devHost: string | null,
  platform: string,
  port: number
): string {
  if (configured && configured.length > 0) {
    return configured.replace(/\/$/, "");
  }

  if (devHost) {
    return `http://${devHost}:${port}`;
  }

  // The Android emulator reaches the host machine on 10.0.2.2, never 127.0.0.1.
  return platform === "android" ? `http://10.0.2.2:${port}` : `http://127.0.0.1:${port}`;
}

/**
 * Pure, and exported for that reason: the three branches below are the
 * difference between an app that works on a handset and one that works only in
 * a simulator, and neither is observable from the other.
 *
 * Better Auth's HTTP handler is served by the **web** app, not the API. Getting
 * that wrong produces a 404 on sign-in that looks like bad credentials.
 */
export function resolveOrigins(sources: OriginSources): {
  apiOrigin: string;
  webOrigin: string;
} {
  return {
    apiOrigin: resolveOrigin(
      sources.configuredApiOrigin,
      sources.devHost,
      sources.platform,
      API_DEV_PORT
    ),
    webOrigin: resolveOrigin(
      sources.configuredWebOrigin,
      sources.devHost,
      sources.platform,
      WEB_DEV_PORT
    )
  };
}

const origins = resolveOrigins({
  configuredApiOrigin: process.env.EXPO_PUBLIC_API_ORIGIN,
  configuredWebOrigin: process.env.EXPO_PUBLIC_WEB_ORIGIN,
  devHost: inferDevHost(),
  platform: Platform.OS
});

export const mobileEnv = {
  apiBaseUrl: `${origins.apiOrigin}/api/v1`,
  apiOrigin: origins.apiOrigin,
  authBaseUrl: `${origins.webOrigin}/api/auth`,
  webOrigin: origins.webOrigin
} as const;
