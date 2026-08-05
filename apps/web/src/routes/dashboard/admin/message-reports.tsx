import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { EyeOff, ShieldAlert, ShieldCheck } from "lucide-react";
import type { JSX } from "react";
import { useState } from "react";
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
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/admin/message-reports")({
  head: () =>
    seo({
      description: "Conversations flagged for review by a student or teacher.",
      path: "/dashboard/admin/message-reports",
      title: "Message Reports"
    }),
  component: AdminMessageReportsPage,
  errorComponent: RouteErrorView
} as never);

function roleTone(role: ConversationReport["reporter"]["role"]): "neutral" | "quiet" | "neutral" | "neutral" {
  if (role === "TEACHER") {
    return "neutral";
  }

  if (role === "STUDENT") {
    return "neutral";
  }

  if (role === "ADMIN") {
    return "neutral";
  }

  return "quiet";
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}

function ReportQueueSkeleton(): JSX.Element {
  return (
    <div className="space-y-8">
      <div className="bg-card p-4 sm:p-6 lg:p-8 border border-hairline relative w-full overflow-hidden">
        <Skeleton className="h-8 w-56 mb-4" />
        <Skeleton className="h-4 w-full max-w-lg mb-8" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminMessageReportsPage(): JSX.Element {
  const t = useT();

  const queryClient = useQueryClient();
  const { data: reports = [], isPending: isLoading } = useQuery<readonly ConversationReport[]>({
    queryFn: async () => listConversationReports(),
    queryKey: queryKeys.moderation.reports()
  });
  const [selectedReport, setSelectedReport] = useState<ConversationReport | null>(null);
  // The thread is deliberately not a query: fetching it writes an access-log
  // row, so it must never be refetched on a window focus or a cache revalidation.
  const [thread, setThread] = useState<ReportedConversationThread | null>(null);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [pendingMessageId, setPendingMessageId] = useState<string | null>(null);
  const [resolvingReportId, setResolvingReportId] = useState<string | null>(null);

  const refreshReports = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.moderation.reports() });
  };

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
      toast.success(t("rep.messageHidden"));

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
      toast.success(t("rep.resolved"));

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
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
      <div className="border border-hairline bg-card">
        <div className="border-b border-hairline p-5">
          <h1 className="text-xl font-medium text-ink">{t("rep.title")}</h1>
          <p className="mt-0.5 text-xs font-light text-muted">
            An open report is the only thing that lets you read a private conversation. Every read is recorded against your account.
          </p>
        </div>

        <div className="space-y-2 p-3">
          {reports.length === 0 ? (
            <div className="border border-hairline bg-panel-warm/40 p-4 text-center text-xs font-light text-muted">{t("rep.empty")}</div>
          ) : (
            reports.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => void handleReview(report)}
                className={cn(
                  "w-full border p-3.5 text-left transition-colors cursor-pointer",
                  selectedReport?.id === report.id
                    ? "border-ink bg-panel-warm"
                    : "border-hairline bg-card hover:bg-panel-warm/50"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="size-4 shrink-0 text-error" />
                    <span className="text-sm font-medium text-ink">
                      {report.reporter.name}
                    </span>
                    <Badge tone={roleTone(report.reporter.role)}>{report.reporter.role}</Badge>
                  </div>
                  <span className="shrink-0 text-xs text-muted-faint">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs font-light text-muted">
                  {report.reason}
                </p>
                <p className="mt-2 text-xs font-medium text-ink/70">
                  {report.participants.map((participant) => participant.name).join(" and ")}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="border border-hairline bg-card">
        {selectedReport ? (
          <>
            <div className="flex flex-col gap-3 border-b border-hairline p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-medium text-ink">
                  {selectedReport.participants.map((participant) => participant.name).join(" and ")}
                </h2>
                <p className="mt-0.5 max-w-2xl text-xs font-light text-muted">
                  Reported by {selectedReport.reporter.name} on{" "}
                  {formatTimestamp(selectedReport.createdAt)}: {selectedReport.reason}
                </p>
              </div>
              <Button
                disabled={resolvingReportId === selectedReport.id}
                onClick={() => void handleResolve(selectedReport)}
                size="sm"
                type="button"
                variant="outline"
              >
                <ShieldCheck className="mr-1.5 size-4" />{t("rep.resolve")}</Button>
            </div>

            <div className="space-y-3 p-5">
              {isLoadingThread ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton
                      className="h-16 w-2/3"
                      key={index}
                    />
                  ))}
                </div>
              ) : thread && thread.items.length > 0 ? (
                thread.items.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "border p-4",
                      message.isHidden
                        ? "border-dashed border-hairline bg-panel-warm/60"
                        : "border-hairline bg-card"
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-ink">
                          {message.sender.name}
                        </span>
                        <Badge tone={roleTone(message.sender.role)}>{message.sender.role}</Badge>
                        {message.isHidden ? <Badge tone="quiet">{t("rep.hidden")}</Badge> : null}
                      </div>
                      <span className="text-xs text-muted-faint">
                        {formatTimestamp(message.createdAt)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-ink">{message.content}</p>

                    {message.isHidden ? (
                      <p className="mt-2 text-xs font-light text-muted-faint">
                        Participants see a placeholder in place of this message. You are seeing the original.
                      </p>
                    ) : (
                      <Button
                        className="mt-3"
                        disabled={pendingMessageId === message.id}
                        onClick={() => void handleHide(message.id)}
                        size="xs"
                        type="button"
                        variant="outline"
                      >
                        <EyeOff className="mr-1 size-3.5" />{t("rep.hide")}</Button>
                    )}
                  </div>
                ))
              ) : (
                <div className="border border-hairline bg-panel-warm/40 p-4 text-center text-xs font-light text-muted">{t("rep.noMessages")}</div>
              )}
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-6 sm:p-10 lg:p-12 text-center">
            <div className="mb-4 flex size-14 items-center justify-center border border-hairline bg-panel-warm text-ink">
              <ShieldAlert className="size-6 text-muted-faint" />
            </div>
            <h2 className="text-lg font-medium text-ink">{t("rep.noneSelected")}</h2>
            <p className="mt-1 max-w-xs text-xs font-light text-muted">{t("rep.pick")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
