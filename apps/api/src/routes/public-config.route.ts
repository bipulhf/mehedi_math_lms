import { Hono } from "hono";

import { env } from "@/lib/env";
import type { AppBindings } from "@/types/app-bindings";
import { success } from "@/utils/response";

export const publicConfigRoutes = new Hono<AppBindings>();

publicConfigRoutes.get("/firebase-config", (context) => {
  if (!env.isFirebaseClientConfigured) {
    return success(context, null);
  }

  return success(context, {
    apiKey: env.FIREBASE_CLIENT_API_KEY,
    appId: env.FIREBASE_CLIENT_APP_ID,
    authDomain: env.FIREBASE_CLIENT_AUTH_DOMAIN,
    messagingSenderId: env.FIREBASE_CLIENT_MESSAGING_SENDER_ID,
    projectId: env.FIREBASE_CLIENT_PROJECT_ID
  });
});
