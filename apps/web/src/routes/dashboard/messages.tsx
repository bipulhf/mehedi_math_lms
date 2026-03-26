import { createFileRoute, useRouter } from "@tanstack/react-router";
import { MessageSquareText, SendHorizontal, Wifi, WifiOff } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  const selectedThread = selectedConversationId ? (threads[selectedConversationId] ?? null) : null;

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
      const thread = await getConversationMessages(
        conversationId,
        cursor ? { cursor, limit: 30 } : { limit: 30 }
      );

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
        ].sort(
          (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
        )
      );
      setComposerValue("");
      sendTypingEvent("typing:stop");
    } finally {
      setIsSending(false);
    }
  };

  if (isSessionPending || isLoadingConversations) {
    return (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[24rem_minmax(0,1fr)] h-[calc(100vh-8rem)]">
        <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl border border-outline-variant/40 shadow-xl relative flex flex-col overflow-hidden">
          <div className="p-6 sm:p-8 space-y-6 shrink-0 border-b border-outline-variant/20">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Skeleton className="h-8 w-24 mb-2 bg-surface-container-highest" />
                <Skeleton className="h-3 w-48 bg-surface-container-highest" />
              </div>
            </div>
            <Skeleton className="rounded-2xl h-12 w-full bg-surface-container-high" />
            <div className="space-y-3 rounded-3xl bg-surface-container-low/40 border border-outline-variant/20 p-4 shadow-inner">
              <Skeleton className="h-3 w-20 mb-2 bg-surface-container-high" />
              <Skeleton className="h-10 w-full rounded-xl bg-surface-container-high" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-3xl bg-surface-container-high" />
            ))}
          </div>
        </div>

        <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl border border-outline-variant/40 shadow-xl relative flex flex-col overflow-hidden">
          <div className="p-8 sm:p-12 space-y-4 border-b border-outline-variant/20 shrink-0 bg-surface-container-lowest/50">
            <Skeleton className="h-8 w-64 bg-surface-container-highest" />
            <Skeleton className="h-4 w-48 bg-surface-container-highest" />
          </div>
          <div className="flex-1 flex flex-col p-6 sm:p-12 items-center justify-center">
            <Skeleton className="w-[80%] max-w-lg h-64 rounded-4xl bg-surface-container-highest" />
          </div>
        </div>
      </div>
    );
  }

  if (!session || !canUseMessaging) {
    return (
      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden group">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none group-hover:bg-primary/10 transition-colors z-[-1]"></div>
        <div className="mb-4">
          <h3 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">
            Messaging unavailable
          </h3>
          <p className="mt-2 text-sm text-on-surface-variant font-light max-w-2xl leading-relaxed">
            This workspace is reserved for teacher-student conversations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[24rem_minmax(0,1fr)] h-[calc(100vh-8rem)]">
      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl border border-outline-variant/40 shadow-xl relative flex flex-col overflow-hidden group">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none group-hover:bg-primary/10 transition-colors z-[-1]"></div>
        <div className="p-6 sm:p-8 space-y-6 shrink-0 border-b border-outline-variant/20">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">
                Inbox
              </h3>
              <p className="mt-2 text-xs text-on-surface-variant font-light leading-relaxed">
                Quiet, direct conversations with live delivery and read states.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-surface-container-low/50 border border-outline-variant/20 px-3 py-2 text-xs text-on-surface/68 shadow-inner">
              {isSocketConnected ? (
                <Wifi className="size-3.5 text-emerald-600" />
              ) : (
                <WifiOff className="size-3.5 text-rose-600" />
              )}
              <span>{isSocketConnected ? "Live" : "Offline"}</span>
            </div>
          </div>
          <Input
            placeholder="Search conversations"
            value={conversationSearch}
            onChange={(event) => setConversationSearch(event.target.value)}
            className="rounded-2xl h-12 bg-surface-container-low/50 border-outline-variant/30"
          />
          <div className="space-y-3 rounded-3xl bg-surface-container-low/40 border border-outline-variant/20 p-4 shadow-inner">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface/54">
              Start new
            </p>
            <Input
              placeholder={currentUserRole === "STUDENT" ? "Find a teacher" : "Find a student"}
              value={participantSearch}
              onChange={(event) => setParticipantSearch(event.target.value)}
              className="rounded-xl h-10 bg-surface border-outline-variant/30"
            />
            {participantResults.length > 0 ? (
              <div className="space-y-2">
                {participantResults.map((participant) => (
                  <button
                    key={participant.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-2xl bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-container-highest shadow-sm border border-outline-variant/10"
                    onClick={() => void handleStartConversation(participant.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-surface-container-highest text-sm font-semibold text-on-surface">
                        {initials(participant.name)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-on-surface">{participant.name}</p>
                        <p className="text-xs text-on-surface/60">
                          {participant.isOnline ? "Online now" : "Offline"}
                        </p>
                      </div>
                    </div>
                    <Badge tone={roleTone(participant.role)}>{participant.role}</Badge>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                className={cn(
                  "w-full rounded-3xl px-4 py-4 text-left transition-all duration-300 ease-out border",
                  selectedConversationId === conversation.id
                    ? "bg-surface border-outline-variant/40 shadow-md ring-1 ring-primary/10"
                    : "bg-surface-container-lowest/50 border-transparent hover:bg-surface-container-low/80 hover:border-outline-variant/20 hover:shadow-sm"
                )}
                onClick={() => setSelectedConversationId(conversation.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-on-surface">
                        {conversation.user.name}
                      </span>
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
                    {conversation.unreadCount > 0 ? (
                      <Badge tone="violet">{conversation.unreadCount}</Badge>
                    ) : null}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-3xl bg-surface-container-low/50 border border-outline-variant/20 p-6 text-sm leading-7 text-on-surface-variant font-light text-center">
              No conversations yet. Start a teacher-student chat from the search panel above.
            </div>
          )}
        </div>
      </div>

      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl border border-outline-variant/40 shadow-xl relative flex flex-col overflow-hidden">
        {selectedThread ? (
          <>
            <div className="p-6 sm:px-8 space-y-4 border-b border-outline-variant/20 shrink-0 bg-surface-container-lowest/50 backdrop-blur-md z-10">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <div className="flex size-14 items-center justify-center rounded-full bg-linear-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-inner text-sm font-headline font-bold text-primary">
                      {initials(selectedThread.conversation.user.name)}
                    </div>
                    <div>
                      <h3 className="font-headline text-xl font-extrabold text-on-surface">
                        {selectedThread.conversation.user.name}
                      </h3>
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
                    className="rounded-2xl h-11 bg-surface-container-low/50 border-outline-variant/30"
                  />
                </div>
              </div>
            </div>
            <div className="flex-1 flex flex-col p-6 sm:px-8 overflow-hidden">
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
                className="flex-1 flex flex-col gap-4 overflow-y-auto rounded-3xl bg-surface-container-low/30 border border-outline-variant/10 p-6 scroll-smooth"
              >
                {isLoadingThread ? (
                  <div className="space-y-4">
                    <div className="h-20 rounded-2xl bg-surface-container-highest/40 w-2/3" />
                    <div className="ml-auto h-20 w-3/4 rounded-2xl bg-surface-container-highest/40" />
                  </div>
                ) : visibleMessages.length > 0 ? (
                  visibleMessages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "max-w-[85%] rounded-3xl px-5 py-4 shadow-sm border",
                        message.isOwn
                          ? "ml-auto bg-primary text-primary-foreground border-primary/20 rounded-tr-sm"
                          : "bg-surface text-on-surface border-outline-variant/20 rounded-tl-sm"
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
                          <span>
                            {message.isOwn
                              ? message.readAt
                                ? "Seen"
                                : "Sent"
                              : message.sender.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-surface-container-low/50 border border-outline-variant/20 p-6 text-sm leading-7 text-on-surface-variant font-light text-center">
                    No messages match the current filter.
                  </div>
                )}
              </div>

              <div className="rounded-4xl bg-surface-container-low/50 border border-outline-variant/20 p-4 mt-6 shrink-0 shadow-inner">
                <Textarea
                  placeholder="Write a message..."
                  className="min-h-24 bg-surface border-transparent focus-visible:ring-0 resize-none text-base rounded-3xl p-4 shadow-sm"
                  value={composerValue}
                  onChange={(event) => handleComposerChange(event.target.value)}
                />
                <div className="mt-4 flex items-center justify-between gap-3 px-2">
                  <p className="text-xs text-on-surface-variant font-light">
                    Messages are permanent and cannot be deleted.
                  </p>
                  <Button
                    type="button"
                    className="rounded-full px-6 h-12 font-headline font-semibold shadow-md transition-transform hover:scale-105"
                    disabled={isSending || composerValue.trim().length === 0}
                    onClick={() => void handleSend()}
                  >
                    <SendHorizontal className="mr-2 size-4" />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="p-8 sm:p-12 space-y-4 border-b border-outline-variant/20 shrink-0 bg-surface-container-lowest/50">
              <h3 className="font-headline text-2xl font-extrabold text-on-surface">
                Conversation workspace
              </h3>
              <p className="text-sm text-on-surface-variant font-light">
                Select a thread or start a new one to begin messaging.
              </p>
            </div>
            <div className="flex-1 flex flex-col p-6 sm:p-12 items-center justify-center">
              <div className="flex flex-col items-center justify-center rounded-4xl bg-surface-container-low/30 border border-outline-variant/10 p-12 text-center max-w-lg w-full shadow-inner">
                <div className="w-20 h-20 rounded-full bg-surface-container-highest flex items-center justify-center mb-6 shadow-md border border-outline-variant/20 text-on-surface/60">
                  <MessageSquareText className="size-8" />
                </div>
                <h4 className="font-headline text-xl font-bold text-on-surface">
                  No conversation selected
                </h4>
                <p className="mt-3 text-sm leading-relaxed text-on-surface-variant font-light">
                  Search for a {currentUserRole === "STUDENT" ? "teacher" : "student"} on the left
                  to start a direct conversation.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
