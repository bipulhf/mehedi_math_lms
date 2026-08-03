import type { JSX } from "react";

import { uploadBugScreenshot } from "@/lib/api/uploads";
import { FileUploader } from "@/components/uploads/file-uploader";
import { useT } from "@/lib/i18n/locale-context";

interface BugScreenshotUploadFieldProps {
  error?: string | undefined;
  id: string;
  onValueChange: (value: string) => void;
  value: string;
}

export function BugScreenshotUploadField({
  error,
  id,
  onValueChange,
  value
}: BugScreenshotUploadFieldProps): JSX.Element {
  const t = useT();

  return (
    <FileUploader
      accept="image/*"
      buttonLabel="Upload screenshot"
      description={t("misc.screenshotHint")}
      error={error}
      id={id}
      label={t("misc.screenshotUrl")}
      previewAlt="Bug screenshot preview"
      previewMode="image"
      successMessage="Screenshot uploaded"
      value={value}
      onUploadFile={(file, onProgress) => uploadBugScreenshot(file, onProgress)}
      onValueChange={onValueChange}
    />
  );
}
