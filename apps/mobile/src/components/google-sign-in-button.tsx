import { useRouter } from "expo-router";
import type { JSX } from "react";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Body, Button } from "@/src/components/ui";
import { useGoogleSignIn } from "@/src/lib/use-session";
import { spacing } from "@/src/theme/tokens";

/**
 * Shared by sign-in and sign-up: a Google account is the same account either
 * way, so the two screens must not drift into offering different ones.
 */
export function GoogleSignInButton(): JSX.Element {
  const router = useRouter();
  const googleSignIn = useGoogleSignIn();
  const [error, setError] = useState<string | null>(null);

  const handlePress = (): void => {
    setError(null);
    googleSignIn.mutate(undefined, {
      onError: (mutationError) => {
        setError(mutationError.message);
      },
      onSuccess: (outcome) => {
        if (outcome === "signed-in") {
          router.replace("/");
        }
      }
    });
  };

  return (
    <View style={styles.container}>
      <Button
        isBusy={googleSignIn.isPending}
        label="Continue with Google"
        onPress={handlePress}
        variant="outline"
      />
      {error ? <Body>{error}</Body> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md }
});
