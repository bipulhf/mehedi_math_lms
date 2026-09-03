import { useEffect, useRef } from "react";

export interface ExamFocusGuardOptions {
  /** Only true while an MCQ paper is actually open and answerable. */
  enabled: boolean;
  /**
   * The tab was hidden or the window lost focus and the page is still alive,
   * so the ordinary submit can run: it can await the server, show a message
   * and navigate to the result.
   */
  onLeave: () => void;
  /**
   * The document is being torn down — a closed tab, a reload, a navigation
   * out of the app. Nothing awaited here will finish, so this is the
   * best-effort shot with a `keepalive` request behind it.
   */
  onUnload: () => void;
}

/**
 * Watches an MCQ paper for the student leaving it.
 *
 * Three events, because the browser reports leaving in three different ways
 * and no one of them covers the others:
 *
 * - `visibilitychange` is the tab being switched away from or the window
 *   minimised. It is also what fires first when a tab is closed.
 * - `blur` is another window taking focus while this one stays visible — a
 *   second monitor, a chat app over the top, devtools.
 * - `pagehide` is the document going away, and the only one of the three where
 *   an awaited request will not survive.
 *
 * **What this cannot tell apart is a screen that switched itself off.** The
 * platform reports a locked screen as a hidden document, exactly like a
 * switched tab, and there is no signal underneath that separates them. An exam
 * meant to be sat in one sitting is the trade this makes.
 */
export function useExamFocusGuard({ enabled, onLeave, onUnload }: ExamFocusGuardOptions): void {
  // The callbacks change identity every render; the listeners must not be torn
  // down and rebuilt for that, or a visibility change during the gap is missed.
  const onLeaveRef = useRef(onLeave);
  const onUnloadRef = useRef(onUnload);
  const hasLeftRef = useRef(false);

  useEffect(() => {
    onLeaveRef.current = onLeave;
    onUnloadRef.current = onUnload;
  }, [onLeave, onUnload]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    hasLeftRef.current = false;

    const leave = (): void => {
      if (hasLeftRef.current) {
        return;
      }

      hasLeftRef.current = true;
      onLeaveRef.current();
    };

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === "hidden") {
        leave();
      }
    };

    const handleUnload = (): void => {
      // Deliberately not behind `hasLeftRef`: the ordinary submit may have
      // started a moment ago and died with the page, and this is the request
      // built to outlive it.
      onUnloadRef.current();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", leave);
    window.addEventListener("pagehide", handleUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", leave);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, [enabled]);
}
