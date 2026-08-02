import type { ErrorBoundaryProps } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, View } from "react-native";

import { Body, Button, Card, Heading, Screen } from "@/src/components/ui";
import { ApiError } from "@/src/lib/api-client";
import { spacing } from "@/src/theme/tokens";

/**
 * The per-screen error boundary, and the mobile counterpart of the web app's
 * `errorComponent` rule.
 *
 * `app/_layout.tsx` re-exports Expo Router's own `ErrorBoundary` at the root,
 * which catches everything — and therefore takes the whole app down for one bad
 * screen. Exporting this from a route confines the failure to that route: the
 * tab bar keeps working, and `retry` re-renders only what broke.
 *
 * Route files export it under the name Expo Router looks for:
 *
 * ```ts
 * export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
 * ```
 */
export function ScreenErrorBoundary({ error, retry }: ErrorBoundaryProps): JSX.Element {
  const isOffline = error instanceof ApiError && error.isOffline;

  return (
    <Screen style={styles.screen}>
      <Card>
        <Heading>{isOffline ? "No connection" : "This screen stopped"}</Heading>
        <View style={{ height: spacing.md }} />
        <Body muted>
          {isOffline
            ? "The app could not reach the server. Anything already downloaded is still available."
            : error.message}
        </Body>
        <View style={{ height: spacing.xl }} />
        <Button
          label="Try again"
          onPress={() => {
            void retry();
          }}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: "center", padding: spacing.lg }
});
