import { Image } from "expo-image";
import { Stack } from "expo-router";
import type { JSX } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { Body, Card, Heading, Screen, Title } from "@/src/components/ui";
import { useT } from "@/src/lib/locale";
import { spacing } from "@/src/theme/tokens";

// eslint-disable-next-line @typescript-eslint/no-require-imports -- Expo bundled image asset
const founderPhoto = require("@/assets/images/mehedi-bhai.jpeg") as number;

export default function AboutScreen(): JSX.Element {
  const t = useT();

  return (
    <Screen>
      <Stack.Screen options={{ title: t("about.title") }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Heading>{t("about.title")}</Heading>
        <Body muted>{t("about.lead")}</Body>
        <Card>
          <Body>{t("about.body1")}</Body>
          <View style={{ height: spacing.md }} />
          <Body muted>{t("about.body2")}</Body>
        </Card>
        <Card style={styles.founderCard}>
          <Image
            accessibilityLabel={t("about.founderAlt")}
            contentFit="cover"
            source={founderPhoto}
            style={styles.founderPhoto}
          />
          <View style={styles.founderText}>
            <Title>{t("about.founderName")}</Title>
            <Body muted>{t("about.founderBody")}</Body>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, padding: spacing.lg },
  founderCard: { alignItems: "center", flexDirection: "row", gap: spacing.lg },
  founderPhoto: { borderRadius: 14, height: 96, width: 96 },
  founderText: { flex: 1, gap: spacing.sm }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
