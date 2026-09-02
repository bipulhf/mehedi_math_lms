import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

/**
 * The chosen theme, for the same reason the locale lives in a cookie: the
 * server has to know it before the first byte, or the page ships light and
 * flips to dark in front of the reader.
 *
 * `null` means the reader has never chosen. That is not the same as "light" —
 * an unchosen theme follows the operating system, which only the browser can
 * answer, so the server renders no `data-theme` at all and the inline script
 * in `__root.tsx` fills it in before the first paint.
 */
export type Theme = "dark" | "light";

export const themeCookieName = "mma.theme";

const oneYearInSeconds = 60 * 60 * 24 * 365;

export function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}

function readFromDocument(): Theme | null {
  for (const entry of document.cookie.split(";")) {
    const [name, ...rest] = entry.trim().split("=");

    if (name === themeCookieName) {
      const value = decodeURIComponent(rest.join("="));

      return isTheme(value) ? value : null;
    }
  }

  return null;
}

export const readTheme = createIsomorphicFn()
  .server((): Theme | null => {
    const value = getCookie(themeCookieName);

    return isTheme(value) ? value : null;
  })
  .client(readFromDocument);

/**
 * Client-only: the toggle is the only thing that writes, and it is a button.
 * `SameSite=Lax` because the cookie is read on ordinary top-level navigation
 * and never wanted cross-site.
 */
export function writeThemeCookie(theme: Theme): void {
  document.cookie = `${themeCookieName}=${theme}; path=/; max-age=${oneYearInSeconds}; samesite=lax`;
}

/**
 * Runs in `<head>`, before anything paints, and only matters on the first
 * visit: it resolves the operating system's preference into the attribute the
 * stylesheet reads, then writes the cookie so every later request is answered
 * on the server and this script has nothing to do.
 *
 * Inlined as a string because it has to be synchronous — a module would load
 * after the first paint, which is the flash this exists to prevent.
 */
export const themeBootstrapScript = `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)${themeCookieName.replace(".", "\\.")}=(dark|light)/);var t=m?m[1]:(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=t;if(!m){document.cookie="${themeCookieName}="+t+"; path=/; max-age=${oneYearInSeconds}; samesite=lax";}}catch(e){document.documentElement.dataset.theme="light";}})();`;
