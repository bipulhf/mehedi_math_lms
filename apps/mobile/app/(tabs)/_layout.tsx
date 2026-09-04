import { useQuery } from "@tanstack/react-query";
import { Tabs } from "expo-router";
import type { JSX } from "react";

import { BottomNav } from "@/src/components/bottom-nav";
import { listConversations } from "@/src/lib/api/messages";
import { getNotificationUnreadCount } from "@/src/lib/api/notifications";
import { useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { useSession } from "@/src/lib/use-session";

/**
 * The signed-in shell. The bar itself is `BottomNav`; this decides which tabs
 * it draws and what the badge on the Inbox says.
 *
 * Explore is the only public tab, so a signed-out visitor gets it and a way in
 * — nothing else. The routes stay registered either way, so a deep link or a
 * redirect still resolves; they are simply left out of the bar. A pending
 * session counts as signed out: showing four tabs for a frame and then
 * dropping to two is worse than showing two and adding to them.
 */
export default function TabsLayout(): JSX.Element {
  const t = useT();
  const { isPending: isSessionPending, session } = useSession();
  const canMessage = session?.session.role === "STUDENT" || session?.session.role === "TEACHER";
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
  // One badge for the merged Inbox tab -- a student doesn't care which half of
  // the tab has something new, only that it does.
  const unreadInbox = unreadMessages + unreadNotifications;
  const visible = isSignedIn ? ["index", "explore", "inbox", "profile"] : ["explore", "profile"];

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomNav {...props} unreadInbox={unreadInbox} visible={visible} />}
    >
      <Tabs.Screen name="index" options={{ title: t("nav.home") }} />
      <Tabs.Screen name="explore" options={{ title: t("nav.explore") }} />
      <Tabs.Screen name="inbox" options={{ title: t("nav.inbox") }} />
      {/* The one tab that stays in both states, because it is where the way in
          lives: signed out it sends the visitor straight to sign-in, signed in
          it is the account. */}
      <Tabs.Screen
        name="profile"
        options={{ title: isSignedIn ? t("nav.profile") : t("auth.signIn") }}
      />
    </Tabs>
  );
}
