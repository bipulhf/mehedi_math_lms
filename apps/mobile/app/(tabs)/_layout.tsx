import { useQuery } from "@tanstack/react-query";
import { Tabs } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";

import { listConversations } from "@/src/lib/api/messages";
import { getNotificationUnreadCount } from "@/src/lib/api/notifications";
import { useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { useSession } from "@/src/lib/use-session";
import { colors, fonts, radius } from "@/src/theme/tokens";

function TabIcon({
  focused,
  name
}: {
  focused: boolean;
  name: keyof typeof Ionicons.glyphMap;
}): JSX.Element {
  return (
    <Ionicons color={focused ? colors.accent : colors.muted} name={name} size={24} />
  );
}

/** Native views avoid Fabric re-parenting failures in the tab bar. */

function Badge({ count }: { count: number }): JSX.Element | null {
  if (count <= 0) {
    return null;
  }

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? "99+" : String(count)}</Text>
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
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.displaySemiBold, fontSize: 11, marginTop: 2 },
        tabBarStyle: {
          backgroundColor: "rgba(23, 32, 51, 0.96)",
          borderTopColor: colors.hairlineFaint,
          borderTopWidth: 0.5,
          height: 83,
          paddingBottom: 20,
          paddingTop: 6
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="book" />,
          title: t("nav.home")
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="grid" />,
          title: t("nav.explore")
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          tabBarIcon: ({ focused }) => (
            <View>
              <TabIcon focused={focused} name="chatbubbles" />
              <Badge count={unreadInbox} />
            </View>
          ),
          title: t("nav.inbox")
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="person-circle" />,
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
    right: -10,
    top: -6
  },
  badgeText: { color: colors.onAccent, fontFamily: fonts.displayBold, fontSize: 10 }
});
