import { useQuery } from "@tanstack/react-query";
import { Tabs } from "expo-router";
import type { JSX } from "react";
import { Text, View } from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";

import { listConversations } from "@/src/lib/api/messages";
import { getNotificationUnreadCount } from "@/src/lib/api/notifications";
import { useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { useSession } from "@/src/lib/use-session";
import { fonts, radius } from "@/src/theme/tokens";
import { makeStyles, useThemeColors } from "@/src/theme/theme";

function TabIcon({
  focused,
  name
}: {
  focused: boolean;
  name: keyof typeof Ionicons.glyphMap;
}): JSX.Element {
  const colors = useThemeColors();
  return (
    <Ionicons color={focused ? colors.accent : colors.muted} name={name} size={24} />
  );
}

/** Native views avoid Fabric re-parenting failures in the tab bar. */

function Badge({ count }: { count: number }): JSX.Element | null {
  const styles = useStyles();
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
  const colors = useThemeColors();
  const t = useT();
  const { isPending: isSessionPending, session } = useSession();
  const canMessage = session?.session.role === "STUDENT" || session?.session.role === "TEACHER";
  // Explore is the only public tab, so a signed-out visitor gets it and a way
  // in — nothing else. `href: null` keeps the routes registered (a deep link
  // or a redirect still resolves) while taking them out of the bar. The
  // pending session counts as signed out: showing four tabs for a frame and
  // then dropping to two is worse than showing two and adding to them.
  const isSignedIn = !isSessionPending && session !== null;

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
          // The palette, not a literal: this bar was navy on both themes.
          backgroundColor: colors.barTranslucent,
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
          href: isSignedIn ? "/" : null,
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
          href: isSignedIn ? "/inbox" : null,
          tabBarIcon: ({ focused }) => (
            <View>
              <TabIcon focused={focused} name="chatbubbles" />
              <Badge count={unreadInbox} />
            </View>
          ),
          title: t("nav.inbox")
        }}
      />
      {/* The one tab that stays in both states, because it is where the way
          in lives: signed out it is the sign-in prompt, signed in it is the
          account. */}
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name={isSignedIn ? "person-circle" : "log-in"} />
          ),
          title: isSignedIn ? t("nav.profile") : t("auth.signIn")
        }}
      />
    </Tabs>
  );
}

const useStyles = makeStyles((colors) => ({
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
}));
