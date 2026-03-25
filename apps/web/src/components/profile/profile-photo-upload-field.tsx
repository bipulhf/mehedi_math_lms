import type { ChangeEvent, JSX } from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { uploadProfilePhoto } from "@/lib/api/profiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsUploading(true);

    try {
      const uploadedUrl = await uploadProfilePhoto(file);
      onValueChange(uploadedUrl);
      toast.success("Profile photo uploaded");
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : "Profile photo upload failed");
    } finally {
      event.target.value = "";
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="url"
        value={value}
        error={error}
        onChange={(event) => onValueChange(event.target.value)}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          type="file"
          onChange={(event) => void handleFileChange(event)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled || isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? <span className="h-4 w-16 rounded-full bg-on-surface/10" aria-hidden="true" /> : null}
          {isUploading ? "Uploading image" : "Upload from device"}
        </Button>
        <p className="text-sm leading-6 text-on-surface/62">
          Uploads directly to S3, then stores the returned public URL in your profile.
        </p>
      </div>
      {value ? (
        <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-3">
          <img alt="Profile preview" className="h-24 w-24 rounded-(--radius) object-cover" src={value} />
        </div>
      ) : null}
    </div>
  );
}
