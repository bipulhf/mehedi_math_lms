import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { JSX } from "react";
import { useState } from "react";

import { asyncStoragePersister, createMobileQueryClient } from "@/src/lib/query";
import { colors } from "@/src/theme/tokens";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)"
};

export default function RootLayout(): JSX.Element {
  // Created in state, not at module scope: a fast refresh would otherwise keep
  // a client whose cache no longer matches the code that filled it.
  const [queryClient] = useState(createMobileQueryClient);

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
          headerTitleStyle: { fontWeight: "700" }
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
