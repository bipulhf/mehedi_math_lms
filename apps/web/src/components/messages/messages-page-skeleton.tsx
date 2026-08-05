import type { JSX } from "react";

import { ConversationListSkeleton } from "@/components/common/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The two-pane shape of the messages page, drawn before the session resolves.
 *
 * The container is the real page's, `dvh` and all: `vh` on a phone measures the
 * viewport with the browser chrome retracted, so a `100vh` pane is taller than
 * the screen until the address bar hides. Below `xl` there is one pane, matching
 * the page, which shows the list until a conversation is opened.
 */
export function MessagesPageSkeleton(): JSX.Element {
  return (
    <div className="grid h-[calc(100dvh-11rem)] min-h-125 grid-cols-1 gap-4 xl:h-[calc(100dvh-9rem)] xl:grid-cols-[22rem_minmax(0,1fr)] xl:gap-6">
      <div className="flex min-h-0 flex-col overflow-hidden border border-hairline bg-card">
        <div className="shrink-0 space-y-4 border-b border-hairline p-4 sm:p-5">
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-11 w-full" />
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <ConversationListSkeleton rows={5} />
        </div>
      </div>

      {/* The thread pane only exists from `xl`; below it the list fills the
          screen and a conversation replaces it on tap. */}
      <div className="hidden min-h-0 flex-col overflow-hidden border border-hairline bg-card xl:flex">
        <div className="shrink-0 space-y-3 border-b border-hairline p-4 sm:p-5">
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-4 sm:p-5">
          <Skeleton className="h-20 w-[75%]" />
          <Skeleton className="ml-auto h-20 w-[70%]" />
          <Skeleton className="h-20 w-[75%]" />
        </div>
      </div>
    </div>
  );
}
