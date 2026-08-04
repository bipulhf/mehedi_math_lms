import type { JSX } from "react";

import { initials, roleTone } from "@/components/messages/message-presentation";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import type { MessageConversation, MessageParticipant } from "@/lib/api/messages";
import { cn } from "@/lib/utils";
import { useFormat, useT } from "@/lib/i18n/locale-context";

/** Green when online, muted when not — see `--color-online` in `app.css`. */
function PresenceDot({ isOnline }: { isOnline: boolean }): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={cn("size-2 shrink-0 rounded-full", isOnline ? "bg-online" : "bg-dot-idle")}
    />
  );
}

/** The inbox pane: connection state, search, participant lookup, and the threads. */
export function ConversationList({
  className,
  conversations,
  conversationSearch,
  currentUserRole,
  isSocketConnected,
  onConversationSearchChange,
  onParticipantSearchChange,
  onSelectConversation,
  onStartConversation,
  participantResults,
  participantSearch,
  selectedConversationId
}: {
  className?: string | undefined;
  conversations: readonly MessageConversation[];
  conversationSearch: string;
  currentUserRole: string | null;
  isSocketConnected: boolean;
  onConversationSearchChange: (value: string) => void;
  onParticipantSearchChange: (value: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onStartConversation: (participantId: string) => void;
  participantResults: readonly MessageParticipant[];
  participantSearch: string;
  selectedConversationId: string | null;
}): JSX.Element {
  const t = useT();
  const format = useFormat();

  return (
    <div
      className={cn(
        "min-h-0 min-w-0 flex-col overflow-hidden border border-hairline bg-card",
        className
      )}
    >
      <div className="shrink-0 space-y-4 border-b border-hairline p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-medium text-ink">{t("msg.inbox")}</h2>
            <p className="mt-1 text-sm font-light leading-relaxed text-muted">
              {t("msg.inboxLead")}
            </p>
          </div>
          <span
            className={cn(
              "label-mono inline-flex shrink-0 items-center gap-2 rounded-[var(--radius-pill)] border border-hairline px-2.5 py-1 text-[11px] uppercase",
              isSocketConnected ? "text-muted" : "text-accent"
            )}
          >
            <PresenceDot isOnline={isSocketConnected} />
            {isSocketConnected ? t("msg.live") : t("msg.reconnecting")}
          </span>
        </div>

        <Input
          onChange={(event) => onConversationSearchChange(event.target.value)}
          placeholder={t("msg.searchConversations")}
          value={conversationSearch}
        />

        <div className="space-y-3 border border-hairline bg-panel-warm p-3">
          <p className="label-mono text-[11px] uppercase text-muted-light">{t("msg.startNew")}</p>
          <Input
            onChange={(event) => onParticipantSearchChange(event.target.value)}
            placeholder={currentUserRole === "STUDENT" ? t("msg.findTeacher") : t("msg.findStudent")}
            value={participantSearch}
          />
          {participantResults.length > 0 ? (
            <ul className="border-t border-hairline-faint">
              {participantResults.map((participant) => (
                <li key={participant.id}>
                  <button
                    className="flex w-full min-h-12 items-center justify-between gap-3 border-b border-hairline-faint bg-card px-3 py-2.5 text-left transition-colors hover:bg-row-hover"
                    onClick={() => onStartConversation(participant.id)}
                    type="button"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="label-mono flex size-9 shrink-0 items-center justify-center rounded-full bg-placeholder-fill text-xs text-muted-light">
                        {initials(participant.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-base text-ink">
                          {participant.name}
                        </span>
                        <span className="flex items-center gap-1.5 text-sm text-muted-light">
                          <PresenceDot isOnline={participant.isOnline} />
                          {participant.isOnline ? t("msg.online") : t("msg.offline")}
                        </span>
                      </span>
                    </span>
                    <Badge tone={roleTone(participant.role)}>{participant.role}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {conversations.length > 0 ? (
          <ul>
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <button
                  aria-current={selectedConversationId === conversation.id ? "true" : undefined}
                  className={cn(
                    "flex w-full min-h-16 items-start gap-3 border-b border-hairline-faint px-4 py-3 text-left transition-colors",
                    selectedConversationId === conversation.id
                      ? "bg-chip-active"
                      : "bg-card hover:bg-row-hover"
                  )}
                  onClick={() => onSelectConversation(conversation.id)}
                  type="button"
                >
                  <span className="label-mono mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-placeholder-fill text-xs text-muted-light">
                    {initials(conversation.user.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <PresenceDot isOnline={conversation.user.isOnline} />
                      <span className="truncate text-base font-medium text-ink">
                        {conversation.user.name}
                      </span>
                    </span>
                    <span className="mt-1 block truncate text-sm font-light text-muted">
                      {conversation.lastMessage?.content ?? t("msg.noMessagesYet")}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1.5">
                    {conversation.lastMessageAt ? (
                      <span className="text-xs text-muted-faint">
                        {format.date(conversation.lastMessageAt)}
                      </span>
                    ) : null}
                    {conversation.unreadCount > 0 ? (
                      <span className="label-mono rounded-[var(--radius-pill)] bg-accent px-2 py-0.5 text-[11px] text-paper">
                        {format.number(conversation.unreadCount)}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState className="m-4" message={t("msg.noConversations")} />
        )}
      </div>
    </div>
  );
}
