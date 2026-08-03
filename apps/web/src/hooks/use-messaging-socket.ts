import type { WebsocketServerEvent } from "@genex/shared";
import { useQueryClient } from "@tanstack/react-query";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";

import {
  markConversationRead,
  type MessageConversation,
  type MessageConversationThread,
  type MessageParticipant
} from "@/lib/api/messages";
import { queryKeys } from "@/lib/query/keys";
import { buildApiWebSocketUrl } from "@/lib/ws-url";

/**
 * Moved to `@genex/shared` when the mobile client grew a socket of its own. The
 * alias stays so this file reads the same as it did.
 */
export type MessagingSocketEvent = WebsocketServerEvent;

/** Backoff between reconnects: 1s, 2s, 4s, 8s, then every 15s. */
const RECONNECT_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 15_000] as const;

export function totalUnread(conversations: readonly MessageConversation[]): number {
  return conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0);
}

interface MessagingSocketOptions {
  currentUserId: string | null;
  enabled: boolean;
  /**
   * Called after a dropped socket comes back. Events that happened while it was
   * down were delivered to nobody, so the page refetches rather than carrying a
   * thread that is quietly missing messages.
   */
  onReconnect?: () => void;
  /** The debounced term, so the participant cache patched here is the one on screen. */
  participantSearch: string;
  selectedConversationId: string | null;
  setConversations: Dispatch<SetStateAction<readonly MessageConversation[]>>;
  setMessageUnreadCount: (count: number) => void;
  setThreads: Dispatch<SetStateAction<Record<string, MessageConversationThread>>>;
  setTypingConversationId: Dispatch<SetStateAction<string | null>>;
}

/**
 * The messages page's WebSocket client: connection lifecycle, the reducer over
 * every server event, and the typing signal going the other way.
 *
 * It writes into the page's local state rather than the query cache because the
 * thread is driven by events rather than fetches — see `apps/web/AGENTS.md`.
 *
 * The connection outlives everything except the signed-in user: selecting
 * another conversation reads the current selection from a ref rather than
 * reopening the socket, and a socket that closes for any other reason is dialled
 * again on a backoff. A page that needs a manual reload to show a message is
 * indistinguishable from a page with no socket at all.
 */
export function useMessagingSocket({
  currentUserId,
  enabled,
  onReconnect,
  participantSearch,
  selectedConversationId,
  setConversations,
  setMessageUnreadCount,
  setThreads,
  setTypingConversationId
}: MessagingSocketOptions): {
  isConnected: boolean;
  sendTypingEvent: (type: "typing:start" | "typing:stop") => void;
} {
  const queryClient = useQueryClient();
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Values the message handler reads but must not reconnect for.
  const selectedConversationIdRef = useRef(selectedConversationId);
  const participantSearchRef = useRef(participantSearch);
  const onReconnectRef = useRef(onReconnect);

  selectedConversationIdRef.current = selectedConversationId;
  participantSearchRef.current = participantSearch;
  onReconnectRef.current = onReconnect;

  useEffect(() => {
    if (!enabled || !currentUserId) {
      return;
    }

    let isDisposed = false;
    let attempt = 0;
    let reconnectTimeoutId: number | null = null;
    let hasConnectedOnce = false;

    const handleEvent = (payload: MessagingSocketEvent): void => {
      if (payload.type === "presence:update") {
        setConversations((current) =>
          current.map((conversation) =>
            conversation.user.id === payload.data.userId
              ? {
                  ...conversation,
                  user: {
                    ...conversation.user,
                    isOnline: payload.data.isOnline
                  }
                }
              : conversation
          )
        );
        // Presence for the search results comes from the next refetch; a
        // stale online dot in a transient dropdown is not worth cache surgery.
        queryClient.setQueryData<readonly MessageParticipant[]>(
          queryKeys.messages.participants(participantSearchRef.current),
          (current) =>
            current?.map((participant) =>
              participant.id === payload.data.userId
                ? { ...participant, isOnline: payload.data.isOnline }
                : participant
            )
        );
        return;
      }

      if (payload.type === "typing:start" || payload.type === "typing:stop") {
        if (payload.data.userId === currentUserId) {
          return;
        }

        setTypingConversationId(payload.type === "typing:start" ? payload.conversationId : null);
        return;
      }

      if (payload.type === "message:read") {
        setThreads((current) => {
          const existing = current[payload.conversationId];

          if (!existing) {
            return current;
          }

          return {
            ...current,
            [payload.conversationId]: {
              ...existing,
              items: existing.items.map((message) =>
                payload.data.readMessageIds.includes(message.id)
                  ? {
                      ...message,
                      readAt: payload.data.readAt
                    }
                  : message
              )
            }
          };
        });
        return;
      }

      if (payload.type !== "message:new") {
        return;
      }

      if (payload.data.senderId === currentUserId) {
        return;
      }

      const selected = selectedConversationIdRef.current;

      setConversations((current) => {
        const nextConversations = current
          .map((conversation) =>
            conversation.id === payload.conversationId
              ? {
                  ...conversation,
                  lastMessage: {
                    content: payload.data.content,
                    conversationId: payload.conversationId,
                    createdAt: payload.data.createdAt,
                    id: payload.data.id,
                    isHidden: false,
                    isOwn: false,
                    readAt: payload.data.readAt,
                    sender: conversation.user,
                    senderId: payload.data.senderId
                  },
                  lastMessageAt: payload.data.createdAt,
                  unreadCount:
                    selected === payload.conversationId ? 0 : conversation.unreadCount + 1,
                  updatedAt: payload.data.createdAt
                }
              : conversation
          )
          .sort((left, right) => {
            const leftTime = left.lastMessageAt ?? left.updatedAt;
            const rightTime = right.lastMessageAt ?? right.updatedAt;

            return new Date(rightTime).getTime() - new Date(leftTime).getTime();
          });

        setMessageUnreadCount(totalUnread(nextConversations));
        return nextConversations;
      });

      setThreads((current) => {
        const existing = current[payload.conversationId];

        if (!existing) {
          return current;
        }

        return {
          ...current,
          [payload.conversationId]: {
            ...existing,
            conversation: {
              ...existing.conversation,
              lastMessage: {
                content: payload.data.content,
                conversationId: payload.conversationId,
                createdAt: payload.data.createdAt,
                id: payload.data.id,
                isHidden: false,
                isOwn: false,
                readAt: payload.data.readAt,
                sender: existing.conversation.user,
                senderId: payload.data.senderId
              },
              lastMessageAt: payload.data.createdAt,
              unreadCount:
                selected === payload.conversationId ? 0 : existing.conversation.unreadCount + 1,
              updatedAt: payload.data.createdAt
            },
            items: existing.items.some((message) => message.id === payload.data.id)
              ? existing.items
              : [
                  ...existing.items,
                  {
                    content: payload.data.content,
                    conversationId: payload.conversationId,
                    createdAt: payload.data.createdAt,
                    id: payload.data.id,
                    isHidden: false,
                    isOwn: false,
                    readAt: payload.data.readAt,
                    sender: existing.conversation.user,
                    senderId: payload.data.senderId
                  }
                ]
          }
        };
      });

      if (selected === payload.conversationId) {
        void markConversationRead(payload.conversationId);
      }
    };

    const scheduleReconnect = (): void => {
      if (isDisposed || reconnectTimeoutId !== null) {
        return;
      }

      const delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)] ?? 15_000;

      attempt += 1;
      reconnectTimeoutId = window.setTimeout(() => {
        reconnectTimeoutId = null;
        connect();
      }, delay);
    };

    function connect(): void {
      if (isDisposed) {
        return;
      }

      const socket = new WebSocket(buildApiWebSocketUrl("messages/ws"));

      socketRef.current = socket;

      socket.onopen = () => {
        attempt = 0;
        setIsConnected(true);

        if (hasConnectedOnce) {
          onReconnectRef.current?.();
        }

        hasConnectedOnce = true;
      };
      socket.onclose = () => {
        setIsConnected(false);
        scheduleReconnect();
      };
      socket.onerror = () => {
        setIsConnected(false);
        // `onclose` always follows `onerror`, and it is the one that retries.
      };
      socket.onmessage = (event) => {
        handleEvent(JSON.parse(String(event.data)) as MessagingSocketEvent);
      };
    }

    // A laptop that slept, or a phone that backgrounded the tab, comes back with
    // a socket the browser already killed. Retry now rather than on the backoff.
    const reconnectNow = (): void => {
      if (isDisposed || socketRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      if (reconnectTimeoutId !== null) {
        window.clearTimeout(reconnectTimeoutId);
        reconnectTimeoutId = null;
      }

      attempt = 0;
      connect();
    };

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === "visible") {
        reconnectNow();
      }
    };

    connect();
    window.addEventListener("online", reconnectNow);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isDisposed = true;
      window.removeEventListener("online", reconnectNow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (reconnectTimeoutId !== null) {
        window.clearTimeout(reconnectTimeoutId);
      }

      const socket = socketRef.current;

      if (socket) {
        socket.onclose = null;
        socket.onerror = null;
        socket.onmessage = null;
        socket.onopen = null;
        socket.close();
      }

      socketRef.current = null;
      setIsConnected(false);
    };
    // Only the signed-in identity reopens the socket. Selection and search are
    // read from refs inside the handler.
  }, [
    currentUserId,
    enabled,
    queryClient,
    setConversations,
    setMessageUnreadCount,
    setThreads,
    setTypingConversationId
  ]);

  const sendTypingEvent = (type: "typing:start" | "typing:stop"): void => {
    if (!selectedConversationIdRef.current || socketRef.current?.readyState !== WebSocket.OPEN) {
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        conversationId: selectedConversationIdRef.current,
        type
      })
    );
  };

  return { isConnected, sendTypingEvent };
}
