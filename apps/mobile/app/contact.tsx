import { Stack } from "expo-router";
import * as Linking from "expo-linking";
import type { JSX } from "react";
import { ScrollView, StyleSheet } from "react-native";

import { Body, Card, Heading, Screen } from "@/src/components/ui";
import { ListGroup, ListRow } from "@/src/components/ui-layout";
import { useT } from "@/src/lib/locale";
import { siteContact } from "@/src/lib/site";
import { spacing } from "@/src/theme/tokens";

/**
 * How to reach the academy: three rows, each of which does something when
 * pressed. Two outline buttons and a paragraph used to say the same thing while
 * hiding which parts were tappable.
 */
export default function ContactScreen(): JSX.Element {
  const t = useT();

  return (
    <Screen>
      <Stack.Screen options={{ title: t("contact.title") }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Heading>{t("contact.title")}</Heading>

        <ListGroup>
          <ListRow
            icon="call"
            onPress={() => void Linking.openURL(`tel:${siteContact.helpline}`)}
            subtitle={siteContact.helpline}
            tint="mint"
            title={t("nav.helpline")}
          />
          <ListRow
            icon="mail"
            onPress={() => void Linking.openURL(`mailto:${siteContact.email}`)}
            subtitle={siteContact.email}
            tint="brand"
            title={t("contact.title")}
          />
          <ListRow
            icon="location"
            isLast
            subtitle={siteContact.address}
            tint="gold"
            title={t("contact.address")}
          />
        </ListGroup>

        <Card>
          <Body muted>{t("contact.lead")}</Body>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xxxl }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
