import type { ChangeEvent, JSX } from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { uploadBugScreenshot } from "@/lib/api/uploads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsUploading(true);

    try {
      const nextUrl = await uploadBugScreenshot(file);
      onValueChange(nextUrl);
      toast.success("Screenshot uploaded");
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : "Screenshot upload failed");
    } finally {
      event.target.value = "";
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Label htmlFor={id}>Screenshot URL</Label>
      <Input id={id} type="url" value={value} error={error} onChange={(event) => onValueChange(event.target.value)} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          type="file"
          onChange={(event) => void handleChange(event)}
        />
        <Button type="button" variant="outline" disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
          {isUploading ? <span className="h-4 w-16 rounded-full bg-on-surface/10" aria-hidden="true" /> : null}
          {isUploading ? "Uploading image" : "Upload screenshot"}
        </Button>
        <p className="text-sm leading-6 text-on-surface/62">
          Optional, but helpful when reporting layout issues, runtime errors, or broken interactions.
        </p>
      </div>
      {value ? (
        <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-3">
          <img alt="Bug screenshot preview" className="max-h-64 rounded-(--radius) object-contain" src={value} />
        </div>
      ) : null}
    </div>
  );
}
