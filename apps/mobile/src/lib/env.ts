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

function resolveApiOrigin(): string {
  const configured = process.env.EXPO_PUBLIC_API_ORIGIN;

  if (configured && configured.length > 0) {
    return configured.replace(/\/$/, "");
  }

  const devHost = inferDevHost();

  if (devHost) {
    return `http://${devHost}:3001`;
  }

  // The Android emulator reaches the host machine on 10.0.2.2, never 127.0.0.1.
  return Platform.OS === "android" ? "http://10.0.2.2:3001" : "http://127.0.0.1:3001";
}

/**
 * Better Auth's HTTP handler is served by the **web** app, not the API. Getting
 * this wrong produces a 404 on sign-in that looks like bad credentials.
 */
function resolveAuthOrigin(): string {
  const configured = process.env.EXPO_PUBLIC_WEB_ORIGIN;

  if (configured && configured.length > 0) {
    return configured.replace(/\/$/, "");
  }

  const devHost = inferDevHost();

  if (devHost) {
    return `http://${devHost}:3000`;
  }

  return Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://127.0.0.1:3000";
}

export const mobileEnv = {
  apiBaseUrl: `${resolveApiOrigin()}/api/v1`,
  apiOrigin: resolveApiOrigin(),
  authBaseUrl: `${resolveAuthOrigin()}/api/auth`,
  webOrigin: resolveAuthOrigin()
} as const;
