import { Redirect } from "expo-router";
import type { JSX } from "react";

/**
 * The landing pad for `genex://auth-callback`.
 *
 * `WebBrowser.openAuthSessionAsync` resolves with this URL and the caller reads
 * the token from it — but on Android the same deep link is also delivered
 * through `Linking`, which Expo Router listens to. Without a route here that
 * navigation lands on `+not-found`, so the sign-in appears to fail at the exact
 * moment it succeeded.
 *
 * Nothing is read here on purpose. `signInWithGoogle` already has the URL, and
 * exchanging a single-use token twice would consume the wrong one.
 */
export default function AuthCallbackScreen(): JSX.Element {
  return <Redirect href="/(tabs)" />;
}
