import { createFileRoute } from "@tanstack/react-router";
import { EyeOff, ShieldAlert, ShieldCheck } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ConversationReport, ReportedConversationThread } from "@/lib/api/moderation";
import {
  hideConversationMessage,
  listConversationReports,
  resolveConversationReport,
  reviewReportedConversation
} from "@/lib/api/moderation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/admin/message-reports")({
  component: AdminMessageReportsPage,
  errorComponent: RouteErrorView
} as never);

function roleTone(role: ConversationReport["reporter"]["role"]): "blue" | "gray" | "green" | "violet" {
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

function ReportQueueSkeleton(): JSX.Element {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden">
        <Skeleton className="h-8 w-56 mb-4 bg-surface-container-highest" />
        <Skeleton className="h-4 w-full max-w-lg bg-surface-container-highest mb-8" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-3xl bg-surface-container-highest" />
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminMessageReportsPage(): JSX.Element {
  const [reports, setReports] = useState<readonly ConversationReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ConversationReport | null>(null);
  const [thread, setThread] = useState<ReportedConversationThread | null>(null);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [pendingMessageId, setPendingMessageId] = useState<string | null>(null);
  const [resolvingReportId, setResolvingReportId] = useState<string | null>(null);

  const refreshReports = async (): Promise<void> => {
    setIsLoading(true);

    try {
      setReports(await listConversationReports());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshReports();
  }, []);

  /**
   * Opening a conversation writes an access-log row on the server, so it is an
   * explicit click and never a hover preview or a background prefetch. ADR-0004.
   */
  const handleReview = async (report: ConversationReport): Promise<void> => {
    setSelectedReport(report);
    setIsLoadingThread(true);

    try {
      setThread(await reviewReportedConversation(report.conversationId));
    } finally {
      setIsLoadingThread(false);
    }
  };

  const handleHide = async (messageId: string): Promise<void> => {
    setPendingMessageId(messageId);

    try {
      const hidden = await hideConversationMessage(messageId);

      setThread((current) =>
        current
          ? {
              ...current,
              items: current.items.map((message) =>
                message.id === messageId ? { ...message, isHidden: true } : message
              )
            }
          : current
      );
      toast.success("Message hidden from both participants.");

      return void hidden;
    } finally {
      setPendingMessageId(null);
    }
  };

  /**
   * Resolving closes the report, and with it the admin's right to read the
   * conversation. The thread is dropped from view at the same moment.
   */
  const handleResolve = async (report: ConversationReport): Promise<void> => {
    setResolvingReportId(report.id);

    try {
      await resolveConversationReport(report.id);
      toast.success("Report resolved. This conversation is private again.");

      if (selectedReport?.id === report.id) {
        setSelectedReport(null);
        setThread(null);
      }

      await refreshReports();
    } finally {
      setResolvingReportId(null);
    }
  };

  if (isLoading) {
    return <ReportQueueSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[26rem_minmax(0,1fr)]">
      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl border border-outline-variant/40 shadow-xl relative overflow-hidden">
        <div className="border-b border-outline-variant/20 p-6 sm:p-8">
          <h3 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">
            Reported conversations
          </h3>
          <p className="mt-2 text-xs font-light leading-relaxed text-on-surface-variant">
            An open report is the only thing that lets you read a private conversation. Every read is
            recorded against your account.
          </p>
        </div>

        <div className="space-y-3 p-4">
          {reports.length === 0 ? (
            <div className="rounded-3xl border border-outline-variant/20 bg-surface-container-low/50 p-6 text-center text-sm font-light leading-7 text-on-surface-variant">
              Nothing to review. No conversation has an open report.
            </div>
          ) : (
            reports.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => void handleReview(report)}
                className={cn(
                  "w-full rounded-3xl border p-5 text-left transition-colors",
                  selectedReport?.id === report.id
                    ? "border-primary/40 bg-primary/5"
                    : "border-outline-variant/20 bg-surface-container-low/40 hover:bg-surface-container-low/70"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="size-4 shrink-0 text-error" />
                    <span className="font-headline text-sm font-bold text-on-surface">
                      {report.reporter.name}
                    </span>
                    <Badge tone={roleTone(report.reporter.role)}>{report.reporter.role}</Badge>
                  </div>
                  <span className="shrink-0 text-[0.7rem] text-on-surface/50">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-on-surface-variant">
                  {report.reason}
                </p>
                <p className="mt-3 text-[0.7rem] uppercase tracking-widest text-on-surface/50">
                  {report.participants.map((participant) => participant.name).join(" and ")}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl border border-outline-variant/40 shadow-xl relative overflow-hidden">
        {selectedReport ? (
          <>
            <div className="flex flex-col gap-4 border-b border-outline-variant/20 p-6 sm:p-8 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="font-headline text-xl font-extrabold text-on-surface">
                  {selectedReport.participants.map((participant) => participant.name).join(" and ")}
                </h3>
                <p className="mt-2 max-w-2xl text-sm font-light leading-relaxed text-on-surface-variant">
                  Reported by {selectedReport.reporter.name} on{" "}
                  {formatTimestamp(selectedReport.createdAt)}: {selectedReport.reason}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                disabled={resolvingReportId === selectedReport.id}
                onClick={() => void handleResolve(selectedReport)}
              >
                <ShieldCheck className="mr-2 size-4" />
                Resolve report
              </Button>
            </div>

            <div className="space-y-4 p-6 sm:p-8">
              {isLoadingThread ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton
                      key={index}
                      className="h-20 w-2/3 rounded-3xl bg-surface-container-highest"
                    />
                  ))}
                </div>
              ) : thread && thread.items.length > 0 ? (
                thread.items.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "rounded-3xl border p-5 shadow-sm",
                      message.isHidden
                        ? "border-dashed border-outline-variant/40 bg-surface-container-low/60"
                        : "border-outline-variant/20 bg-surface"
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-headline text-sm font-bold text-on-surface">
                          {message.sender.name}
                        </span>
                        <Badge tone={roleTone(message.sender.role)}>{message.sender.role}</Badge>
                        {message.isHidden ? <Badge tone="gray">Hidden</Badge> : null}
                      </div>
                      <span className="text-[0.7rem] text-on-surface/50">
                        {formatTimestamp(message.createdAt)}
                      </span>
                    </div>

                    {/* The original text, retained on purpose: hiding stops the harm, it does not erase it. */}
                    <p className="mt-3 text-sm leading-7 text-on-surface">{message.content}</p>

                    {message.isHidden ? (
                      <p className="mt-3 text-xs font-light text-on-surface-variant">
                        Participants see a placeholder in place of this message. You are seeing the
                        original.
                      </p>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-4"
                        disabled={pendingMessageId === message.id}
                        onClick={() => void handleHide(message.id)}
                      >
                        <EyeOff className="mr-2 size-4" />
                        Hide from participants
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-outline-variant/20 bg-surface-container-low/50 p-6 text-center text-sm font-light leading-7 text-on-surface-variant">
                  This conversation has no messages.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-12 text-center">
            <div className="mb-6 flex size-20 items-center justify-center rounded-full border border-outline-variant/20 bg-surface-container-highest text-on-surface/60 shadow-md">
              <ShieldAlert className="size-8" />
            </div>
            <h4 className="font-headline text-xl font-bold text-on-surface">No report selected</h4>
            <p className="mt-3 max-w-md text-sm font-light leading-relaxed text-on-surface-variant">
              Choose a report to read the conversation it concerns. Opening it is logged.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
