import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import type { Locale } from "@mma/i18n";
import { defaultLocale, isLocale, localeCookieName } from "@mma/i18n";

/**
 * The locale has to be known before the first byte is rendered, or the page
 * ships in Bangla and then flips to English in front of the reader. A cookie is
 * the only client-set value the server can see on a plain document request,
 * which is why the choice lives in one rather than in localStorage.
 *
 * `createIsomorphicFn` keeps the server implementation — and the
 * `@tanstack/react-start/server` import it needs — out of the browser bundle.
 * The cookie's name is `@mma/i18n`'s, because the mailer reads it too.
 */
export { localeCookieName };

const oneYearInSeconds = 60 * 60 * 24 * 365;

function readFromDocument(): Locale {
  for (const entry of document.cookie.split(";")) {
    const [name, ...rest] = entry.trim().split("=");

    if (name === localeCookieName) {
      const value = decodeURIComponent(rest.join("="));

      return isLocale(value) ? value : defaultLocale;
    }
  }

  return defaultLocale;
}

export const readLocale = createIsomorphicFn()
  .server((): Locale => {
    const value = getCookie(localeCookieName);

    return isLocale(value) ? value : defaultLocale;
  })
  .client(readFromDocument);

/**
 * Client-only: the switcher is the only thing that writes, and it is a button.
 * `SameSite=Lax` because the cookie is read on ordinary top-level navigation
 * and never wanted cross-site.
 */
export function writeLocaleCookie(locale: Locale): void {
  document.cookie = `${localeCookieName}=${locale}; path=/; max-age=${oneYearInSeconds}; samesite=lax`;
}
