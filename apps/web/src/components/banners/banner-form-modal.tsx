import type { JSX } from "react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Banner } from "@/lib/api/banners";
import { useT } from "@/lib/i18n/locale-context";

export interface BannerFormValues {
  isActive: boolean;
  linkLabel: string;
  linkUrl: string;
  message: string;
}

interface BannerFormModalProps {
  banner: Banner | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: BannerFormValues) => void;
  open: boolean;
}

export function BannerFormModal({
  banner,
  isSaving,
  onClose,
  onSubmit,
  open
}: BannerFormModalProps): JSX.Element {
  const t = useT();
  const [message, setMessage] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setMessage(banner?.message ?? "");
    setLinkUrl(banner?.linkUrl ?? "");
    setLinkLabel(banner?.linkLabel ?? "");
    setIsActive(banner?.isActive ?? true);
    setError(null);
  }, [banner, open]);

  const submit = (): void => {
    if (message.trim().length === 0) {
      setError(t("admin.banner.message"));

      return;
    }

    setError(null);
    onSubmit({ isActive, linkLabel: linkLabel.trim(), linkUrl: linkUrl.trim(), message });
  };

  return (
    <Modal
      className="max-w-xl"
      onClose={onClose}
      open={open}
      title={banner ? t("admin.banner.editTitle") : t("admin.banner.createTitle")}
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="banner-message">{t("admin.banner.message")}</Label>
          <Textarea
            error={error ?? undefined}
            id="banner-message"
            maxLength={500}
            onChange={(event) => setMessage(event.target.value)}
            value={message}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="banner-link-url">{t("admin.banner.linkUrl")}</Label>
            <Input
              id="banner-link-url"
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="https://…"
              type="url"
              value={linkUrl}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="banner-link-label">{t("admin.banner.linkLabel")}</Label>
            <Input
              id="banner-link-label"
              maxLength={100}
              onChange={(event) => setLinkLabel(event.target.value)}
              value={linkLabel}
            />
          </div>
        </div>

        <Switch disabled={isSaving} label={t("admin.banner.active")} onChange={setIsActive} value={isActive} />

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button className="w-full sm:w-auto" onClick={onClose} type="button" variant="outline">
            {t("action.cancel")}
          </Button>
          <Button className="w-full sm:w-auto" disabled={isSaving} type="submit">
            {t("action.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
