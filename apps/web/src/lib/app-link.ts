/**
 * The one place that decides what counts as "the mobile app" when the web app
 * is asked to redirect a browser out of itself.
 *
 * Two server routes hand control back to the Expo app — the Google sign-in
 * handoff and the payment return — and both take the target from a query
 * string. Without this list either would be an open redirect: an attacker
 * could send `?redirect=https://evil.test` and have our origin bounce a
 * signed-in user, one-time token and all, to their page.
 */
const ALLOWED_REDIRECT_SCHEMES = ["mma:", "exp:", "exps:"] as const;

export function isAllowedAppRedirect(target: string): boolean {
  try {
    const url = new URL(target);

    return ALLOWED_REDIRECT_SCHEMES.some((scheme) => url.protocol === scheme);
  } catch {
    return false;
  }
}

export function withAppLinkParam(target: string, key: string, value: string): string {
  const url = new URL(target);

  url.searchParams.set(key, value);

  return url.toString();
}
