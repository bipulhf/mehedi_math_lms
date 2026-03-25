import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export class FcmPushService {
  private readonly app: App | null;

  public constructor() {
    if (!env.isFirebaseConfigured || !env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      this.app = null;
      return;
    }

    try {
      const credentials = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON) as {
        client_email: string;
        private_key: string;
        project_id: string;
      };

      if (getApps().length > 0) {
        this.app = getApps()[0] ?? null;
        return;
      }

      this.app = initializeApp({
        credential: cert({
          clientEmail: credentials.client_email,
          privateKey: credentials.private_key,
          projectId: credentials.project_id
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
        tokens: [...input.tokens]
      });
    } catch (error) {
      logger.warn({ error }, "FCM multicast send failed");
    }
  }
}
