import type { JSX } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Switch } from "@/components/ui/switch";
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
          onValueChange={(next) => onChange({ ...draft, type: next as CreateTestInput["type"] })}
          options={[
            { label: t("ab.mcq"), value: "MCQ" },
            { label: t("ab.written"), value: "WRITTEN" }
          ]}
          value={draft.type}
        />
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
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:gap-8">
        <Switch
          disabled={isWorking}
          label={t("ab.publishNow")}
          onChange={(checked) => onChange({ ...draft, isPublished: checked })}
          value={draft.isPublished}
        />
        <Switch
          description={t("ab.lockAnswerOnSelectHint")}
          disabled={isWorking}
          label={t("ab.lockAnswerOnSelect")}
          onChange={(checked) => onChange({ ...draft, lockAnswerOnSelect: checked })}
          value={draft.lockAnswerOnSelect}
        />
      </div>
      <Button className="h-10" disabled={isWorking} type="button" onClick={onCreate}>
        {t("ab.createTest")}
      </Button>
    </div>
  );
}
