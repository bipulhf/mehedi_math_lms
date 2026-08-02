import { Link, Stack } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, View } from "react-native";

import { Body, Button, Heading, Screen } from "@/src/components/ui";
import { spacing } from "@/src/theme/tokens";

export default function NotFoundScreen(): JSX.Element {
  return (
    <Screen style={styles.screen}>
      <Stack.Screen options={{ title: "Not found" }} />
      <Heading>This screen does not exist</Heading>
      <View style={{ height: spacing.sm }} />
      <Body muted>The link may be out of date, or the course may have been withdrawn.</Body>
      <View style={{ height: spacing.xl }} />
      <Link asChild href="/">
        <Button label="Back to the catalog" onPress={() => undefined} />
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { alignItems: "center", justifyContent: "center", padding: spacing.xl }
});
