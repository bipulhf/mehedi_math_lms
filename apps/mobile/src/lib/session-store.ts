import * as SecureStore from "expo-secure-store";

/**
 * Better Auth authenticates with a cookie. React Native has no cookie jar, so
 * the app keeps the `Set-Cookie` value itself and replays it as a `Cookie`
 * header. It goes in SecureStore rather than AsyncStorage because it is a
 * bearer credential: anything holding this string is the signed-in user.
 */
const SESSION_COOKIE_KEY = "mma.session-cookie";

let cachedCookie: string | null | undefined;

export async function readSessionCookie(): Promise<string | null> {
  if (cachedCookie !== undefined) {
    return cachedCookie;
  }

  cachedCookie = await SecureStore.getItemAsync(SESSION_COOKIE_KEY);

  return cachedCookie;
}

export async function writeSessionCookie(cookie: string): Promise<void> {
  cachedCookie = cookie;
  await SecureStore.setItemAsync(SESSION_COOKIE_KEY, cookie);
}

export async function clearSessionCookie(): Promise<void> {
  cachedCookie = null;
  await SecureStore.deleteItemAsync(SESSION_COOKIE_KEY);
}

/**
 * A `Set-Cookie` header can carry attributes and, on some runtimes, several
 * cookies joined by commas. Only the `name=value` pairs are replayed.
 */
export function extractCookiePairs(setCookieHeader: string | null): string | null {
  if (!setCookieHeader) {
    return null;
  }

  const pairs = setCookieHeader
    .split(/,(?=[^;]+?=)/)
    .map((cookie) => cookie.split(";")[0]?.trim())
    .filter((pair): pair is string => Boolean(pair && pair.includes("=")));

  return pairs.length > 0 ? pairs.join("; ") : null;
}
