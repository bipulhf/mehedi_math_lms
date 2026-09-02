import { useQuery } from "@tanstack/react-query";
import { Tabs } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  CatalogIcon,
  LearningIcon,
  MessagesIcon,
  ProfileIcon
} from "@/src/components/tab-icons";
import { listConversations } from "@/src/lib/api/messages";
import { getNotificationUnreadCount } from "@/src/lib/api/notifications";
import { useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { useSession } from "@/src/lib/use-session";
import { colors, fonts, radius } from "@/src/theme/tokens";

/** Native views avoid Fabric re-parenting failures in the tab bar. */

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
        headerShown: false,
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
  badgeText: { color: colors.card, fontFamily: fonts.displayBold, fontSize: 10 }
});
