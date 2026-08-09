import { bijoyToUnicode, isBijoyEncoded } from "@mma/shared";
import type { ClipboardEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useT } from "@/lib/i18n/locale-context";

const STORAGE_KEY = "mma.bijoy.auto-convert";

/**
 * Whether pasted Bijoy is converted without being asked.
 *
 * A preference rather than a constant, and stored per browser: a teacher who
 * composes in SutonnyMJ wants it on for every field for months, and one who
 * never does should be able to turn it off once. Defaults to on, because the
 * detector only fires on text no English sentence produces.
 */
export function useBijoyAutoConvert(): {
  isEnabled: boolean;
  setEnabled: (value: boolean) => void;
} {
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    // Read after mount: the server has no localStorage, and reading during
    // render would make the first client paint disagree with the server's.
    setIsEnabled(window.localStorage.getItem(STORAGE_KEY) !== "off");
  }, []);

  const setEnabled = useCallback((value: boolean): void => {
    setIsEnabled(value);
    window.localStorage.setItem(STORAGE_KEY, value ? "on" : "off");
  }, []);

  return { isEnabled, setEnabled };
}

/**
 * Convert Bijoy pasted into a plain `<input>`.
 *
 * The rich text editor has its own handler through ProseMirror; this is for the
 * fields that are plain strings — an MCQ option — where the value has to be
 * spliced at the caret by hand and the caret put back afterwards, or the cursor
 * jumps to the end of a line the teacher was editing in the middle of.
 */
export function useBijoyPaste(
  value: string,
  onChange: (next: string) => void
): (event: ClipboardEvent<HTMLInputElement>) => void {
  const t = useT();
  const { isEnabled } = useBijoyAutoConvert();

  return useCallback(
    (event: ClipboardEvent<HTMLInputElement>) => {
      if (!isEnabled) {
        return;
      }

      const pasted = event.clipboardData.getData("text/plain");

      if (!isBijoyEncoded(pasted)) {
        return;
      }

      event.preventDefault();

      const input = event.currentTarget;
      const start = input.selectionStart ?? value.length;
      const end = input.selectionEnd ?? start;
      const converted = bijoyToUnicode(pasted, { convertDigits: false });
      const previous = value;

      onChange(value.slice(0, start) + converted + value.slice(end));

      // A conversion is a guess, so it is always undoable — and the browser's
      // own undo stack is gone once the value was set from React.
      toast.success(t("bijoy.converted"), {
        action: { label: t("bijoy.undo"), onClick: () => onChange(previous) }
      });

      requestAnimationFrame(() => {
        const caret = start + converted.length;

        input.setSelectionRange(caret, caret);
      });
    },
    [isEnabled, onChange, t, value]
  );
}
