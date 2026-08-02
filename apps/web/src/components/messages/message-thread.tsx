import { EyeOff, MessageSquareText, SendHorizontal, ShieldAlert } from "lucide-react";
import type { JSX, RefObject } from "react";

import { MessageThreadSkeleton } from "@/components/common/skeletons";
import {
  formatTimestamp,
  initials,
  roleTone
} from "@/components/messages/message-presentation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { MessageConversationThread } from "@/lib/api/messages";
import { cn } from "@/lib/utils";

type ThreadMessage = MessageConversationThread["items"][number];

/** Shown while no thread is selected. */
function EmptyThreadPane({ currentUserRole }: { currentUserRole: string | null }): JSX.Element {
  return (
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
            Search for a {currentUserRole === "STUDENT" ? "teacher" : "student"} on the left to
            start a direct conversation.
          </p>
        </div>
      </div>
    </>
  );
}

function MessageBubble({ message }: { message: ThreadMessage }): JSX.Element {
  return (
    <div
      className={cn(
        "max-w-[85%] rounded-3xl px-5 py-4 shadow-sm border",
        message.isHidden
          ? "bg-surface-container-low/60 text-on-surface-variant border-outline-variant/30 border-dashed"
          : message.isOwn
            ? "ml-auto bg-primary text-primary-foreground border-primary/20 rounded-tr-sm"
            : "bg-surface text-on-surface border-outline-variant/20 rounded-tl-sm",
        message.isHidden && message.isOwn ? "ml-auto" : undefined
      )}
    >
      <div className="space-y-2">
        {message.isHidden ? (
          <p className="flex items-center gap-2 text-sm italic leading-7">
            <EyeOff className="size-4 shrink-0" />
            {message.content}
          </p>
        ) : (
          <p className="text-sm leading-7">{message.content}</p>
        )}
        <div
          className={cn(
            "flex items-center justify-between gap-3 text-[0.7rem]",
            message.isOwn && !message.isHidden ? "text-surface/72" : "text-on-surface/54"
          )}
        >
          <span>{formatTimestamp(message.createdAt)}</span>
          <span>
            {message.isOwn ? (message.readAt ? "Seen" : "Sent") : message.sender.name}
          </span>
        </div>
      </div>
    </div>
  );
}

/** The right-hand pane: thread header, message list, and composer. */
export function MessageThread({
  composerValue,
  currentUserRole,
  isLoadingThread,
  isSending,
  messageSearch,
  messagesViewportRef,
  onComposerChange,
  onLoadOlder,
  onMessageSearchChange,
  onReport,
  onSend,
  thread,
  typingConversationId,
  visibleMessages
}: {
  composerValue: string;
  currentUserRole: string | null;
  isLoadingThread: boolean;
  isSending: boolean;
  messageSearch: string;
  messagesViewportRef: RefObject<HTMLDivElement | null>;
  onComposerChange: (value: string) => void;
  onLoadOlder: () => void;
  onMessageSearchChange: (value: string) => void;
  onReport: (conversationId: string) => void;
  onSend: () => void;
  thread: MessageConversationThread | null;
  typingConversationId: string | null;
  visibleMessages: readonly ThreadMessage[];
}): JSX.Element {
  return (
    <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl border border-outline-variant/40 shadow-xl relative flex flex-col overflow-hidden">
      {thread ? (
        <>
          <div className="p-6 sm:px-8 space-y-4 border-b border-outline-variant/20 shrink-0 bg-surface-container-lowest/50 backdrop-blur-md z-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <div className="flex size-14 items-center justify-center rounded-full bg-linear-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-inner text-sm font-headline font-bold text-primary">
                    {initials(thread.conversation.user.name)}
                  </div>
                  <div>
                    <h3 className="font-headline text-xl font-extrabold text-on-surface">
                      {thread.conversation.user.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge tone={roleTone(thread.conversation.user.role)}>
                        {thread.conversation.user.role}
                      </Badge>
                      <span className="text-sm text-on-surface/60">
                        {thread.conversation.user.isOnline ? "Online" : "Offline"}
                      </span>
                    </div>
                  </div>
                </div>
                {typingConversationId === thread.conversation.id ? (
                  <p className="text-sm text-on-surface/62">
                    {thread.conversation.user.name} is typing...
                  </p>
                ) : null}
              </div>
              <div className="flex w-full items-center gap-3 md:max-w-md">
                <Input
                  placeholder="Search messages"
                  value={messageSearch}
                  onChange={(event) => onMessageSearchChange(event.target.value)}
                  className="rounded-2xl h-11 bg-surface-container-low/50 border-outline-variant/30"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 shrink-0 rounded-2xl"
                  onClick={() => onReport(thread.conversation.id)}
                >
                  <ShieldAlert className="mr-2 size-4" />
                  Report
                </Button>
              </div>
            </div>
          </div>
          <div className="flex-1 flex flex-col p-6 sm:px-8 overflow-hidden">
            {thread.nextCursor ? (
              <Button type="button" variant="outline" onClick={onLoadOlder}>
                Load older messages
              </Button>
            ) : null}

            <div
              ref={messagesViewportRef}
              className="flex-1 flex flex-col gap-4 overflow-y-auto rounded-3xl bg-surface-container-low/30 border border-outline-variant/10 p-6 scroll-smooth"
            >
              {isLoadingThread ? (
                <MessageThreadSkeleton />
              ) : visibleMessages.length > 0 ? (
                visibleMessages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
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
                onChange={(event) => onComposerChange(event.target.value)}
              />
              <div className="mt-4 flex items-center justify-between gap-3 px-2">
                <p className="text-xs text-on-surface-variant font-light">
                  Messages are permanent and cannot be deleted.
                </p>
                <Button
                  type="button"
                  className="rounded-full px-6 h-12 font-headline font-semibold shadow-md transition-transform hover:scale-105"
                  disabled={isSending || composerValue.trim().length === 0}
                  onClick={onSend}
                >
                  <SendHorizontal className="mr-2 size-4" />
                  Send
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <EmptyThreadPane currentUserRole={currentUserRole} />
      )}
    </div>
  );
}
