import { z } from "zod";

const clientEnvSchema = z.object({
  VITE_API_BASE_URL: z.url().optional(),
  VITE_FIREBASE_VAPID_KEY: z.string().min(1).optional()
});

const parsedClientEnv = clientEnvSchema.safeParse(import.meta.env);

const apiBaseFromEnv =
  parsedClientEnv.success && parsedClientEnv.data.VITE_API_BASE_URL
    ? parsedClientEnv.data.VITE_API_BASE_URL
    : undefined;

export const clientEnv = {
  // In local dev we always use Vite proxy to keep requests same-origin.
  apiBaseUrl: import.meta.env.DEV ? "/api/v1" : (apiBaseFromEnv ?? "/api/v1"),
  firebaseVapidKey: parsedClientEnv.success
    ? parsedClientEnv.data.VITE_FIREBASE_VAPID_KEY
    : undefined
} as const;
