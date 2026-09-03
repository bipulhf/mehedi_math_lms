import { useRouter } from "expo-router";
import type { JSX } from "react";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";

import { ErrorNotice } from "@/src/components/ui";
import { useGoogleSignIn } from "@/src/lib/use-session";
import { useT } from "@/src/lib/locale";
import { fonts, radius, spacing } from "@/src/theme/tokens";
import { makeStyles, useThemeColors } from "@/src/theme/theme";

/**
 * Shared by sign-in and sign-up: a Google account is the same account either
 * way, so the two screens must not drift into offering different ones. What
 * does differ is whether the press may create one — only the sign-up screen
 * passes `allowSignUp`, and everywhere else an unknown Google address is
 * answered with a message.
 *
 * Not the generic `Button`: this one carries a provider's mark, and every
 * platform's sign-in guidelines put that mark beside the words rather than
 * leaving the button to look like any other outline button on the screen.
 */
export function GoogleSignInButton({
  allowSignUp = false
}: {
  allowSignUp?: boolean;
} = {}): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
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
      <Pressable
        accessibilityLabel={t("auth.google")}
        accessibilityRole="button"
        accessibilityState={{ busy: googleSignIn.isPending }}
        disabled={googleSignIn.isPending}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.button,
          pressed ? styles.buttonPressed : null,
          googleSignIn.isPending ? styles.buttonBusy : null
        ]}
      >
        <Ionicons color={colors.ink} name="logo-google" size={18} />
        <Text style={styles.label}>
          {googleSignIn.isPending ? `${t("auth.google")}…` : t("auth.google")}
        </Text>
      </Pressable>
      {error ? <ErrorNotice message={error} /> : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  button: {
    alignItems: "center",
    backgroundColor: colors.panelWarm,
    borderColor: colors.hairline,
    borderRadius: radius.sm + 2,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.lg
  },
  buttonBusy: { opacity: 0.6 },
  buttonPressed: { backgroundColor: colors.chipActive, transform: [{ scale: 0.99 }] },
  container: { gap: spacing.md },
  label: { color: colors.ink, fontFamily: fonts.displaySemiBold, fontSize: 16 }
}));
