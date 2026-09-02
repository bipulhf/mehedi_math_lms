/**
 * The app is intended to work against the deployed services, including when it
 * runs in Expo Go. Local services remain an explicit opt-in through the two
 * public origin variables.
 */
const DEFAULT_API_ORIGIN = "https://api.lms.mehedismathacademy.com";
const DEFAULT_WEB_ORIGIN = "https://lms.mehedismathacademy.com";

export interface OriginSources {
  configuredApiOrigin: string | undefined;
  configuredWebOrigin: string | undefined;
}

function resolveOrigin(configured: string | undefined, fallback: string): string {
  const origin = configured?.trim();

  if (origin) {
    return origin.replace(/\/$/, "");
  }

  return fallback;
}

/**
 * Pure, and exported so the configured-local and deployed-default paths stay
 * verified without loading a native Expo module.
 *
 * Better Auth's HTTP handler is served by the **web** app, not the API. Getting
 * that wrong produces a 404 on sign-in that looks like bad credentials.
 */
export function resolveOrigins(sources: OriginSources): {
  apiOrigin: string;
  webOrigin: string;
} {
  return {
    apiOrigin: resolveOrigin(sources.configuredApiOrigin, DEFAULT_API_ORIGIN),
    webOrigin: resolveOrigin(sources.configuredWebOrigin, DEFAULT_WEB_ORIGIN)
  };
}

const origins = resolveOrigins({
  configuredApiOrigin: process.env.EXPO_PUBLIC_API_ORIGIN,
  configuredWebOrigin: process.env.EXPO_PUBLIC_WEB_ORIGIN
});

export const mobileEnv = {
  apiBaseUrl: `${origins.apiOrigin}/api/v1`,
  apiOrigin: origins.apiOrigin,
  authBaseUrl: `${origins.webOrigin}/api/auth`,
  webOrigin: origins.webOrigin
} as const;
