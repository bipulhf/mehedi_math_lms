import { useRouter } from "expo-router";
import type { JSX } from "react";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Button, ErrorNotice } from "@/src/components/ui";
import { useGoogleSignIn } from "@/src/lib/use-session";
import { useT } from "@/src/lib/locale";
import { spacing } from "@/src/theme/tokens";

/**
 * Shared by sign-in and sign-up: a Google account is the same account either
 * way, so the two screens must not drift into offering different ones. What
 * does differ is whether the press may create one -- only the sign-up screen
 * passes `allowSignUp`, and everywhere else an unknown Google address is
 * answered with a message.
 */
export function GoogleSignInButton({
  allowSignUp = false
}: {
  allowSignUp?: boolean;
} = {}): JSX.Element {
  const router = useRouter();
  const t = useT();
  const googleSignIn = useGoogleSignIn();
  const [error, setError] = useState<string | null>(null);

  const handlePress = (): void => {
    setError(null);
    googleSignIn.mutate(
      { allowSignUp },
      {
        onError: (mutationError) => {
          setError(mutationError.message);
        },
        onSuccess: (outcome) => {
          if (outcome === "signed-in") {
            router.replace("/");

            return;
          }

          if (outcome === "account-not-found") {
            setError(t("auth.googleNoAccount"));
          }
        }
      }
    );
  };

  return (
    <View style={styles.container}>
      <Button
        isBusy={googleSignIn.isPending}
        label={t("auth.google")}
        onPress={handlePress}
        variant="outline"
      />
      {error ? <ErrorNotice message={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md }
});
