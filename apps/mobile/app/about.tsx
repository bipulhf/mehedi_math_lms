import { Image } from "expo-image";
import { Stack } from "expo-router";
import type { JSX } from "react";
import { ScrollView, Text, View } from "react-native";

import { Body, Card, Heading, Screen } from "@/src/components/ui";
import { useT } from "@/src/lib/locale";
import { fonts, radius, spacing } from "@/src/theme/tokens";
import { makeStyles } from "@/src/theme/theme";

// eslint-disable-next-line @typescript-eslint/no-require-imports -- Expo bundled image asset
const founderPhoto = require("@/assets/images/mehedi-bhai.jpeg") as number;

/**
 * Who the academy is. The founder leads, because that is what the name on the
 * app is — the portrait sits full-width above the words rather than as a
 * thumbnail beside them.
 */
export default function AboutScreen(): JSX.Element {
  const styles = useStyles();
  const t = useT();

  return (
    <Screen>
      <Stack.Screen options={{ title: t("about.title") }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Heading>{t("about.title")}</Heading>
        <Body muted>{t("about.lead")}</Body>

        <Card flush>
          <Image
            accessibilityLabel={t("about.founderAlt")}
            contentFit="cover"
            source={founderPhoto}
            style={styles.founderPhoto}
          />
          <View style={styles.founderText}>
            <Text style={styles.founderName}>{t("about.founderName")}</Text>
            <Body muted>{t("about.founderBody")}</Body>
          </View>
        </Card>

        <Card>
          <Body>{t("about.body1")}</Body>
          <View style={{ height: spacing.md }} />
          <Body muted>{t("about.body2")}</Body>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xxxl },
  founderName: { color: colors.ink, fontFamily: fonts.display, fontSize: 21, lineHeight: 28 },
  founderPhoto: { borderRadius: radius.square, height: 220, width: "100%" },
  founderText: { gap: spacing.xs, padding: spacing.lg }
}));

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
