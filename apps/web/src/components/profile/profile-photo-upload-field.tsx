import type { JSX } from "react";

import { uploadProfilePhoto } from "@/lib/api/profiles";
import { ImageCropUploader } from "@/components/uploads/image-crop-uploader";

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
  return (
    <ImageCropUploader
      aspect={1}
      buttonLabel="Choose profile photo"
      description="Crop before upload so the profile and teacher cards stay clean across the platform."
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
