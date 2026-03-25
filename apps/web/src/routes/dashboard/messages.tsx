import { createFileRoute, useRouter } from "@tanstack/react-router";
import { MessageSquareText, SendHorizontal, Wifi, WifiOff } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { DataTableSkeleton } from "@/components/common/data-table-skeleton";
import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSession } from "@/hooks/use-auth-session";
import { buildApiWebSocketUrl } from "@/lib/ws-url";
import {
  createConversation,
  getConversationMessages,
  listMessageConversations,
  markConversationRead,
  MESSAGES_UNREAD_EVENT,
  searchMessageParticipants,
  sendConversationMessage,
  type MessageConversation,
  type MessageConversationThread,
  type MessageParticipant
} from "@/lib/api/messages";
import { cn } from "@/lib/utils";

type MessagingSocketEvent =
  | {
      conversationId: string;
      data: {
        content: string;
        createdAt: string;
        id: string;
        readAt: string | null;
        senderId: string;
      };
      type: "message:new";
    }
  | {
      conversationId: string;
      data: {
        readAt: string;
        readMessageIds: readonly string[];
        userId: string;
      };
      type: "message:read";
    }
  | {
      conversationId: string;
      data: {
        userId: string;
      };
      type: "typing:start" | "typing:stop";
    }
  | {
      conversationId: string;
      data: {
        isOnline: boolean;
        userId: string;
      };
      type: "presence:update";
    };

export const Route = createFileRoute("/dashboard/messages" as never)({
  component: DashboardMessagesPage,
  errorComponent: RouteErrorView
} as never);

function emitUnreadCount(count: number): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(MESSAGES_UNREAD_EVENT, {
      detail: { count }
    })
  );
}

function totalUnread(conversations: readonly MessageConversation[]): number {
  return conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0);
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function roleTone(role: MessageParticipant["role"]): "blue" | "gray" | "green" | "violet" {
  if (role === "TEACHER") {
    return "violet";
  }

  if (role === "STUDENT") {
    return "blue";
  }

  if (role === "ADMIN") {
    return "green";
  }

  return "gray";
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}

function DashboardMessagesPage(): JSX.Element {
  const router = useRouter();
  const { isPending: isSessionPending, session } = useAuthSession();
  const [conversations, setConversations] = useState<readonly MessageConversation[]>([]);
  const [threads, setThreads] = useState<Record<string, MessageConversationThread>>({});
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversationSearch, setConversationSearch] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [participantSearch, setParticipantSearch] = useState("");
  const [participantResults, setParticipantResults] = useState<readonly MessageParticipant[]>([]);
  const [composerValue, setComposerValue] = useState("");
  const [typingConversationId, setTypingConversationId] = useState<string | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const currentUserId = session?.user.id ?? null;
  const currentUserRole = session?.session.role ?? null;
  const canUseMessaging = currentUserRole === "STUDENT" || currentUserRole === "TEACHER";

  const filteredConversations = useMemo(() => {
    const searchTerm = conversationSearch.trim().toLowerCase();

    if (!searchTerm) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      return (
        conversation.user.name.toLowerCase().includes(searchTerm) ||
        conversation.user.role.toLowerCase().includes(searchTerm) ||
        (conversation.lastMessage?.content.toLowerCase().includes(searchTerm) ?? false)
      );
    });
  }, [conversationSearch, conversations]);

  const selectedThread = selectedConversationId ? threads[selectedConversationId] ?? null : null;

  const visibleMessages = useMemo(() => {
    const items = selectedThread?.items ?? [];
    const searchTerm = messageSearch.trim().toLowerCase();

    if (!searchTerm) {
      return items;
    }

    return items.filter((message) => message.content.toLowerCase().includes(searchTerm));
  }, [messageSearch, selectedThread?.items]);

  const syncConversationSelection = (items: readonly MessageConversation[]): void => {
    if (items.length === 0) {
      setSelectedConversationId(null);
      return;
    }

    setSelectedConversationId((current) => {
      if (current && items.some((conversation) => conversation.id === current)) {
        return current;
      }

      return items[0]?.id ?? null;
    });
  };

  const refreshConversations = async (): Promise<void> => {
    if (!canUseMessaging) {
      return;
    }

    setIsLoadingConversations(true);

    try {
      const nextConversations = await listMessageConversations();

      setConversations(nextConversations);
      emitUnreadCount(totalUnread(nextConversations));
      syncConversationSelection(nextConversations);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadConversation = async (conversationId: string, cursor?: string): Promise<void> => {
    setIsLoadingThread(true);

    try {
      const thread = await getConversationMessages(conversationId, cursor ? { cursor, limit: 30 } : { limit: 30 });

      setThreads((current) => {
        if (!cursor) {
          return {
            ...current,
            [conversationId]: thread
          };
        }

        const previousItems = current[conversationId]?.items ?? [];

        return {
          ...current,
          [conversationId]: {
            ...thread,
            items: [...thread.items, ...previousItems]
          }
        };
      });
      setConversations((current) => {
        const nextConversations = current.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...thread.conversation,
                unreadCount: 0
              }
            : conversation
        );

        emitUnreadCount(totalUnread(nextConversations));
        return nextConversations;
      });

      const readResult = await markConversationRead(conversationId);

      if (readResult.readMessageIds.length > 0) {
        setThreads((current) => {
          const existing = current[conversationId];

          if (!existing) {
            return current;
          }

          return {
            ...current,
            [conversationId]: {
              ...existing,
              items: existing.items.map((message) =>
                readResult.readMessageIds.includes(message.id)
                  ? {
                      ...message,
                      readAt: readResult.readAt ?? message.readAt
                    }
                  : message
              )
            }
          };
        });
      }
    } finally {
      setIsLoadingThread(false);
    }
  };

  useEffect(() => {
    if (isSessionPending || !session) {
      return;
    }

    if (!canUseMessaging) {
      toast.error("Messaging is only available for students and teachers");
      void router.navigate({ to: "/dashboard" });
      return;
    }

    void refreshConversations();
  }, [canUseMessaging, isSessionPending, router, session]);

  useEffect(() => {
    if (!selectedConversationId || threads[selectedConversationId]) {
      return;
    }

    void loadConversation(selectedConversationId);
  }, [selectedConversationId, threads]);

  useEffect(() => {
    if (!participantSearch.trim() || !canUseMessaging) {
      setParticipantResults([]);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        const results = await searchMessageParticipants({
          limit: 8,
          search: participantSearch.trim()
        });

        setParticipantResults(results);
      })();
    }, 200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [canUseMessaging, participantSearch]);

  useEffect(() => {
    if (!canUseMessaging || !session || !currentUserId) {
      return;
    }

    const socket = new WebSocket(buildApiWebSocketUrl("messages/ws"));

    socketRef.current = socket;
    socket.onopen = () => {
      setIsSocketConnected(true);
    };
    socket.onclose = () => {
      setIsSocketConnected(false);
    };
    socket.onerror = () => {
      setIsSocketConnected(false);
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
        setParticipantResults((current) =>
          current.map((participant) =>
            participant.id === payload.data.userId
              ? {
                  ...participant,
                  isOnline: payload.data.isOnline
                }
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
                    isOwn: false,
                    readAt: payload.data.readAt,
                    sender: conversation.user,
                    senderId: payload.data.senderId
                  },
                  lastMessageAt: payload.data.createdAt,
                  unreadCount:
                    selectedConversationId === payload.conversationId ? 0 : conversation.unreadCount + 1,
                  updatedAt: payload.data.createdAt
                }
              : conversation
          )
          .sort((left, right) => {
            const leftTime = left.lastMessageAt ?? left.updatedAt;
            const rightTime = right.lastMessageAt ?? right.updatedAt;

            return new Date(rightTime).getTime() - new Date(leftTime).getTime();
          });

        emitUnreadCount(totalUnread(nextConversations));
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
                isOwn: false,
                readAt: payload.data.readAt,
                sender: existing.conversation.user,
                senderId: payload.data.senderId
              },
              lastMessageAt: payload.data.createdAt,
              unreadCount: selectedConversationId === payload.conversationId ? 0 : existing.conversation.unreadCount + 1,
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
      setIsSocketConnected(false);
    };
  }, [canUseMessaging, currentUserId, selectedConversationId, session]);

  useEffect(() => {
    messagesViewportRef.current?.scrollTo({
      top: messagesViewportRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [selectedThread?.items.length, typingConversationId]);

  const handleStartConversation = async (participantId: string): Promise<void> => {
    const conversation = await createConversation({ participantId });

    setParticipantSearch("");
    setParticipantResults([]);
    setConversations((current) => {
      const next = [conversation, ...current.filter((item) => item.id !== conversation.id)];

      emitUnreadCount(totalUnread(next));
      return next;
    });
    setSelectedConversationId(conversation.id);
  };

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

  const handleComposerChange = (value: string): void => {
    setComposerValue(value);

    if (!selectedConversationId) {
      return;
    }

    sendTypingEvent("typing:start");

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      sendTypingEvent("typing:stop");
    }, 1200);
  };

  const handleSend = async (): Promise<void> => {
    if (!selectedConversationId || !composerValue.trim()) {
      return;
    }

    setIsSending(true);

    try {
      const message = await sendConversationMessage(selectedConversationId, {
        content: composerValue.trim()
      });

      setThreads((current) => {
        const existing = current[selectedConversationId];

        if (!existing) {
          return current;
        }

        return {
          ...current,
          [selectedConversationId]: {
            ...existing,
            conversation: {
              ...existing.conversation,
              lastMessage: message,
              lastMessageAt: message.createdAt,
              updatedAt: message.createdAt
            },
            items: [...existing.items, message]
          }
        };
      });
      setConversations((current) =>
        [
          ...current.map((conversation) =>
            conversation.id === selectedConversationId
              ? {
                  ...conversation,
                  lastMessage: message,
                  lastMessageAt: message.createdAt,
                  updatedAt: message.createdAt
                }
              : conversation
          )
        ].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      );
      setComposerValue("");
      sendTypingEvent("typing:stop");
    } finally {
      setIsSending(false);
    }
  };

  if (isSessionPending || isLoadingConversations) {
    return <DataTableSkeleton columns={3} rows={6} />;
  }

  if (!session || !canUseMessaging) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Messaging unavailable</CardTitle>
          <CardDescription>This workspace is reserved for teacher-student conversations.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
      <Card className="overflow-hidden">
        <CardHeader className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Inbox</CardTitle>
              <CardDescription>Quiet, direct conversations with live delivery and read states.</CardDescription>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-2 text-xs text-on-surface/68">
              {isSocketConnected ? <Wifi className="size-3.5 text-emerald-600" /> : <WifiOff className="size-3.5 text-rose-600" />}
              <span>{isSocketConnected ? "Live" : "Offline"}</span>
            </div>
          </div>
          <Input
            placeholder="Search conversations"
            value={conversationSearch}
            onChange={(event) => setConversationSearch(event.target.value)}
          />
          <div className="space-y-2 rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-on-surface/54">Start new</p>
            <Input
              placeholder={currentUserRole === "STUDENT" ? "Find a teacher" : "Find a student"}
              value={participantSearch}
              onChange={(event) => setParticipantSearch(event.target.value)}
            />
            {participantResults.length > 0 ? (
              <div className="space-y-2">
                {participantResults.map((participant) => (
                  <button
                    key={participant.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-[calc(var(--radius)-0.25rem)] bg-surface px-3 py-3 text-left transition-colors hover:bg-surface-container-highest"
                    onClick={() => void handleStartConversation(participant.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-surface-container-highest text-sm font-semibold text-on-surface">
                        {initials(participant.name)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-on-surface">{participant.name}</p>
                        <p className="text-xs text-on-surface/60">{participant.isOnline ? "Online now" : "Offline"}</p>
                      </div>
                    </div>
                    <Badge tone={roleTone(participant.role)}>{participant.role}</Badge>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                className={cn(
                  "w-full rounded-[calc(var(--radius)-0.125rem)] px-3 py-3 text-left transition-all duration-150 ease-out",
                  selectedConversationId === conversation.id
                    ? "bg-surface-container-highest shadow-[0_12px_30px_-22px_rgba(19,27,46,0.28)]"
                    : "bg-surface-container-low hover:bg-surface-container-highest"
                )}
                onClick={() => setSelectedConversationId(conversation.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-on-surface">{conversation.user.name}</span>
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          conversation.user.isOnline ? "bg-emerald-500" : "bg-slate-300"
                        )}
                      />
                    </div>
                    <p className="mt-1 truncate text-sm text-on-surface/62">
                      {conversation.lastMessage?.content ?? "No messages yet"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {conversation.lastMessageAt ? (
                      <span className="text-[0.7rem] text-on-surface/50">
                        {new Date(conversation.lastMessageAt).toLocaleDateString()}
                      </span>
                    ) : null}
                    {conversation.unreadCount > 0 ? <Badge tone="violet">{conversation.unreadCount}</Badge> : null}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-7 text-on-surface/68">
              No conversations yet. Start a teacher-student chat from the search panel above.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="min-h-168">
        {selectedThread ? (
          <>
            <CardHeader className="space-y-4 border-b border-outline-variant/60">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-full bg-surface-container-highest text-sm font-semibold text-on-surface">
                      {initials(selectedThread.conversation.user.name)}
                    </div>
                    <div>
                      <CardTitle>{selectedThread.conversation.user.name}</CardTitle>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge tone={roleTone(selectedThread.conversation.user.role)}>
                          {selectedThread.conversation.user.role}
                        </Badge>
                        <span className="text-sm text-on-surface/60">
                          {selectedThread.conversation.user.isOnline ? "Online" : "Offline"}
                        </span>
                      </div>
                    </div>
                  </div>
                  {typingConversationId === selectedThread.conversation.id ? (
                    <p className="text-sm text-on-surface/62">
                      {selectedThread.conversation.user.name} is typing...
                    </p>
                  ) : null}
                </div>
                <div className="w-full md:max-w-xs">
                  <Input
                    placeholder="Search messages"
                    value={messageSearch}
                    onChange={(event) => setMessageSearch(event.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {selectedThread.nextCursor ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    void loadConversation(
                      selectedThread.conversation.id,
                      selectedThread.nextCursor ?? undefined
                    )
                  }
                >
                  Load older messages
                </Button>
              ) : null}

              <div
                ref={messagesViewportRef}
                className="flex max-h-128 flex-col gap-3 overflow-y-auto rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4"
              >
                {isLoadingThread ? (
                  <div className="space-y-3">
                    <div className="h-20 rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-highest/60" />
                    <div className="ml-auto h-20 w-3/4 rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-highest/60" />
                  </div>
                ) : visibleMessages.length > 0 ? (
                  visibleMessages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "max-w-[88%] rounded-[calc(var(--radius)-0.125rem)] px-4 py-3 shadow-[0_10px_24px_-20px_rgba(19,27,46,0.28)]",
                        message.isOwn
                          ? "ml-auto bg-secondary-container text-surface"
                          : "bg-surface text-on-surface"
                      )}
                    >
                      <div className="space-y-2">
                        <p className="text-sm leading-7">{message.content}</p>
                        <div
                          className={cn(
                            "flex items-center justify-between gap-3 text-[0.7rem]",
                            message.isOwn ? "text-surface/72" : "text-on-surface/54"
                          )}
                        >
                          <span>{formatTimestamp(message.createdAt)}</span>
                          <span>{message.isOwn ? (message.readAt ? "Seen" : "Sent") : message.sender.name}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface p-4 text-sm leading-7 text-on-surface/68">
                    No messages match the current filter.
                  </div>
                )}
              </div>

              <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4">
                <Textarea
                  placeholder="Write a message"
                  className="min-h-28 bg-surface"
                  value={composerValue}
                  onChange={(event) => handleComposerChange(event.target.value)}
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-on-surface/58">Messages are permanent and cannot be deleted.</p>
                  <Button type="button" disabled={isSending || composerValue.trim().length === 0} onClick={() => void handleSend()}>
                    <SendHorizontal className="mr-2 size-4" />
                    Send
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle>Conversation workspace</CardTitle>
              <CardDescription>Select a thread or start a new one to begin messaging.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex min-h-80 flex-col items-center justify-center rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-6 text-center">
                <MessageSquareText className="size-10 text-on-surface/40" />
                <p className="mt-4 text-lg font-semibold text-on-surface">No conversation selected</p>
                <p className="mt-2 max-w-md text-sm leading-7 text-on-surface/62">
                  Search for a {currentUserRole === "STUDENT" ? "teacher" : "student"} on the left to start a direct
                  conversation.
                </p>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
