import { createFileRoute, useRouter } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { RouteErrorView } from "@/components/common/route-error";
import { ConversationList } from "@/components/messages/conversation-list";
import { MessageThread } from "@/components/messages/message-thread";
import { MessagesPageSkeleton } from "@/components/messages/messages-page-skeleton";
import { ReportConversationDialog } from "@/components/messages/report-conversation-dialog";
import { useAuthSession } from "@/hooks/use-auth-session";
import { totalUnread, useMessagingSocket } from "@/hooks/use-messaging-socket";
import { useUiStore } from "@/stores/ui-store";
import {
  createConversation,
  getConversationMessages,
  listMessageConversations,
  markConversationRead,
  searchMessageParticipants,
  sendConversationMessage,
  type MessageConversation,
  type MessageConversationThread,
  type MessageParticipant
} from "@/lib/api/messages";
import { queryKeys } from "@/lib/query/keys";

export const Route = createFileRoute("/dashboard/messages")({
  component: DashboardMessagesPage,
  errorComponent: RouteErrorView
} as never);

function DashboardMessagesPage(): JSX.Element {
  const router = useRouter();
  const { isPending: isSessionPending, session } = useAuthSession();
  const [conversations, setConversations] = useState<readonly MessageConversation[]>([]);
  const [threads, setThreads] = useState<Record<string, MessageConversationThread>>({});
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversationSearch, setConversationSearch] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [participantSearch, setParticipantSearch] = useState("");
  const [composerValue, setComposerValue] = useState("");
  const [typingConversationId, setTypingConversationId] = useState<string | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [reportingConversationId, setReportingConversationId] = useState<string | null>(null);
  // The sidebar badge reads this slice; it has no ancestor in common with this page.
  const setMessageUnreadCount = useUiStore((state) => state.setMessageUnreadCount);
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
      setMessageUnreadCount(totalUnread(nextConversations));
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

        setMessageUnreadCount(totalUnread(nextConversations));
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

  // Debounced into state so the query key changes at most every 200ms while typing.
  const [debouncedParticipantSearch, setDebouncedParticipantSearch] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedParticipantSearch(participantSearch.trim());
    }, 200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [participantSearch]);

  const { data: participantResults = [] } = useQuery<readonly MessageParticipant[]>({
    enabled: canUseMessaging && debouncedParticipantSearch.length > 0,
    queryFn: async () =>
      searchMessageParticipants({ limit: 8, search: debouncedParticipantSearch }),
    queryKey: queryKeys.messages.participants(debouncedParticipantSearch)
  });

  const { isConnected: isSocketConnected, sendTypingEvent } = useMessagingSocket({
    currentUserId,
    enabled: canUseMessaging && Boolean(session),
    participantSearch: debouncedParticipantSearch,
    selectedConversationId,
    setConversations,
    setMessageUnreadCount,
    setThreads,
    setTypingConversationId
  });

  useEffect(() => {
    messagesViewportRef.current?.scrollTo({
      top: messagesViewportRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [selectedThread?.items.length, typingConversationId]);

  const handleStartConversation = async (participantId: string): Promise<void> => {
    const conversation = await createConversation({ participantId });

    setParticipantSearch("");
    setConversations((current) => {
      const next = [conversation, ...current.filter((item) => item.id !== conversation.id)];

      setMessageUnreadCount(totalUnread(next));
      return next;
    });
    setSelectedConversationId(conversation.id);
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
    return <MessagesPageSkeleton />;
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
      <ConversationList
        conversations={filteredConversations}
        conversationSearch={conversationSearch}
        currentUserRole={currentUserRole}
        isSocketConnected={isSocketConnected}
        onConversationSearchChange={setConversationSearch}
        onParticipantSearchChange={setParticipantSearch}
        onSelectConversation={setSelectedConversationId}
        onStartConversation={(participantId) => void handleStartConversation(participantId)}
        participantResults={participantResults}
        participantSearch={participantSearch}
        selectedConversationId={selectedConversationId}
      />

      <MessageThread
        composerValue={composerValue}
        currentUserRole={currentUserRole}
        isLoadingThread={isLoadingThread}
        isSending={isSending}
        messageSearch={messageSearch}
        messagesViewportRef={messagesViewportRef}
        onComposerChange={handleComposerChange}
        onLoadOlder={() => {
          if (selectedThread) {
            void loadConversation(
              selectedThread.conversation.id,
              selectedThread.nextCursor ?? undefined
            );
          }
        }}
        onMessageSearchChange={setMessageSearch}
        onReport={setReportingConversationId}
        onSend={() => void handleSend()}
        thread={selectedThread}
        typingConversationId={typingConversationId}
        visibleMessages={visibleMessages}
      />

      {reportingConversationId && selectedThread ? (
        <ReportConversationDialog
          conversationId={reportingConversationId}
          participantName={selectedThread.conversation.user.name}
          onClose={() => setReportingConversationId(null)}
          onReported={() => setReportingConversationId(null)}
        />
      ) : null}
    </div>
  );
}
