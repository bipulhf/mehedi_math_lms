import type { WebsocketServerEvent } from "@mma/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import type { ConversationThread, MessageConversation } from "@/src/lib/api/messages";
import { mobileEnv } from "@/src/lib/env";
import { queryKeys } from "@/src/lib/query";
import { readSessionCookie } from "@/src/lib/session-store";

/**
 * The conversation socket.
 *
 * The web client's `use-messaging-socket.ts` is the reference — same endpoint,
 * same event union. What differs here is lifecycle: a phone backgrounds the app
 * constantly, and a socket held open across that is a dead socket that still
 * looks connected. So connect and disconnect are driven by `AppState` rather
 * than by mount, and the caller falls back to the poll whenever `isConnected`
 * is false. The poll is not deleted: on a bad network it is the correct
 * behaviour, and trading one absolute rule for another would be no better.
 *
 * React Native has no cookie jar, so the upgrade request carries the session
 * cookie as a header the same way every other request does.
 */

/**
 * React Native's WebSocket takes a third options argument that the DOM one does
 * not. Without it the upgrade arrives unauthenticated and the server closes it.
 */
type NativeWebSocket = new (
  url: string,
  protocols: string | readonly string[] | undefined,
  options: { headers: Record<string, string> }
) => WebSocket;

function socketUrl(): string {
  return `${mobileEnv.apiOrigin.replace(/^http/, "ws")}/api/v1/messages/ws`;
}

export interface MessagingSocket {
  isConnected: boolean;
  sendTyping: (type: "typing:start" | "typing:stop") => void;
}

export function useMessagingSocket({
  conversationId,
  currentUserId,
  enabled,
  onTypingChange
}: {
  conversationId: string;
  currentUserId: string | null;
  enabled: boolean;
  onTypingChange: (isTyping: boolean) => void;
}): MessagingSocket {
  const queryClient = useQueryClient();
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const onTypingChangeRef = useRef(onTypingChange);

  onTypingChangeRef.current = onTypingChange;

  useEffect(() => {
    const subscription = AppState.addEventListener("change", setAppState);

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!enabled || currentUserId === null || appState !== "active") {
      return;
    }

    let socket: WebSocket | null = null;
    let isCancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    // Exponential backoff on a dropped socket: a phone regains signal on its
    // own, so reconnect rather than wait for the next foreground event. The
    // base doubles up to the cap and resets on a successful open.
    let backoffMs = 1_000;
    const RECONNECT_CAP_MS = 30_000;

    const clearReconnect = (): void => {
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const scheduleReconnect = (): void => {
      if (isCancelled) {
        return;
      }

      clearReconnect();
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        void connectSafely();
      }, backoffMs);
      backoffMs = Math.min(backoffMs * 2, RECONNECT_CAP_MS);
    };

    const connect = async (): Promise<void> => {
      let cookie: string | null;

      try {
        cookie = await readSessionCookie();
      } catch {
        cookie = null;
      }

      if (cookie === null || isCancelled) {
        // No credential, or the keychain would not answer. Either way the poll
        // is already running, so there is nothing to report and nothing to
        // throw — an unhandled rejection here would take the screen down
        // through its error boundary for a transport the student never sees.
        return;
      }

      socket?.close();
      socket = new (WebSocket as unknown as NativeWebSocket)(socketUrl(), undefined, {
        headers: { Cookie: cookie }
      });
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        backoffMs = 1_000;
      };
      socket.onclose = () => {
        setIsConnected(false);
        scheduleReconnect();
      };
      // Not surfaced. A socket that will not open degrades to the poll, and a
      // student reading a thread does not need to be told which transport
      // delivered it.
      socket.onerror = () => {
        setIsConnected(false);
      };
      socket.onmessage = (event: { data: unknown }) => {
        let payload: WebsocketServerEvent;

        try {
          payload = JSON.parse(String(event.data)) as WebsocketServerEvent;
        } catch {
          // A malformed transport frame is not content. The polling fallback
          // continues to keep this screen current.
          return;
        }

        // Presence is a global broadcast, not scoped to a conversation — the
        // server always sends it with `conversationId: ""`. Handling it before
        // the conversation-scoping check below matters: that check would
        // otherwise drop every presence event, since "" never equals the id of
        // the conversation this screen has open.
        if (payload.type === "presence:update") {
          const { isOnline, userId } = payload.data;

          queryClient.setQueryData<readonly MessageConversation[]>(
            queryKeys.conversations(),
            (current) =>
              current?.map((conversation) =>
                conversation.user.id === userId
                  ? { ...conversation, user: { ...conversation.user, isOnline } }
                  : conversation
              )
          );
          queryClient.setQueryData<ConversationThread>(
            queryKeys.conversation(conversationId),
            (current) =>
              current === undefined || current.conversation.user.id !== userId
                ? current
                : {
                    ...current,
                    conversation: {
                      ...current.conversation,
                      user: { ...current.conversation.user, isOnline }
                    }
                  }
          );

          return;
        }

        if (payload.conversationId !== conversationId) {
          // Another thread moved. The list owns that, and it is refetched when
          // this screen is left.
          if (payload.type === "message:new") {
            void queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
          }

          return;
        }

        if (payload.type === "typing:start" || payload.type === "typing:stop") {
          if (payload.data.userId !== currentUserId) {
            onTypingChangeRef.current(payload.type === "typing:start");
          }

          return;
        }

        // Both `message:new` and `message:read` change what the thread should
        // show. The event carries enough to patch it, but refetching keeps one
        // source of truth for a screen that also polls.
        void queryClient.invalidateQueries({
          queryKey: queryKeys.conversation(conversationId)
        });
        void queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
      };
    };

    const connectSafely = async (): Promise<void> => {
      try {
        await connect();
      } catch {
        setIsConnected(false);
      }
    };

    // Nothing awaits this, so anything it throws would surface as an unhandled
    // rejection rather than as a failed connection.
    void connectSafely();

    return () => {
      isCancelled = true;
      clearReconnect();
      setIsConnected(false);
      socket?.close();
      socketRef.current = null;
    };
  }, [appState, conversationId, currentUserId, enabled, queryClient]);

  const sendTyping = useCallback(
    (type: "typing:start" | "typing:stop") => {
      const socket = socketRef.current;

      if (socket?.readyState === 1) {
        socket.send(JSON.stringify({ conversationId, type }));
      }
    },
    [conversationId]
  );

  return { isConnected, sendTyping };
}
