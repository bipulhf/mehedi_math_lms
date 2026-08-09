import { describe, expect, test } from "bun:test";

import { localeFromRequest } from "./send-password-reset";

/**
 * The mail's language comes from the locale cookie on the request that asked
 * for the reset. The send itself needs a relay; the choice does not, and it is
 * the half with a wrong answer rather than a missing one.
 */
function requestWith(cookie: string | null): Request {
  return new Request("https://mehedismathacademy.com/api/auth/request-password-reset", {
    headers: cookie === null ? {} : { cookie }
  });
}

describe("localeFromRequest", () => {
  test("follows the reader's choice", () => {
    expect(localeFromRequest(requestWith("mma_locale=en"))).toBe("en");
    expect(localeFromRequest(requestWith("mma_locale=bn"))).toBe("bn");
  });

  test("finds the cookie beside others", () => {
    expect(localeFromRequest(requestWith("theme=dark; mma_locale=en; ga=1"))).toBe("en");
  });

  test("falls back to Bangla with no cookie, no request, or a nonsense value", () => {
    expect(localeFromRequest(requestWith(null))).toBe("bn");
    expect(localeFromRequest(undefined)).toBe("bn");
    expect(localeFromRequest(requestWith("mma_locale=fr"))).toBe("bn");
  });
});
