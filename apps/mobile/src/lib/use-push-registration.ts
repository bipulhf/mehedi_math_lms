import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";

import { registerPushToken } from "@/src/lib/api/notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

/**
 * Registers this device for push once the user is signed in. Every failure path
 * is silent by design: a simulator has no push token, a user may refuse the
 * permission, and neither is a reason to interrupt them. The rest of the app
 * works without it.
 */
export function usePushRegistration(isSignedIn: boolean): void {
  useEffect(() => {
    if (!isSignedIn || !Device.isDevice) {
      return;
    }

    let isCancelled = false;

    void (async () => {
      try {
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
