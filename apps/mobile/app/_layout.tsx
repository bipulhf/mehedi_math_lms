// Imported per weight, not from the package root: the root index re-exports
// every weight and italic, and Metro bundles each one it can see — about 10MB
// of TTF for the six files this app registers.
import { Archivo_500Medium } from "@expo-google-fonts/archivo/500Medium";
import { HindSiliguri_400Regular } from "@expo-google-fonts/hind-siliguri/400Regular";
import { HindSiliguri_500Medium } from "@expo-google-fonts/hind-siliguri/500Medium";
import { HindSiliguri_600SemiBold } from "@expo-google-fonts/hind-siliguri/600SemiBold";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Host } from "@expo/ui";

import { LocaleProvider, useT } from "@/src/lib/locale";
import { asyncStoragePersister, createMobileQueryClient } from "@/src/lib/query";
import { colors, fonts } from "@/src/theme/tokens";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)"
};

// Held until the type scale is real. React Native substitutes the system font
// for an unresolved family without warning, so a first frame drawn before the
// fonts land is a frame in the wrong typeface.
void SplashScreen.preventAutoHideAsync();

/**
 * The `Stack` and its screen titles, split out from `RootLayout` because
 * `useT` needs a descendant of `LocaleProvider` — the provider itself renders
 * one level up, so this cannot be inlined into the component that mounts it.
 */
function AppStack(): JSX.Element {
  const t = useT();

  return (
    <>
      <StatusBar animated style="light" />
      <Stack
        screenOptions={{
          animation: "slide_from_right",
          contentStyle: { backgroundColor: colors.background },
          headerBlurEffect: "dark",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "transparent" },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontFamily: fonts.displayBold, fontSize: 17 },
          headerLargeTitle: false,
          headerTransparent: false
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ title: t("auth.signIn") }} />
        <Stack.Screen name="sign-up" options={{ title: t("auth.signUp") }} />
        <Stack.Screen name="courses/[courseId]" options={{ title: t("mine.colCourse") }} />
        <Stack.Screen name="learn/[courseId]" options={{ title: t("player.playerTitle") }} />
        <Stack.Screen name="tests/[testId]" options={{ title: t("player.assessment") }} />
        <Stack.Screen
          name="messages/[conversationId]"
          options={{ title: t("msg.conversationTitle") }}
        />
        <Stack.Screen name="messages/new" options={{ title: t("messages.newTitle") }} />
        <Stack.Screen name="payments" options={{ title: t("profile.paymentTitle") }} />
        <Stack.Screen name="change-password" options={{ title: t("password.title") }} />
        <Stack.Screen name="profile-complete" options={{ title: t("profc.title") }} />
        <Stack.Screen name="bug-report" options={{ title: t("bug.title") }} />
        {/* Deep-link landing pads. Android delivers `mma://…` through Linking
          as well as resolving the browser session, and Expo Router would
          otherwise route that to +not-found. */}
        <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
        <Stack.Screen name="payment-callback" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout(): JSX.Element | null {
  // Created in state, not at module scope: a fast refresh would otherwise keep
  // a client whose cache no longer matches the code that filled it.
  const [queryClient] = useState(createMobileQueryClient);
  // Three Hind Siliguri weights plus one Archivo. Several `fonts` entries map
  // to the same family on purpose — the design sets everything in words in one
  // family, and Archivo is only for Latin numerals and small all-caps labels.
  const [fontsLoaded, fontError] = useFonts({
    [fonts.bodyMedium]: HindSiliguri_400Regular,
    [fonts.bodySemiBold]: HindSiliguri_500Medium,
    [fonts.displayExtraBold]: HindSiliguri_600SemiBold,
    [fonts.monoLabel]: Archivo_500Medium
  });
  const isReady = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (isReady) {
      void SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Host style={{ flex: 1 }}>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ maxAge: 24 * 60 * 60 * 1000, persister: asyncStoragePersister }}
        >
          <LocaleProvider>
            <AppStack />
          </LocaleProvider>
        </PersistQueryClientProvider>
      </Host>
    </SafeAreaProvider>
  );
}
