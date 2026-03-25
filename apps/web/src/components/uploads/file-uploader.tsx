import type { ChangeEvent, DragEvent, JSX } from "react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FileUploaderProps {
  accept?: string | undefined;
  buttonLabel?: string | undefined;
  description?: string | undefined;
  disabled?: boolean | undefined;
  error?: string | undefined;
  id?: string | undefined;
  label: string;
  onUploadFile: (file: File, onProgress: (progress: number) => void) => Promise<string>;
  onValueChange: (value: string) => void;
  previewAlt?: string | undefined;
  previewMode?: "image" | "none";
  successMessage?: string | undefined;
  value: string;
}

export function FileUploader({
  accept,
  buttonLabel = "Choose file",
  description,
  disabled = false,
  error,
  id,
  label,
  onUploadFile,
  onValueChange,
  previewAlt,
  previewMode = "none",
  successMessage,
  value
}: FileUploaderProps): JSX.Element {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (file: File): Promise<void> => {
    setIsUploading(true);
    setProgress(0);

    try {
      const nextValue = await onUploadFile(file, setProgress);
      onValueChange(nextValue);

      if (successMessage) {
        toast.success(successMessage);
      }
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const handleInputChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    await uploadFile(file);
    event.target.value = "";
  };

  const handleDrop = async (event: DragEvent<HTMLButtonElement>): Promise<void> => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (!file) {
      return;
    }

    await uploadFile(file);
  };

  return (
    <div className="space-y-3">
      <Label htmlFor={inputId}>{label}</Label>
      <Input id={inputId} type="url" value={value} error={error} onChange={(event) => onValueChange(event.target.value)} />
      <input
        ref={fileInputRef}
        accept={accept}
        className="hidden"
        disabled={disabled || isUploading}
        type="file"
        onChange={(event) => void handleInputChange(event)}
      />
      <button
        className={`group w-full rounded-[calc(var(--radius)-0.125rem)] border border-dashed px-4 py-5 text-left transition-colors ${
          isDragging
            ? "border-secondary-container bg-secondary-container/10"
            : "border-outline-variant bg-surface-container-low hover:bg-surface-container"
        } ${disabled || isUploading ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
        disabled={disabled || isUploading}
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDrop={(event) => void handleDrop(event)}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex min-h-10 items-center rounded-(--radius) border border-outline-variant px-4 text-sm font-medium text-on-surface">
            {isUploading ? "Uploading..." : buttonLabel}
          </span>
          <p className="text-sm leading-6 text-on-surface/70">
            {description ?? "Drag a file here or choose one from your device."}
          </p>
        </div>
        {isUploading ? (
          <div className="mt-4 space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
              <div
                className="h-full rounded-full bg-secondary-container transition-[width] duration-200 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs uppercase tracking-[0.18em] text-on-surface/62">{progress}% uploaded</p>
          </div>
        ) : null}
      </button>
      {previewMode === "image" && value ? (
        <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-3">
          <img alt={previewAlt ?? "Upload preview"} className="max-h-64 rounded-(--radius) object-contain" src={value} />
        </div>
      ) : null}
    </div>
  );
}
