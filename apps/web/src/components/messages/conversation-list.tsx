import { Wifi, WifiOff } from "lucide-react";
import type { JSX } from "react";

import { initials, roleTone } from "@/components/messages/message-presentation";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { MessageConversation, MessageParticipant } from "@/lib/api/messages";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale-context";

/** The inbox pane: connection state, search, participant lookup, and the threads. */
export function ConversationList({
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

  return (
    <div className="bg-card/80 border border-hairline/40 relative flex flex-col overflow-hidden group">
      <div className="p-6 sm:p-8 space-y-6 shrink-0 border-b border-hairline/20">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-body text-2xl font-medium tracking-tight text-ink">{t("msg.inbox")}</h3>
            <p className="mt-2 text-xs text-muted font-light leading-relaxed">{t("msg.inboxLead")}</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-panel-warm/50 border border-hairline/20 px-3 py-2 text-xs text-ink/68">
            {isSocketConnected ? (
              <Wifi className="size-3.5 text-emerald-600" />
            ) : (
              <WifiOff className="size-3.5 text-rose-600" />
            )}
            <span>{isSocketConnected ? "Live" : "Offline"}</span>
          </div>
        </div>
        <Input
          placeholder={t("msg.searchConversations")}
          value={conversationSearch}
          onChange={(event) => onConversationSearchChange(event.target.value)}
          className="h-12 bg-panel-warm/50 border-hairline/30"
        />
        <div className="space-y-3 bg-panel-warm/40 border border-hairline/20 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-ink/54">{t("msg.startNew")}</p>
          <Input
            placeholder={currentUserRole === "STUDENT" ? "Find a teacher" : "Find a student"}
            value={participantSearch}
            onChange={(event) => onParticipantSearchChange(event.target.value)}
            className="h-10 bg-paper border-hairline/30"
          />
          {participantResults.length > 0 ? (
            <div className="space-y-2">
              {participantResults.map((participant) => (
                <button
                  key={participant.id}
                  type="button"
                  className="flex w-full items-center justify-between bg-paper px-4 py-3 text-left transition-colors hover:bg-chip-active border border-hairline/10"
                  onClick={() => onStartConversation(participant.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-chip-active text-sm font-semibold text-ink">
                      {initials(participant.name)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">{participant.name}</p>
                      <p className="text-xs text-ink/60">
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
        {conversations.length > 0 ? (
          conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              className={cn(
                "w-full rounded-3xl px-4 py-4 text-left transition-all duration-300 ease-out border",
                selectedConversationId === conversation.id
                  ? "bg-paper border-hairline/40 shadow-md ring-1 ring-ink/10"
                  : "bg-card/50 border-transparent hover:bg-panel-warm/80 hover:border-hairline/20 hover:shadow-sm"
              )}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-ink">
                      {conversation.user.name}
                    </span>
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        conversation.user.isOnline ? "bg-emerald-500" : "bg-slate-300"
                      )}
                    />
                  </div>
                  <p className="mt-1 truncate text-sm text-ink/62">
                    {conversation.lastMessage?.content ?? "No messages yet"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {conversation.lastMessageAt ? (
                    <span className="text-[0.7rem] text-ink/50">
                      {new Date(conversation.lastMessageAt).toLocaleDateString()}
                    </span>
                  ) : null}
                  {conversation.unreadCount > 0 ? (
                    <Badge tone="neutral">{conversation.unreadCount}</Badge>
                  ) : null}
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="bg-panel-warm/50 border border-hairline/20 p-6 text-sm leading-7 text-muted font-light text-center">{t("msg.noConversations")}</div>
        )}
      </div>
    </div>
  );
}
