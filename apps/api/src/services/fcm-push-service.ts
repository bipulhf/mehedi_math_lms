import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export class FcmPushService {
  private readonly app: App | null;

  public constructor() {
    const credentials = env.firebaseServiceAccount;

    // Push is feature-gated, not required. Reading the credentials -- from the
    // service-account JSON or from the three fields it can also arrive as --
    // is `@/lib/env`'s job; this only reports whether there is anything to
    // send with.
    if (credentials === null) {
      logger.info("Firebase is not configured; push notifications are disabled");
      this.app = null;

      return;
    }

    try {
      if (getApps().length > 0) {
        this.app = getApps()[0] ?? null;

        return;
      }

      this.app = initializeApp({
        credential: cert({
          clientEmail: credentials.clientEmail,
          privateKey: credentials.privateKey,
          projectId: credentials.projectId
        })
      });
    } catch (error) {
      logger.error({ error }, "Failed to initialize Firebase Admin");
      this.app = null;
    }
  }

  public get isReady(): boolean {
    return this.app !== null;
  }

  public async sendToTokens(input: {
    body: string;
    data: Record<string, string>;
    title: string;
    tokens: readonly string[];
  }): Promise<void> {
    if (!this.app || input.tokens.length === 0) {
      return;
    }

    const messaging = getMessaging(this.app);

    try {
      await messaging.sendEachForMulticast({
        data: input.data,
        notification: {
          body: input.body,
          title: input.title
        },
        webpush: {
          notification: {
            badge: "https://mehedismathacademy.com/brand/mma-mark.png",
            icon: "https://mehedismathacademy.com/brand/mma-mark.png"
          }
        },
        tokens: [...input.tokens]
      });
    } catch (error) {
      logger.warn({ error }, "FCM multicast send failed");
    }
  }
}
