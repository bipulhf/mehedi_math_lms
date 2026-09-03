import { apiPost } from "@/src/lib/api-client";

/**
 * Tells the API which handset is holding the current session.
 *
 * Only the Google flow needs this. Every other way in creates its session on a
 * request this app made, which already carries the device header; Google's is
 * created inside an in-app browser that carries none of them, and a session
 * with no device on it spends one of the account's two slots as an unknown
 * one. ADR-0019.
 */
export async function claimSessionDevice(): Promise<void> {
  await apiPost<undefined, { claimed: boolean }>("auth/device");
}
