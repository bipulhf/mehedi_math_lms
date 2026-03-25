import { PDFViewer, pdf } from "@react-pdf/renderer";
import type { JSX } from "react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { CertificatePdfDocument } from "@/components/certificates/certificate-pdf-document";

export interface CertificatePreviewDialogProps {
  courseTitle: string;
  enrollmentId: string;
  issuedAt: Date;
  onClose: () => void;
  studentName: string;
  title: string;
}

export function CertificatePreviewDialog({
  courseTitle,
  enrollmentId,
  issuedAt,
  onClose,
  studentName,
  title
}: CertificatePreviewDialogProps): JSX.Element {
  const certificateDoc = useMemo(
    () => (
      <CertificatePdfDocument
        courseTitle={courseTitle}
        issuedAt={issuedAt}
        studentName={studentName}
      />
    ),
    [courseTitle, issuedAt, studentName]
  );

  const handleDownload = (): void => {
    void (async () => {
      const blob = await pdf(
        <CertificatePdfDocument
          courseTitle={courseTitle}
          issuedAt={issuedAt}
          studentName={studentName}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const anchor = globalThis.document.createElement("a");      anchor.href = url;
      anchor.download = `certificate-${enrollmentId}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    })();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-highest shadow-lg">
        <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-4 py-3">
          <p className="font-semibold text-on-surface">{title}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={handleDownload}>
              Download
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
        <div className="min-h-[70vh] flex-1 bg-[#e5e5e5]">
          <PDFViewer
            className="h-[70vh] w-full border-0"
            showToolbar={false}
            style={{ height: "70vh", width: "100%" }}
          >
            {certificateDoc}
          </PDFViewer>
        </div>
      </div>
    </div>
  );
}
