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

export function totalUnread(conversations: readonly MessageConversation[]): number {
  return conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0);
}

interface MessagingSocketOptions {
  currentUserId: string | null;
  enabled: boolean;
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
 */
export function useMessagingSocket({
  currentUserId,
  enabled,
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

  useEffect(() => {
    if (!enabled || !currentUserId) {
      return;
    }

    const socket = new WebSocket(buildApiWebSocketUrl("messages/ws"));

    socketRef.current = socket;
    socket.onopen = () => {
      setIsConnected(true);
    };
    socket.onclose = () => {
      setIsConnected(false);
    };
    socket.onerror = () => {
      setIsConnected(false);
    };
    socket.onmessage = (event) => {
      const payload = JSON.parse(String(event.data)) as MessagingSocketEvent;

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
          queryKeys.messages.participants(participantSearch),
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
                    selectedConversationId === payload.conversationId
                      ? 0
                      : conversation.unreadCount + 1,
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
                selectedConversationId === payload.conversationId
                  ? 0
                  : existing.conversation.unreadCount + 1,
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

      if (selectedConversationId === payload.conversationId) {
        void markConversationRead(payload.conversationId);
      }
    };

    return () => {
      socket.close();
      socketRef.current = null;
      setIsConnected(false);
    };
    // Only identity and selection reopen the socket. The setters and the query
    // client are stable, and reconnecting on every render would thrash it.
  }, [currentUserId, enabled, selectedConversationId]);

  const sendTypingEvent = (type: "typing:start" | "typing:stop"): void => {
    if (!selectedConversationId || socketRef.current?.readyState !== WebSocket.OPEN) {
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        conversationId: selectedConversationId,
        type
      })
    );
  };

  return { isConnected, sendTypingEvent };
}
