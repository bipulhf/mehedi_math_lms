import type { JSX } from "react";

import { uploadBugScreenshot } from "@/lib/api/uploads";
import { FileUploader } from "@/components/uploads/file-uploader";

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
  return (
    <FileUploader
      accept="image/*"
      buttonLabel="Upload screenshot"
      description="Optional, but helpful when reporting layout issues, runtime errors, or broken interactions."
      error={error}
      id={id}
      label="Screenshot URL"
      previewAlt="Bug screenshot preview"
      previewMode="image"
      successMessage="Screenshot uploaded"
      value={value}
      onUploadFile={(file, onProgress) => uploadBugScreenshot(file, onProgress)}
      onValueChange={onValueChange}
    />
  );
}
