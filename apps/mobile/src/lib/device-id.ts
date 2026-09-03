import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { deviceIdMaxLength, type DevicePlatform } from "@genex/shared";

const DEVICE_ID_KEY = "genex.device-id";

let cachedDeviceId: string | null | undefined;

/**
 * A random string, not a fingerprint. The two-device limit needs an id that is
 * the same one next launch; it does not need one nobody could forge, and
 * anything that tried would be reading hardware identifiers off a student's
 * phone to police a password.
 *
 * `expo-crypto` is deliberately not a dependency of this: a native module and
 * a rebuild is a high price for 128 bits nobody is attacking.
 */
function mintDeviceId(): string {
  const random = (): string => Math.random().toString(36).slice(2, 12);

  return `${Date.now().toString(36)}-${random()}${random()}`.slice(0, deviceIdMaxLength);
}

/**
 * Kept in SecureStore rather than AsyncStorage for one property: on iOS the
 * keychain survives a reinstall, so a student who deletes and reinstalls the
 * app comes back as the same device instead of spending a second slot.
 */
export async function readDeviceId(): Promise<string> {
  if (cachedDeviceId !== undefined && cachedDeviceId !== null) {
    return cachedDeviceId;
  }

  try {
    const stored = await SecureStore.getItemAsync(DEVICE_ID_KEY);

    if (stored !== null && stored.length > 0) {
      cachedDeviceId = stored;

      return stored;
    }

    const minted = mintDeviceId();

    await SecureStore.setItemAsync(DEVICE_ID_KEY, minted);
    cachedDeviceId = minted;

    return minted;
  } catch {
    // A keychain that will not answer must not stop a sign-in. The id lives
    // for this launch only, which costs a slot until the session expires.
    cachedDeviceId ??= mintDeviceId();

    return cachedDeviceId;
  }
}

export function readDevicePlatform(): DevicePlatform {
  if (Platform.OS === "ios" || Platform.OS === "android") {
    return Platform.OS;
  }

  return "unknown";
}
