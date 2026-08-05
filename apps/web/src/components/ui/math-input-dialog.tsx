import { mathSymbolGroups } from "@genex/shared";
import type { MessageKey } from "@genex/i18n";
import { Search } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { renderMathToHtml } from "@/lib/katex";
import { useT } from "@/lib/i18n/locale-context";

interface MathInputDialogProps {
  /** Pre-filled when a formula is being edited rather than added. */
  initialLatex?: string | undefined;
  onClose: () => void;
  /**
   * Receives the LaTeX and how it should sit. The caller decides how to put it
   * into its own document — a string handed to TipTap would be parsed as HTML,
   * and `$x < y$` would be read as the start of a tag.
   */
  onInsert: (latex: string, isDisplay: boolean) => void;
  open: boolean;
}

/** KaTeX marks a formula it cannot read; that is what decides the error line. */
function renderPreview(latex: string, isDisplay: boolean): { html: string; isValid: boolean } {
  const html = renderMathToHtml(latex, isDisplay);

  return { html, isValid: !html.includes("katex-error") };
}

/**
 * Where a teacher writes a formula.
 *
 * A dialog rather than inline editing, for one reason: the source is what gets
 * stored, so it has to be visible and correctable, and a preview has to sit
 * beside it. Typing `$x^2$` straight into the editor keeps working — this is
 * the way in for somebody who does not know LaTeX, which is why the palette is
 * here rather than hidden behind another control.
 */
export function MathInputDialog({
  initialLatex,
  onClose,
  onInsert,
  open
}: MathInputDialogProps): JSX.Element {
  const t = useT();
  const [latex, setLatex] = useState("");
  const [isDisplay, setIsDisplay] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setLatex(initialLatex ?? "");
    setIsDisplay(false);
    setSearch("");
  }, [initialLatex, open]);

  const groups = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (query.length === 0) {
      return mathSymbolGroups;
    }

    return mathSymbolGroups
      .map((group) => ({
        ...group,
        symbols: group.symbols.filter(
          (symbol) =>
            symbol.label.toLowerCase().includes(query) ||
            symbol.snippet.toLowerCase().includes(query)
        )
      }))
      .filter((group) => group.symbols.length > 0);
  }, [search]);

  const trimmed = latex.trim();
  const preview = trimmed.length === 0 ? null : renderPreview(trimmed, isDisplay);

  const insert = (): void => {
    if (trimmed.length === 0) {
      return;
    }

    onInsert(trimmed, isDisplay);
  };

  return (
    <Modal className="max-w-2xl" onClose={onClose} open={open} title={t("math.insert")}>
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="math-latex">{t("math.latex")}</Label>
          <Textarea
            autoFocus
            className="min-h-24 font-mono text-sm"
            id="math-latex"
            onChange={(event) => setLatex(event.target.value)}
            onKeyDown={(event) => {
              // Enter inserts; the field is one formula, not a paragraph.
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                insert();
              }
            }}
            placeholder={t("math.latexPlaceholder")}
            value={latex}
          />
          <p className="text-xs text-muted-light">{t("math.hint")}</p>
        </div>

        <Switch
          description={t("math.displayModeHint")}
          label={t("math.displayMode")}
          onChange={setIsDisplay}
          value={isDisplay}
        />

        <div className="space-y-2">
          <p className="label-mono text-xs uppercase text-muted-faint">{t("math.preview")}</p>
          <div className="min-h-16 border border-hairline bg-paper px-4 py-3">
            {preview === null ? (
              <p className="text-sm text-muted-faint">{t("math.empty")}</p>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: preview.html }} />
            )}
          </div>
          {preview?.isValid === false ? (
            <p className="text-sm text-error">{t("math.invalid")}</p>
          ) : null}
        </div>

        <div className="space-y-3 border-t border-hairline pt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="label-mono text-xs uppercase text-muted-faint">{t("math.symbols")}</p>
            <div className="relative sm:w-64">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-5 z-10 size-4 -translate-y-1/2 text-muted-faint"
              />
              <Input
                aria-label={t("math.searchSymbols")}
                className="pl-9"
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("math.searchSymbols")}
                value={search}
              />
            </div>
          </div>

          <div className="max-h-56 space-y-4 overflow-y-auto pr-1">
            {groups.length === 0 ? (
              <p className="text-sm text-muted-light">{t("math.noSymbols")}</p>
            ) : (
              groups.map((group) => (
                <div className="space-y-2" key={group.groupKey}>
                  <p className="text-xs text-muted-light">{t(group.groupKey as MessageKey)}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.symbols.map((symbol) => (
                      <button
                        className="min-h-9 min-w-9 border border-hairline bg-card px-2 text-sm text-ink transition-colors hover:border-accent hover:text-accent"
                        key={symbol.snippet}
                        // Appended rather than spliced at the caret: the field is
                        // short and a teacher is building one formula left to right.
                        onClick={() => setLatex((current) => `${current}${symbol.snippet} `)}
                        title={symbol.snippet}
                        type="button"
                      >
                        {symbol.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button className="w-full sm:w-auto" onClick={onClose} type="button" variant="outline">
            {t("action.cancel")}
          </Button>
          <Button
            className="w-full sm:w-auto"
            disabled={trimmed.length === 0}
            onClick={insert}
            type="button"
          >
            {t("math.insertAction")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
