import { maxScriptPagesPerAnswer } from "@genex/shared";
import type { ChangeEvent, JSX } from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-context";
import type { ScriptPageView } from "@/lib/api/tests";
import { addScriptPage, removeScriptPage, reorderScriptPages } from "@/lib/api/tests";
import { uploadAnswerScriptPage } from "@/lib/api/uploads";
import { prepareScriptPage, type PageRotation } from "@/lib/script-capture";

interface AnswerScriptUploaderProps {
  onPagesChange: (pages: readonly ScriptPageView[]) => void;
  pages: readonly ScriptPageView[];
  questionId: string;
  submissionId: string;
}

function nextRotation(rotation: PageRotation): PageRotation {
  return (((rotation + 90) % 360) as PageRotation);
}

/**
 * The student's Answer Script for one question: photograph a page, straighten
 * it, put the pages in the order you wrote them, take one back if it came out
 * unreadable.
 *
 * Rotation is applied before the upload rather than stored as a property,
 * because no original is kept — the page is stored the way it is turned here
 * (ADR-0009). Rotating after upload therefore re-uploads.
 */
export function AnswerScriptUploader({
  onPagesChange,
  pages,
  questionId,
  submissionId
}: AnswerScriptUploaderProps): JSX.Element {
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingRotation, setPendingRotation] = useState<PageRotation>(0);
  const [isBusy, setIsBusy] = useState(false);
  const isFull = pages.length >= maxScriptPagesPerAnswer;

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    setIsBusy(true);

    try {
      let latestPages = pages;

      for (const file of files.slice(0, maxScriptPagesPerAnswer - pages.length)) {
        const prepared = await prepareScriptPage(file, pendingRotation);
        const upload = await uploadAnswerScriptPage(prepared.file);
        latestPages = await addScriptPage(submissionId, {
          questionId,
          uploadId: upload.id
        });
      }

      onPagesChange(latestPages);
      setPendingRotation(0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("script.uploadFailed"));
    } finally {
      setIsBusy(false);
    }
  };

  const movePage = async (pageId: string, direction: -1 | 1): Promise<void> => {
    const currentIndex = pages.findIndex((page) => page.id === pageId);
    const targetIndex = currentIndex + direction;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= pages.length) {
      return;
    }

    const reordered = [...pages];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved!);
    setIsBusy(true);

    try {
      onPagesChange(
        await reorderScriptPages(submissionId, {
          pageIds: reordered.map((page) => page.id),
          questionId
        })
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("script.reorderFailed"));
    } finally {
      setIsBusy(false);
    }
  };

  const deletePage = async (pageId: string): Promise<void> => {
    setIsBusy(true);

    try {
      await removeScriptPage(pageId);
      onPagesChange(pages.filter((page) => page.id !== pageId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("script.removeFailed"));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          accept="image/*"
          capture="environment"
          className="hidden"
          multiple
          type="file"
          onChange={(event) => void handleFiles(event)}
        />
        <Button
          disabled={isBusy || isFull}
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          {pages.length === 0 ? t("script.addFirstPage") : t("script.addAnotherPage")}
        </Button>
        <Button
          disabled={isBusy || isFull}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => setPendingRotation(nextRotation)}
        >
          {t("script.rotateNext")}
          {pendingRotation === 0 ? "" : ` ${pendingRotation}°`}
        </Button>
        <span className="text-xs text-ink/62">
          {t("script.pagesOf", { count: pages.length, total: maxScriptPagesPerAnswer })}
        </span>
      </div>

      {pages.length === 0 ? (
        <p className="rounded-[var(--radius)] border border-dashed border-hairline bg-panel-warm p-6 text-center text-sm text-ink/62">
          {t("script.empty")}
        </p>
      ) : (
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page, index) => (
            <li
              key={page.id}
              className="space-y-2 rounded-[var(--radius)] border border-hairline bg-panel-warm p-2"
            >
              <img
                alt={t("script.page", { number: index + 1 })}
                className="block w-full rounded-[calc(var(--radius)-0.125rem)]"
                src={page.fileUrl}
              />
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-ink">
                  {t("script.page", { number: index + 1 })}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    aria-label={t("script.moveEarlier")}
                    disabled={isBusy || index === 0}
                    size="xs"
                    type="button"
                    variant="outline"
                    onClick={() => void movePage(page.id, -1)}
                  >
                    ←
                  </Button>
                  <Button
                    aria-label={t("script.moveLater")}
                    disabled={isBusy || index === pages.length - 1}
                    size="xs"
                    type="button"
                    variant="outline"
                    onClick={() => void movePage(page.id, 1)}
                  >
                    →
                  </Button>
                  <Button
                    disabled={isBusy}
                    size="xs"
                    type="button"
                    variant="outline"
                    onClick={() => void deletePage(page.id)}
                  >
                    {t("script.remove")}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
