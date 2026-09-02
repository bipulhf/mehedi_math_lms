import { useRouter } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, View } from "react-native";

import { Button, EmptyState } from "@/src/components/ui";
import { useT } from "@/src/lib/locale";
import { spacing } from "@/src/theme/tokens";

/**
 * The signed-out state for private tabs. It remains in the selected tab until
 * the visitor chooses where to go, rather than navigating during tab mount.
 */
export function SignInPrompt({ showExplore = false }: { showExplore?: boolean }): JSX.Element {
  const router = useRouter();
  const t = useT();

  return (
    <EmptyState
      action={
        <View style={styles.actions}>
          <Button label={t("auth.signIn")} onPress={() => router.push("/sign-in")} />
          {showExplore ? (
            <Button label={t("nav.explore")} onPress={() => router.push("/explore")} variant="outline" />
          ) : null}
        </View>
      }
      message={t("auth.signInToContinueLead")}
      title={t("auth.signInToContinue")}
    />
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm, width: "100%" }
});
