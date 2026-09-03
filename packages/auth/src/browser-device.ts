const storageKey = "mma.device-id";

/**
 * This browser's id, minted once and kept. It is what the two-device limit
 * counts, so the only property that matters is that it is the same string on
 * the next sign-in — not that it is unforgeable. Somebody willing to edit
 * local storage to look like a different browser is not the person a limit of
 * two devices is written for; they are the person the conflict log is.
 *
 * Cleared storage means a new id, which costs one of the account's two slots
 * until the old session expires. That is the honest trade for not
 * fingerprinting anybody.
 */
export function readBrowserDeviceId(): string | null {
  if (typeof globalThis.localStorage === "undefined") {
    return null;
  }

  try {
    const existing = globalThis.localStorage.getItem(storageKey);

    if (existing !== null && existing.length > 0) {
      return existing;
    }

    const minted = globalThis.crypto.randomUUID();

    globalThis.localStorage.setItem(storageKey, minted);

    return minted;
  } catch {
    // Private mode, a blocked origin, a full quota. A sign-in without an id
    // still works -- it just counts as a device of its own.
    return null;
  }
}
