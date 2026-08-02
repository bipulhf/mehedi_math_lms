import type { JSX } from "react";

import { ConversationListSkeleton } from "@/components/common/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** The two-pane shape of the messages page, drawn before the session resolves. */
export function MessagesPageSkeleton(): JSX.Element {
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
        <div className="flex-1 overflow-y-auto">
          <ConversationListSkeleton rows={5} />
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
