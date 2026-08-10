import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Tabs } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  CatalogIcon,
  LearningIcon,
  MessagesIcon,
  ProfileIcon
} from "@/src/components/tab-icons";
import { getNotificationUnreadCount, listConversations } from "@/src/lib/api";
import { useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { useSession } from "@/src/lib/use-session";
import { colors, fonts, radius } from "@/src/theme/tokens";

/**
 * SVG line icons (react-native-svg) rather than Unicode glyphs: the previous
 * five characters rendered differently on every Android OEM font.
 */

/** The Mehedi's Math Academy mark and wordmark from the shared brand set, as in the web shell. */
function BrandLockup(): JSX.Element {
  return (
    <View style={styles.brand}>
      {/* eslint-disable-next-line @typescript-eslint/no-require-imports -- bundled asset, no import form exists */}
      <Image source={require("@/assets/images/mma-logo.png")} style={styles.brandLogo} />
    </View>
  );
}

function Badge({ count }: { count: number }): JSX.Element | null {
  if (count <= 0) {
    return null;
  }

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

export default function TabsLayout(): JSX.Element {
  const t = useT();
  const { session } = useSession();
  const canMessage = session?.session.role === "STUDENT" || session?.session.role === "TEACHER";

  const { data: conversations } = useQuery({
    enabled: canMessage,
    queryFn: listConversations,
    queryKey: queryKeys.conversations()
  });
  const { data: unreadNotifications = 0 } = useQuery({
    enabled: Boolean(session),
    queryFn: getNotificationUnreadCount,
    queryKey: queryKeys.unreadNotifications()
  });
  const unreadMessages = (conversations ?? []).reduce(
    (sum, conversation) => sum + conversation.unreadCount,
    0
  );
  // One badge for the merged Inbox tab -- a student doesn't care which half
  // of the tab has something new, only that it does.
  const unreadInbox = unreadMessages + unreadNotifications;

  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { fontFamily: fonts.displayBold },
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.hairline
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerTitle: () => <BrandLockup />,
          tabBarIcon: ({ focused }) => <LearningIcon focused={focused} />,
          title: t("nav.home")
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          tabBarIcon: ({ focused }) => <CatalogIcon focused={focused} />,
          title: t("nav.explore")
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          tabBarIcon: ({ focused }) => (
            <View>
              <MessagesIcon focused={focused} />
              <Badge count={unreadInbox} />
            </View>
          ),
          title: t("nav.inbox")
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <ProfileIcon focused={focused} />,
          title: t("nav.profile")
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    minWidth: 18,
    paddingHorizontal: 4,
    position: "absolute",
    right: -12,
    top: -4
  },
  badgeText: { color: colors.card, fontFamily: fonts.displayBold, fontSize: 10 },
  brand: { alignItems: "center" },
  brandLogo: { height: 48, width: 48 }
});
