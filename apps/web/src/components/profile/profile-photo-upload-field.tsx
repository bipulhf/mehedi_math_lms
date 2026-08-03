import type { JSX } from "react";

import { uploadProfilePhoto } from "@/lib/api/profiles";
import { ImageCropUploader } from "@/components/uploads/image-crop-uploader";
import { useT } from "@/lib/i18n/locale-context";

interface ProfilePhotoUploadFieldProps {
  disabled?: boolean;
  error?: string | undefined;
  id: string;
  label: string;
  onValueChange: (value: string) => void;
  value: string;
}

export function ProfilePhotoUploadField({
  disabled = false,
  error,
  id,
  label,
  onValueChange,
  value
}: ProfilePhotoUploadFieldProps): JSX.Element {
  const t = useT();

  return (
    <ImageCropUploader
      aspect={1}
      buttonLabel="Choose profile photo"
      description={t("upload.cropHint")}
      disabled={disabled}
      error={error}
      id={id}
      label={label}
      previewAlt="Profile preview"
      successMessage="Profile photo uploaded"
      value={value}
      onUploadFile={(file, onProgress) => uploadProfilePhoto(file, onProgress)}
      onValueChange={onValueChange}
    />
  );
}
