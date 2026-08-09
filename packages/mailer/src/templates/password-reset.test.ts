import { describe, expect, test } from "bun:test";

import { renderPasswordResetEmail } from "./password-reset";

describe("renderPasswordResetEmail", () => {
  test("writes the link into both halves of the mail", () => {
    const url = "https://mehedismathacademy.com/api/auth/reset-password/abc123?callbackURL=%2Fauth%2Freset";
    const { html, text } = renderPasswordResetEmail({
      expiryMinutes: 60,
      name: "Mehedi",
      resetUrl: url
    });

    // The href and the pasteable copy, plus the plain-text part a client that
    // refuses HTML falls back to.
    expect(html).toContain(`href="${url}"`);
    expect(text).toContain(url);
  });

  test("defaults to Bangla and follows the locale when given one", () => {
    const input = { expiryMinutes: 60, name: "Mehedi", resetUrl: "https://example.test/r" };

    expect(renderPasswordResetEmail(input).subject).toContain("জেনেক্স");
    expect(renderPasswordResetEmail({ ...input, locale: "en" }).subject).toContain("Mehedi's Math Academy");
  });

  test("states the expiry in western digits, whatever the language", () => {
    // Every numeral in this product is western — the same rule the formatters
    // in @mma/i18n enforce. A Bangla mail saying "৬০ মিনিট" would break it.
    const { html, text } = renderPasswordResetEmail({
      expiryMinutes: 60,
      name: "Mehedi",
      resetUrl: "https://example.test/r"
    });

    expect(html).toContain("60");
    expect(text).toContain("60");
  });

  test("escapes a name that contains markup", () => {
    const { html } = renderPasswordResetEmail({
      expiryMinutes: 60,
      name: "<script>alert(1)</script>",
      resetUrl: "https://example.test/r"
    });

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  test("falls back to a greeting when the account has no name", () => {
    const { text } = renderPasswordResetEmail({
      expiryMinutes: 60,
      locale: "en",
      name: "   ",
      resetUrl: "https://example.test/r"
    });

    expect(text).toContain("Hello there,");
  });
});
