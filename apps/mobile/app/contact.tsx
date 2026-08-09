import { Stack } from "expo-router";
import * as Linking from "expo-linking";
import type { JSX } from "react";
import { ScrollView, StyleSheet } from "react-native";

import { Body, Button, Card, Heading, Screen, Title } from "@/src/components/ui";
import { useT } from "@/src/lib/locale";
import { siteContact } from "@/src/lib/site";
import { spacing } from "@/src/theme/tokens";

export default function ContactScreen(): JSX.Element {
  const t = useT();

  return (
    <Screen>
      <Stack.Screen options={{ title: t("contact.title") }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Heading>{t("contact.title")}</Heading>
        <Card style={styles.card}>
          <Title>{t("contact.address")}</Title>
          <Body muted>{siteContact.address}</Body>
          <Button
            label={siteContact.helpline}
            onPress={() => void Linking.openURL(`tel:${siteContact.helpline}`)}
            variant="outline"
          />
          <Button
            label={siteContact.email}
            onPress={() => void Linking.openURL(`mailto:${siteContact.email}`)}
            variant="outline"
          />
        </Card>
        <Card>
          <Body muted>{t("contact.lead")}</Body>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  content: { gap: spacing.lg, padding: spacing.lg }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
