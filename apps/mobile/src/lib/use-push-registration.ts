import * as Device from "expo-device";
import { useEffect } from "react";
import { Platform } from "react-native";

import { registerPushToken } from "@/src/lib/api/notifications";

/** `setNotificationHandler` is global; set it on the first run that gets that far. */
let isHandlerSet = false;

/**
 * `expo-notifications` is loaded here rather than imported at the top of the
 * file, and that is not a preference.
 *
 * Expo Go dropped Android push in SDK 53, and the module reports it by throwing
 * from its own module body — not from a call, from being imported. A static
 * import therefore runs before any guard in this file and takes down whichever
 * screen imported the hook. The inbox tab did exactly that: the route module
 * threw while evaluating, so it resolved to `undefined` and Expo Router failed
 * with `Cannot read property 'ErrorBoundary' of undefined` — a message with
 * nothing in it about notifications.
 *
 * Loading it inside the `try` below puts that throw where every other failure
 * here already goes. No check for Expo Go is needed and none is wanted:
 * `ExecutionEnvironment.StoreClient` covers development builds as well, so
 * testing for it would switch push off in the builds that actually have it.
 * The module either loads or it does not, and the answer is the same either way.
 */
async function loadNotifications(): Promise<typeof import("expo-notifications")> {
  return import("expo-notifications");
}

/**
 * Registers this device for push once the user is signed in. Every failure path
 * is silent by design: a simulator has no push token, a user may refuse the
 * permission, Expo Go has no push at all, and none of those is a reason to
 * interrupt them. The rest of the app works without it.
 */
export function usePushRegistration(isSignedIn: boolean): void {
  useEffect(() => {
    if (!isSignedIn || !Device.isDevice) {
      return;
    }

    let isCancelled = false;

    void (async () => {
      try {
        const Notifications = await loadNotifications();

        if (!isHandlerSet) {
          Notifications.setNotificationHandler({
            handleNotification: async () => ({
              shouldPlaySound: false,
              shouldSetBadge: true,
              shouldShowBanner: true,
              shouldShowList: true
            })
          });
          isHandlerSet = true;
        }

        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            importance: Notifications.AndroidImportance.DEFAULT,
            name: "Default"
          });
        }

        const existing = await Notifications.getPermissionsAsync();
        const status =
          existing.status === "granted"
            ? existing.status
            : (await Notifications.requestPermissionsAsync()).status;

        if (status !== "granted" || isCancelled) {
          return;
        }

        const token = await Notifications.getDevicePushTokenAsync();

        if (isCancelled || typeof token.data !== "string") {
          return;
        }

        await registerPushToken({
          deviceType: Platform.OS === "ios" ? "IOS" : "ANDROID",
          token: token.data
        });
      } catch {
        // Deliberately swallowed. See the note above: push is additive.
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [isSignedIn]);
}
