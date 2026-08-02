import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { mobileEnv } from "@/src/lib/env";
import { readSessionCookie } from "@/src/lib/session-store";

/**
 * Certificates and receipts, which the API returns as a PDF body rather than
 * as JSON — so they cannot go through `api-client.ts`.
 *
 * They also cannot simply be opened in the browser: the session cookie lives in
 * this app's keychain and is replayed per request, so a browser opened from
 * here arrives signed out and gets a 401. The file is downloaded with the
 * cookie attached and then handed to the OS share sheet, which is the shape a
 * phone expects for "save this" anyway.
 */

export type DocumentKind = "certificate" | "receipt";

/** Written to the cache directory: the share sheet copies what it keeps. */
function targetFor(kind: DocumentKind, enrollmentId: string): File {
  return new File(new Directory(Paths.cache), `${kind}-${enrollmentId}.pdf`);
}

export async function shareEnrollmentDocument(
  kind: DocumentKind,
  enrollmentId: string
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device.");
  }

  const cookie = await readSessionCookie();

  if (cookie === null) {
    throw new Error("Sign in again to download this document.");
  }

  const target = targetFor(kind, enrollmentId);

  if (target.exists) {
    // A second tap should not fail on an existing file, and the document does
    // not change once the enrolment has settled.
    target.delete();
  }

  const downloaded = await File.downloadFileAsync(
    `${mobileEnv.apiBaseUrl}/enrollments/${enrollmentId}/${kind}`,
    target,
    { headers: { Cookie: cookie } }
  );

  await Sharing.shareAsync(downloaded.uri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf"
  });
}
