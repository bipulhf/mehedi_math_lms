import Cropper, { type Area } from "react-easy-crop";
import type { ChangeEvent, DragEvent, JSX } from "react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ImageCropUploaderProps {
  aspect: number;
  buttonLabel?: string | undefined;
  description?: string | undefined;
  disabled?: boolean | undefined;
  error?: string | undefined;
  id?: string | undefined;
  label: string;
  onUploadFile: (file: File, onProgress: (progress: number) => void) => Promise<string>;
  onValueChange: (value: string) => void;
  previewAlt?: string | undefined;
  successMessage?: string | undefined;
  value: string;
}

interface CropModalState {
  file: File;
  sourceUrl: string;
}

function readImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load the selected image"));
    image.src = url;
  });
}

async function createCroppedFile(file: File, sourceUrl: string, cropArea: Area): Promise<File> {
  const image = await readImage(sourceUrl);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Image cropping is not available in this browser");
  }

  canvas.width = cropArea.width;
  canvas.height = cropArea.height;
  context.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    cropArea.width,
    cropArea.height
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error("Unable to crop the selected image"));
          return;
        }

        resolve(result);
      },
      file.type || "image/jpeg",
      0.92
    );
  });

  return new File([blob], file.name, {
    lastModified: Date.now(),
    type: blob.type
  });
}

export function ImageCropUploader({
  aspect,
  buttonLabel = "Choose image",
  description,
  disabled = false,
  error,
  id,
  label,
  onUploadFile,
  onValueChange,
  previewAlt,
  successMessage,
  value
}: ImageCropUploaderProps): JSX.Element {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [cropArea, setCropArea] = useState<Area | null>(null);
  const [cropModal, setCropModal] = useState<CropModalState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [zoom, setZoom] = useState(1);

  const clearCropModal = (): void => {
    if (cropModal) {
      URL.revokeObjectURL(cropModal.sourceUrl);
    }

    setCrop({ x: 0, y: 0 });
    setCropArea(null);
    setCropModal(null);
    setZoom(1);
  };

  const openCropModal = (file: File): void => {
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }

    clearCropModal();
    setCropModal({
      file,
      sourceUrl: URL.createObjectURL(file)
    });
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    openCropModal(file);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (!file) {
      return;
    }

    openCropModal(file);
  };

  const handleConfirmCrop = async (): Promise<void> => {
    if (!cropModal || !cropArea) {
      toast.error("Adjust the crop area before uploading");
      return;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      const croppedFile = await createCroppedFile(cropModal.file, cropModal.sourceUrl, cropArea);
      const nextValue = await onUploadFile(croppedFile, setProgress);
      onValueChange(nextValue);
      clearCropModal();

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

  return (
    <div className="space-y-3">
      <Label htmlFor={inputId}>{label}</Label>
      <Input id={inputId} type="url" value={value} error={error} onChange={(event) => onValueChange(event.target.value)} />
      <input
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        disabled={disabled || isUploading}
        type="file"
        onChange={handleInputChange}
      />
      <button
        className={`w-full rounded-[calc(var(--radius)-0.125rem)] border border-dashed px-4 py-5 text-left transition-colors ${
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
        onDrop={handleDrop}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex min-h-10 items-center rounded-(--radius) border border-outline-variant px-4 text-sm font-medium text-on-surface">
            {isUploading ? "Uploading..." : buttonLabel}
          </span>
          <p className="text-sm leading-6 text-on-surface/70">
            {description ?? "Drag an image here or choose one from your device."}
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
      {value ? (
        <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-3">
          <img alt={previewAlt ?? "Upload preview"} className="max-h-64 rounded-(--radius) object-contain" src={value} />
        </div>
      ) : null}
      {cropModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-4xl rounded-(--radius) border border-outline-variant bg-surface p-4 shadow-[0_32px_80px_rgba(0,0,0,0.3)]">
            <div className="space-y-4">
              <div className="relative h-[55vh] overflow-hidden rounded-(--radius) bg-black">
                <Cropper
                  aspect={aspect}
                  crop={crop}
                  image={cropModal.sourceUrl}
                  zoom={zoom}
                  onCropChange={setCrop}
                  onCropComplete={(_, croppedAreaPixels) => setCropArea(croppedAreaPixels)}
                  onZoomChange={setZoom}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${inputId}-zoom`}>Zoom</Label>
                <input
                  id={`${inputId}-zoom`}
                  className="w-full accent-(--secondary-container)"
                  max={3}
                  min={1}
                  step={0.05}
                  type="range"
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                />
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                <Button type="button" variant="outline" disabled={isUploading} onClick={clearCropModal}>
                  Cancel
                </Button>
                <Button type="button" disabled={isUploading} onClick={() => void handleConfirmCrop()}>
                  {isUploading ? "Uploading..." : "Crop and upload"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
