import type { WebsocketServerEvent } from "@genex/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

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

    const connect = async (): Promise<void> => {
      const cookie = await readSessionCookie().catch(() => null);

      if (cookie === null || isCancelled) {
        // No credential, or the keychain would not answer. Either way the poll
        // is already running, so there is nothing to report and nothing to
        // throw — an unhandled rejection here would take the screen down
        // through its error boundary for a transport the student never sees.
        return;
      }

      socket = new (WebSocket as unknown as NativeWebSocket)(socketUrl(), undefined, {
        headers: { Cookie: cookie }
      });
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
      };
      socket.onclose = () => {
        setIsConnected(false);
      };
      // Not surfaced. A socket that will not open degrades to the poll, and a
      // student reading a thread does not need to be told which transport
      // delivered it.
      socket.onerror = () => {
        setIsConnected(false);
      };
      socket.onmessage = (event: { data: unknown }) => {
        const payload = JSON.parse(String(event.data)) as WebsocketServerEvent;

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

        if (payload.type === "presence:update") {
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

    // Nothing awaits this, so anything it throws would surface as an unhandled
    // rejection rather than as a failed connection.
    void connect().catch(() => {
      setIsConnected(false);
    });

    return () => {
      isCancelled = true;
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
