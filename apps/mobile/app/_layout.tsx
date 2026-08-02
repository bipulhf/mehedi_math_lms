import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold
} from "@expo-google-fonts/inter";
import {
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold
} from "@expo-google-fonts/manrope";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import type { JSX } from "react";
import { useEffect, useState } from "react";

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

export default function RootLayout(): JSX.Element | null {
  // Created in state, not at module scope: a fast refresh would otherwise keep
  // a client whose cache no longer matches the code that filled it.
  const [queryClient] = useState(createMobileQueryClient);
  const [fontsLoaded, fontError] = useFonts({
    [fonts.body]: Inter_400Regular,
    [fonts.bodyMedium]: Inter_500Medium,
    [fonts.bodySemiBold]: Inter_600SemiBold,
    [fonts.displayBold]: Manrope_700Bold,
    [fonts.displayExtraBold]: Manrope_800ExtraBold,
    [fonts.displaySemiBold]: Manrope_600SemiBold
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
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ maxAge: 24 * 60 * 60 * 1000, persister: asyncStoragePersister }}
    >
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.onSurface,
          headerTitleStyle: { fontFamily: fonts.displayBold }
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ title: "Sign in" }} />
        <Stack.Screen name="sign-up" options={{ title: "Create account" }} />
        <Stack.Screen name="courses/[courseId]" options={{ title: "Course" }} />
        <Stack.Screen name="learn/[courseId]" options={{ title: "Course player" }} />
        <Stack.Screen name="tests/[testId]" options={{ title: "Test" }} />
        <Stack.Screen name="messages/[conversationId]" options={{ title: "Conversation" }} />
      </Stack>
    </PersistQueryClientProvider>
  );
}
