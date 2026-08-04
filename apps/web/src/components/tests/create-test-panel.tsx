import type { JSX } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import type { CreateTestInput } from "@/lib/api/tests";
import { useT } from "@/lib/i18n/locale-context";

interface CreateTestPanelProps {
  draft: CreateTestInput;
  isWorking: boolean;
  onChange: (draft: CreateTestInput) => void;
  onCreate: () => void;
}

/**
 * The "new test" form inside a chapter's card in `AssessmentBuilder`. Split
 * out purely because the parent file was pushing the repo's 800-line ceiling
 * — this block only ever reads and writes one chapter's draft, a clean seam.
 */
export function CreateTestPanel({
  draft,
  isWorking,
  onChange,
  onCreate
}: CreateTestPanelProps): JSX.Element {
  const t = useT();

  return (
    <div className="grid gap-2 rounded-[calc(var(--radius)-0.125rem)] border border-dashed border-hairline bg-panel-warm p-3">
      <Label className="text-[0.62rem] font-bold uppercase tracking-widest text-ink/60">{t("ab.newTitle")}</Label>
      <Input
        className="h-10"
        placeholder="e.g. Chapter Quiz 1"
        value={draft.title}
        onChange={(event) => onChange({ ...draft, title: event.target.value })}
      />
      <div className="grid gap-2 md:grid-cols-4">
        <Select
          className="h-10"
          value={draft.type}
          onChange={(event) =>
            onChange({ ...draft, type: event.target.value as CreateTestInput["type"] })
          }
        >
          <option value="MCQ">{t("ab.mcq")}</option>
          <option value="WRITTEN">{t("ab.written")}</option>
          <option value="MIXED">{t("ab.mixed")}</option>
        </Select>
        <Input
          className="h-10"
          min={1}
          placeholder={t("ab.duration")}
          type="number"
          value={draft.durationInMinutes ?? ""}
          onChange={(event) => onChange({ ...draft, durationInMinutes: Number(event.target.value) })}
        />
        <Input
          className="h-10"
          min={0}
          placeholder={t("ab.passScore")}
          type="number"
          value={draft.passingScore ?? ""}
          onChange={(event) => onChange({ ...draft, passingScore: Number(event.target.value) })}
        />
        <Input
          className="h-10"
          min={1}
          placeholder={t("ab.maxAttempts")}
          title={t("ab.maxAttemptsHint")}
          type="number"
          value={draft.maxAttempts ?? ""}
          onChange={(event) =>
            onChange({
              ...draft,
              maxAttempts: event.target.value === "" ? null : Number(event.target.value)
            })
          }
        />
      </div>
      <RichTextEditor
        placeholder={t("ab.instruction")}
        value={draft.description ?? ""}
        onChange={(value) => onChange({ ...draft, description: value })}
      />
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-xs text-ink/75">
          <input
            checked={draft.isPublished}
            className="h-4 w-4 accent-(--secondary-container)"
            type="checkbox"
            onChange={(event) => onChange({ ...draft, isPublished: event.target.checked })}
          />
          <span>{t("ab.publishNow")}</span>
        </label>
        <label className="flex items-center gap-2 text-xs text-ink/75" title={t("ab.lockAnswerOnSelectHint")}>
          <input
            checked={draft.lockAnswerOnSelect}
            className="h-4 w-4 accent-(--secondary-container)"
            type="checkbox"
            onChange={(event) => onChange({ ...draft, lockAnswerOnSelect: event.target.checked })}
          />
          <span>{t("ab.lockAnswerOnSelect")}</span>
        </label>
      </div>
      <Button className="h-10" disabled={isWorking} type="button" onClick={onCreate}>
        {t("ab.createTest")}
      </Button>
    </div>
  );
}
