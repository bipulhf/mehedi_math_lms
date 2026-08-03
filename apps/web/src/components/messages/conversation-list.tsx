import { Wifi, WifiOff } from "lucide-react";
import type { JSX } from "react";

import { initials, roleTone } from "@/components/messages/message-presentation";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { MessageConversation, MessageParticipant } from "@/lib/api/messages";
import { cn } from "@/lib/utils";

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
  return (
    <div className="bg-surface-container-lowest/80 border border-outline-variant/40 relative flex flex-col overflow-hidden group">
      <div className="p-6 sm:p-8 space-y-6 shrink-0 border-b border-outline-variant/20">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-body text-2xl font-medium tracking-tight text-on-surface">
              Inbox
            </h3>
            <p className="mt-2 text-xs text-on-surface-variant font-light leading-relaxed">
              Quiet, direct conversations with live delivery and read states.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-surface-container-low/50 border border-outline-variant/20 px-3 py-2 text-xs text-on-surface/68">
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
          onChange={(event) => onConversationSearchChange(event.target.value)}
          className="h-12 bg-surface-container-low/50 border-outline-variant/30"
        />
        <div className="space-y-3 bg-surface-container-low/40 border border-outline-variant/20 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface/54">
            Start new
          </p>
          <Input
            placeholder={currentUserRole === "STUDENT" ? "Find a teacher" : "Find a student"}
            value={participantSearch}
            onChange={(event) => onParticipantSearchChange(event.target.value)}
            className="h-10 bg-surface border-outline-variant/30"
          />
          {participantResults.length > 0 ? (
            <div className="space-y-2">
              {participantResults.map((participant) => (
                <button
                  key={participant.id}
                  type="button"
                  className="flex w-full items-center justify-between bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-container-highest border border-outline-variant/10"
                  onClick={() => onStartConversation(participant.id)}
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
        {conversations.length > 0 ? (
          conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              className={cn(
                "w-full rounded-3xl px-4 py-4 text-left transition-all duration-300 ease-out border",
                selectedConversationId === conversation.id
                  ? "bg-surface border-outline-variant/40 shadow-md ring-1 ring-primary/10"
                  : "bg-surface-container-lowest/50 border-transparent hover:bg-surface-container-low/80 hover:border-outline-variant/20 hover:shadow-sm"
              )}
              onClick={() => onSelectConversation(conversation.id)}
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
          <div className="bg-surface-container-low/50 border border-outline-variant/20 p-6 text-sm leading-7 text-on-surface-variant font-light text-center">
            No conversations yet. Start a teacher-student chat from the search panel above.
          </div>
        )}
      </div>
    </div>
  );
}
