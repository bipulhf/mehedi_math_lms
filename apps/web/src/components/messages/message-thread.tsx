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
import { useT } from "@/lib/i18n/locale-context";

type ThreadMessage = MessageConversationThread["items"][number];

/** Shown while no thread is selected. */
function EmptyThreadPane({ currentUserRole }: { currentUserRole: string | null }): JSX.Element {
  const t = useT();

  return (
    <>
      <div className="p-8 sm:p-12 space-y-4 border-b border-hairline/20 shrink-0 bg-card/50">
        <h3 className="font-body text-2xl font-medium text-ink">{t("msg.workspace")}</h3>
        <p className="text-sm text-muted font-light">{t("msg.pick")}</p>
      </div>
      <div className="flex-1 flex flex-col p-6 sm:p-12 items-center justify-center">
        <div className="flex flex-col items-center justify-center bg-panel-warm/30 border border-hairline/10 p-12 text-center max-w-lg w-full">
          <div className="w-20 h-20 rounded-full bg-chip-active flex items-center justify-center mb-6 border border-hairline/20 text-ink/60">
            <MessageSquareText className="size-8" />
          </div>
          <h4 className="font-body text-xl font-bold text-ink">{t("msg.noneSelected")}</h4>
          <p className="mt-3 text-sm leading-relaxed text-muted font-light">
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
          ? "bg-panel-warm/60 text-muted border-hairline/30 border-dashed"
          : message.isOwn
            ? "ml-auto bg-ink text-paper border-ink/20 rounded-tr-sm"
            : "bg-paper text-ink border-hairline/20 rounded-tl-sm",
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
            message.isOwn && !message.isHidden ? "text-paper/72" : "text-ink/54"
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
  const t = useT();

  return (
    <div className="bg-card/80 border border-hairline/40 relative flex flex-col overflow-hidden">
      {thread ? (
        <>
          <div className="p-6 sm:px-8 space-y-4 border-b border-hairline/20 shrink-0 bg-card/50 z-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <div className="flex size-14 items-center justify-center rounded-full bg-linear-to-br from-ink/20 to-ink/5 border border-ink/20 text-sm font-body font-bold text-ink">
                    {initials(thread.conversation.user.name)}
                  </div>
                  <div>
                    <h3 className="font-body text-xl font-medium text-ink">
                      {thread.conversation.user.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge tone={roleTone(thread.conversation.user.role)}>
                        {thread.conversation.user.role}
                      </Badge>
                      <span className="text-sm text-ink/60">
                        {thread.conversation.user.isOnline ? "Online" : "Offline"}
                      </span>
                    </div>
                  </div>
                </div>
                {typingConversationId === thread.conversation.id ? (
                  <p className="text-sm text-ink/62">
                    {thread.conversation.user.name} is typing...
                  </p>
                ) : null}
              </div>
              <div className="flex w-full items-center gap-3 md:max-w-md">
                <Input
                  placeholder={t("msg.search")}
                  value={messageSearch}
                  onChange={(event) => onMessageSearchChange(event.target.value)}
                  className="h-11 bg-panel-warm/50 border-hairline/30"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 shrink-0"
                  onClick={() => onReport(thread.conversation.id)}
                >
                  <ShieldAlert className="mr-2 size-4" />{t("msg.report")}</Button>
              </div>
            </div>
          </div>
          <div className="flex-1 flex flex-col p-6 sm:px-8 overflow-hidden">
            {thread.nextCursor ? (
              <Button type="button" variant="outline" onClick={onLoadOlder}>{t("msg.loadOlder")}</Button>
            ) : null}

            <div
              ref={messagesViewportRef}
              className="flex-1 flex flex-col gap-4 overflow-y-auto bg-panel-warm/30 border border-hairline/10 p-6 scroll-smooth"
            >
              {isLoadingThread ? (
                <MessageThreadSkeleton />
              ) : visibleMessages.length > 0 ? (
                visibleMessages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))
              ) : (
                <div className="bg-panel-warm/50 border border-hairline/20 p-6 text-sm leading-7 text-muted font-light text-center">{t("msg.noMatch")}</div>
              )}
            </div>

            <div className="bg-panel-warm/50 border border-hairline/20 p-4 mt-6 shrink-0">
              <Textarea
                placeholder={t("msg.placeholder")}
                className="min-h-24 bg-paper border-transparent focus-visible:ring-0 resize-none text-base p-4"
                value={composerValue}
                onChange={(event) => onComposerChange(event.target.value)}
              />
              <div className="mt-4 flex items-center justify-between gap-3 px-2">
                <p className="text-xs text-muted font-light">{t("msg.permanent")}</p>
                <Button
                  type="button"
                  className="rounded-full px-6 h-12 font-body font-semibold"
                  disabled={isSending || composerValue.trim().length === 0}
                  onClick={onSend}
                >
                  <SendHorizontal className="mr-2 size-4" />{t("msg.send")}</Button>
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
