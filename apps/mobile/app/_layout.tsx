// Imported per weight, not from the package root: the root index re-exports
// every weight and italic, and Metro bundles each one it can see — about 10MB
// of TTF for the six files this app registers.
import { AnekBangla_400Regular } from "@expo-google-fonts/anek-bangla/400Regular";
import { AnekBangla_500Medium } from "@expo-google-fonts/anek-bangla/500Medium";
import { AnekBangla_600SemiBold } from "@expo-google-fonts/anek-bangla/600SemiBold";
import { BalooDa2_600SemiBold } from "@expo-google-fonts/baloo-da-2/600SemiBold";
import { BalooDa2_700Bold } from "@expo-google-fonts/baloo-da-2/700Bold";
import { BalooDa2_800ExtraBold } from "@expo-google-fonts/baloo-da-2/800ExtraBold";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import type { JSX } from "react";
import { useCallback, useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Host } from "@expo/ui";

import { BootSplash } from "@/src/components/boot-splash";
import { LocaleProvider, useT } from "@/src/lib/locale";
import { asyncStoragePersister, createMobileQueryClient } from "@/src/lib/query";
import { fonts } from "@/src/theme/tokens";
import { ThemeProvider, useTheme } from "@/src/theme/theme";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)"
};

// Held until this file has a frame of its own to hand over to. React Native
// substitutes the system font for an unresolved family without warning, so the
// frame that replaces it is `BootSplash` -- the mark and the name, both as
// bundled images -- and not a screen that would draw words in the wrong
// typeface.
void SplashScreen.preventAutoHideAsync();

/**
 * The `Stack` and its screen titles, split out from `RootLayout` because
 * `useT` needs a descendant of `LocaleProvider` — the provider itself renders
 * one level up, so this cannot be inlined into the component that mounts it.
 */
function AppStack(): JSX.Element {
  const { colors } = useTheme();
  const t = useT();

  return (
    <>
      {/* The bar's own glyphs: dark content, because the app is light. */}
      <StatusBar animated style="dark" />
      <Stack
        screenOptions={{
          animation: "slide_from_right",
          contentStyle: { backgroundColor: colors.background },
          headerBackButtonDisplayMode: "minimal",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          // The chevron is the violet: on a page this pale it is the only
          // thing on the bar a thumb is meant to find.
          headerTintColor: colors.accent,
          headerTitleStyle: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 17 },
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
        <Stack.Screen name="notifications" options={{ title: t("nav.notify") }} />
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

export default function RootLayout(): JSX.Element {
  // Created in state, not at module scope: a fast refresh would otherwise keep
  // a client whose cache no longer matches the code that filled it.
  const [queryClient] = useState(createMobileQueryClient);
  // Six files: three weights of each family. Both draw Bangla and Latin, so a
  // heading in either script is set in the face it was designed for — and
  // `fonts.monoLabel` / `fonts.numeric` map onto weights already listed here.
  const [fontsLoaded, fontError] = useFonts({
    [fonts.body]: AnekBangla_400Regular,
    [fonts.bodyMedium]: AnekBangla_500Medium,
    [fonts.bodySemiBold]: AnekBangla_600SemiBold,
    [fonts.display]: BalooDa2_800ExtraBold,
    [fonts.displayBold]: BalooDa2_700Bold,
    [fonts.displaySemiBold]: BalooDa2_600SemiBold
  });
  const isReady = fontsLoaded || fontError !== null;

  // Handing over on layout rather than on mount: hiding the native splash
  // before this view has been drawn shows the window behind it for a frame.
  const handleBootLayout = useCallback(() => {
    void SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (isReady) {
      void SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return (
      <ThemeProvider>
        <BootSplash onLayout={handleBootLayout} />
      </ThemeProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <Host style={{ flex: 1 }}>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ maxAge: 24 * 60 * 60 * 1000, persister: asyncStoragePersister }}
        >
          <ThemeProvider>
            <LocaleProvider>
              <AppStack />
            </LocaleProvider>
          </ThemeProvider>
        </PersistQueryClientProvider>
      </Host>
    </SafeAreaProvider>
  );
}
