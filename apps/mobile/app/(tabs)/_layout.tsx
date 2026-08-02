import { useQuery } from "@tanstack/react-query";
import { Tabs } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import { getNotificationUnreadCount, listConversations } from "@/src/lib/api";
import { queryKeys } from "@/src/lib/query";
import { useSession } from "@/src/lib/use-session";
import { colors, radius, typography } from "@/src/theme/tokens";

/**
 * Text glyphs rather than an icon pack: the tab bar is the only place the app
 * needs icons, and pulling in a font for five of them is not worth the bundle.
 */
const tabGlyphs = {
  catalog: "◎",
  learning: "▤",
  messages: "✉",
  notifications: "◉",
  profile: "☺"
} as const;

function TabIcon({ focused, glyph }: { focused: boolean; glyph: string }): JSX.Element {
  return <Text style={[styles.glyph, focused ? styles.glyphFocused : null]}>{glyph}</Text>;
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

  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { fontWeight: "700" },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: colors.surfaceContainerLowest,
          borderTopColor: colors.outlineVariant
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} glyph={tabGlyphs.catalog} />,
          title: "Catalog"
        }}
      />
      <Tabs.Screen
        name="learning"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} glyph={tabGlyphs.learning} />,
          title: "My courses"
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          tabBarIcon: ({ focused }) => (
            <View>
              <TabIcon focused={focused} glyph={tabGlyphs.messages} />
              <Badge count={unreadMessages} />
            </View>
          ),
          title: "Messages"
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarIcon: ({ focused }) => (
            <View>
              <TabIcon focused={focused} glyph={tabGlyphs.notifications} />
              <Badge count={unreadNotifications} />
            </View>
          ),
          title: "Notifications"
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} glyph={tabGlyphs.profile} />,
          title: "Profile"
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    backgroundColor: colors.error,
    borderRadius: radius.full,
    minWidth: 18,
    paddingHorizontal: 4,
    position: "absolute",
    right: -12,
    top: -4
  },
  badgeText: { color: colors.onError, fontSize: 10, fontWeight: "700" },
  glyph: { color: colors.onSurfaceVariant, fontSize: typography.title.fontSize },
  glyphFocused: { color: colors.primary }
});
