import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";

import {
  emitNotificationsUpdated,
  registerFcmDevice
} from "@/lib/api/notifications";
import { apiGet } from "@/lib/api/client";
import { clientEnv } from "@/lib/env";

let webPushRegistered = false;

export async function tryRegisterWebPush(): Promise<void> {
  if (
    typeof window === "undefined" ||
    webPushRegistered ||
    !clientEnv.firebaseVapidKey ||
    !("Notification" in window) ||
    window.Notification.permission !== "granted" ||
    !("serviceWorker" in navigator)
  ) {
    return;
  }

  const supported = await isSupported();

  if (!supported) {
    return;
  }

  const response = await apiGet<FirebaseOptions | null>("public/firebase-config");

  if (!response.data) {
    return;
  }

  const app: FirebaseApp =
    getApps().length > 0 ? getApps()[0]! : initializeApp(response.data);

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const messaging = getMessaging(app);

  const token = await getToken(messaging, {
    serviceWorkerRegistration: registration,
    vapidKey: clientEnv.firebaseVapidKey
  });

  if (!token) {
    return;
  }

  await registerFcmDevice({
    deviceType: "WEB",
    token
  });

  onMessage(messaging, () => {
    emitNotificationsUpdated();
  });

  webPushRegistered = true;
}

export async function requestWebPushPermission(): Promise<NotificationPermission> {
  if (
    typeof window === "undefined" ||
    !clientEnv.firebaseVapidKey ||
    !("Notification" in window)
  ) {
    return "denied";
  }

  const permission = await window.Notification.requestPermission();

  if (permission === "granted") {
    await tryRegisterWebPush();
  }

  return permission;
}
