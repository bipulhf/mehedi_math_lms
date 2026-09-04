import { Link, Stack } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, View } from "react-native";

import { Body, Button, Heading, Screen } from "@/src/components/ui";
import { IconTile } from "@/src/components/ui-display";
import { useT } from "@/src/lib/locale";
import { spacing } from "@/src/theme/tokens";

export default function NotFoundScreen(): JSX.Element {
  const t = useT();

  return (
    <Screen style={styles.screen}>
      <Stack.Screen options={{ title: t("notfound.title") }} />
      <IconTile icon="compass" size={64} tint="brand" />
      <View style={{ height: spacing.lg }} />
      <Heading>{t("notfound.title")}</Heading>
      <View style={{ height: spacing.sm }} />
      <Body muted>{t("notfound.lead")}</Body>
      <View style={{ height: spacing.xl }} />
      <Link asChild href="/">
        <Button icon="home" label={t("notfound.home")} onPress={() => undefined} />
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { alignItems: "center", justifyContent: "center", padding: spacing.xl }
});
