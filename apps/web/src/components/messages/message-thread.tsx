import { ArrowLeft, EyeOff, SendHorizontal, ShieldAlert } from "lucide-react";
import type { JSX, RefObject } from "react";

import { MessageThreadSkeleton } from "@/components/common/skeletons";
import { formatTimestamp, initials, roleTone } from "@/components/messages/message-presentation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { MessageConversationThread } from "@/lib/api/messages";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale-context";

type ThreadMessage = MessageConversationThread["items"][number];

/** Shown while no thread is selected — desktop only; a phone shows the inbox. */
function EmptyThreadPane({ currentUserRole }: { currentUserRole: string | null }): JSX.Element {
  const t = useT();

  return (
    <>
      <div className="shrink-0 space-y-1 border-b border-hairline p-4 sm:p-5">
        <h2 className="text-xl font-medium text-ink">{t("msg.workspace")}</h2>
        <p className="text-sm font-light text-muted">{t("msg.pick")}</p>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-4 sm:p-8">
        <EmptyState
          className="w-full max-w-lg"
          message={
            currentUserRole === "STUDENT" ? t("msg.noneSelectedStudent") : t("msg.noneSelectedTeacher")
          }
        />
      </div>
    </>
  );
}

/**
 * Own messages are ink on paper, the other side is paper on ink's hairline —
 * square corners, no shadow, no gradient. DESIGN.md §5, §6.
 */
function MessageBubble({ message }: { message: ThreadMessage }): JSX.Element {
  const t = useT();

  return (
    <div
      className={cn(
        "max-w-[85%] border px-4 py-3 sm:max-w-[75%]",
        message.isHidden
          ? "border-dashed border-dot-idle bg-panel-warm text-muted"
          : message.isOwn
            ? "ml-auto border-brand-cyan bg-brand-cyan text-action-foreground"
            : "border-hairline bg-card text-ink",
        message.isHidden && message.isOwn ? "ml-auto" : undefined
      )}
    >
      <div className="space-y-2">
        {message.isHidden ? (
          <p className="flex items-start gap-2 text-base font-light italic leading-relaxed">
            <EyeOff className="mt-1 size-4 shrink-0" />
            {message.content}
          </p>
        ) : (
          <p className="whitespace-pre-wrap text-base font-light leading-relaxed">
            {message.content}
          </p>
        )}
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs",
            message.isOwn && !message.isHidden ? "text-paper/70" : "text-muted-light"
          )}
        >
          <span>{formatTimestamp(message.createdAt)}</span>
          <span>
            {message.isOwn ? (message.readAt ? t("msg.seen") : t("msg.sent")) : message.sender.name}
          </span>
        </div>
      </div>
    </div>
  );
}

/** The right-hand pane: thread header, message list, and composer. */
export function MessageThread({
  className,
  composerValue,
  currentUserRole,
  isLoadingThread,
  isSending,
  messageSearch,
  messagesViewportRef,
  onBack,
  onComposerChange,
  onLoadOlder,
  onMessageSearchChange,
  onReport,
  onSend,
  thread,
  typingConversationId,
  visibleMessages
}: {
  className?: string | undefined;
  composerValue: string;
  currentUserRole: string | null;
  isLoadingThread: boolean;
  isSending: boolean;
  messageSearch: string;
  messagesViewportRef: RefObject<HTMLDivElement | null>;
  /** Returns to the inbox on the master-detail breakpoint. */
  onBack: () => void;
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
    <div
      className={cn(
        "min-h-0 min-w-0 flex-col overflow-hidden border border-hairline bg-card",
        className
      )}
    >
      {thread ? (
        <>
          <div className="shrink-0 space-y-3 border-b border-hairline p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  aria-label={t("action.back")}
                  className="inline-flex size-11 shrink-0 items-center justify-center border border-hairline text-ink transition-colors hover:border-line-strong xl:hidden"
                  onClick={onBack}
                  type="button"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <span className="label-mono flex size-11 shrink-0 items-center justify-center rounded-full bg-placeholder-fill text-sm text-muted-light">
                  {initials(thread.conversation.user.name)}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-medium text-ink">
                    {thread.conversation.user.name}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge tone={roleTone(thread.conversation.user.role)}>
                      {thread.conversation.user.role}
                    </Badge>
                    <span className="text-sm text-muted-light">
                      {typingConversationId === thread.conversation.id
                        ? t("msg.typing", { name: thread.conversation.user.name })
                        : thread.conversation.user.isOnline
                          ? t("msg.online")
                          : t("msg.offline")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex w-full items-start gap-3 lg:max-w-sm">
                <div className="min-w-0 flex-1">
                  <Input
                    onChange={(event) => onMessageSearchChange(event.target.value)}
                    placeholder={t("msg.search")}
                    value={messageSearch}
                  />
                </div>
                <Button
                  className="h-11 shrink-0"
                  onClick={() => onReport(thread.conversation.id)}
                  type="button"
                  variant="outline"
                >
                  <ShieldAlert className="size-4" />
                  <span className="hidden sm:inline">{t("msg.report")}</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 p-4 sm:p-5">
            {thread.nextCursor ? (
              <Button
                className="shrink-0 self-center"
                onClick={onLoadOlder}
                size="sm"
                type="button"
                variant="outline"
              >
                {t("msg.loadOlder")}
              </Button>
            ) : null}

            <div
              className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto border border-hairline bg-panel-warm p-3 sm:p-4"
              ref={messagesViewportRef}
            >
              {isLoadingThread ? (
                <MessageThreadSkeleton />
              ) : visibleMessages.length > 0 ? (
                visibleMessages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))
              ) : (
                <EmptyState className="my-auto" message={t("msg.noMatch")} />
              )}
            </div>

            <div className="shrink-0 space-y-3 border border-hairline bg-panel-warm p-3 sm:p-4">
              <Textarea
                className="min-h-20 bg-card sm:min-h-24"
                onChange={(event) => onComposerChange(event.target.value)}
                onKeyDown={(event) => {
                  // Enter sends, Shift+Enter breaks the line — the convention
                  // every chat the reader already uses follows.
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    onSend();
                  }
                }}
                placeholder={t("msg.placeholder")}
                value={composerValue}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-light text-muted-light">{t("msg.permanent")}</p>
                <Button
                  className="h-11 shrink-0"
                  disabled={isSending || composerValue.trim().length === 0}
                  onClick={onSend}
                  type="button"
                >
                  <SendHorizontal className="size-4" />
                  {t("msg.send")}
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
