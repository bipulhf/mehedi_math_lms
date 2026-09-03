import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

export interface ExamFocusGuardOptions {
  /** Only true while an MCQ paper is actually open and answerable. */
  enabled: boolean;
  onLeave: () => void;
}

/**
 * Whether a state change is the student leaving their paper.
 *
 * `background` only, deliberately. iOS also reports `inactive` for things that
 * are not leaving at all — the notification shade pulled halfway down, an
 * incoming call banner, the app switcher being peeked at — and submitting
 * somebody's exam because a message arrived is the worse failure of the two.
 *
 * Exported and pure because it is the part with a decision in it; the
 * subscription around it is wiring.
 */
export function isLeavingAppState(state: AppStateStatus): boolean {
  return state === "background";
}

/**
 * The app's half of the MCQ exam rule: leaving the paper submits it.
 *
 * **A screen that switches itself off is reported as `background` too**, and
 * there is nothing underneath `AppState` that separates the two. An exam meant
 * to be sat in one sitting is the trade this makes; the web guard makes the
 * same one for a locked screen.
 */
export function useExamFocusGuard({ enabled, onLeave }: ExamFocusGuardOptions): void {
  // The callback changes identity every render, and re-subscribing for that
  // would drop a state change that lands in the gap.
  const onLeaveRef = useRef(onLeave);
  const hasLeftRef = useRef(false);

  useEffect(() => {
    onLeaveRef.current = onLeave;
  }, [onLeave]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    hasLeftRef.current = false;

    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (!isLeavingAppState(state) || hasLeftRef.current) {
        return;
      }

      hasLeftRef.current = true;
      onLeaveRef.current();
    });

    return () => {
      subscription.remove();
    };
  }, [enabled]);
}
