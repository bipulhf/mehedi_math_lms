import { smsEnv } from "@mma/sms";
import { z } from "zod";

const apiEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_NAME: z.string().default("Mehedi's Math Academy"),
  APP_URL: z.url().default("https://mehedismathacademy.com"),
  API_PUBLIC_URL: z.url().default("http://localhost:3001/api/v1"),
  API_PORT: z.coerce.number().int().positive().default(3001),
  API_HOST: z.string().default("0.0.0.0"),
  /**
   * Whether this deployment has a Redis. `true` means *required*: the API
   * refuses to start if it cannot reach one, because the alternative is
   * discovering it during somebody's checkout. `false` runs the whole product
   * on Postgres alone, with the capabilities listed in ADR-0015 either moved
   * in-process or gone.
   *
   * Not `z.coerce.boolean()`: that is `Boolean(input)`, so the string "false"
   * -- the exact thing a deployer writes to turn this off -- would be `true`.
   * The same trap is called out on SSLCOMMERZ_SANDBOX_MODE.
   */
  REDIS_ENABLED: z.stringbool().default(true),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  /**
   * How long a Redis command may take before the caller gives up. Every command
   * on the request path is a cache read, a rate-limit counter or a presence
   * lookup — none of them worth waiting on, all of them with a working path
   * behind them.
   */
  REDIS_COMMAND_TIMEOUT_MS: z.coerce.number().int().positive().default(1000),
  AWS_REGION: z.string().default("ap-south-1"),
  AWS_ACCESS_KEY_ID: z.string().default("replace-me"),
  AWS_SECRET_ACCESS_KEY: z.string().default("replace-me"),
  AWS_S3_BUCKET: z.string().default("replace-me"),
  S3_PUBLIC_BASE_URL: z.url().optional(),
  STORAGE_PROVIDER: z.enum(["s3", "uploadthing"]).default("s3"),
  UPLOADTHING_TOKEN: z.string().default("replace-me"),
  SSLCOMMERZ_STORE_ID: z.string().default("replace-me"),
  SSLCOMMERZ_STORE_PASSWORD: z.string().default("replace-me"),
  // NOT z.coerce.boolean(): that is Boolean(input), so the string "false"
  // coerces to true and the live gateway becomes unreachable. ADR-0001.
  SSLCOMMERZ_SANDBOX_MODE: z.stringbool().default(true),
  CORS_ORIGINS: z.string().optional(),
  BODY_LIMIT_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(10 * 1024 * 1024),
  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
  // Per address, per window, across the whole of `/api/*`. Deliberately high:
  // one dashboard page can fire a handful of calls, and a school or an office
  // reaches us as a single address, so a limit sized for one person throttles
  // the room. It is a brake on a script, not a quota on real use.
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(1000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  // The service account, in either shape it comes in. The console hands out a
  // JSON file; a host whose secret store will not take a multi-line blob hands
  // out three fields. Both are accepted, and the JSON wins where both are set.
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  // The public web-app config. `FIREBASE_WEB_*` is what the Firebase console
  // calls these; `FIREBASE_CLIENT_*` is what this file called them first. Both
  // are read so neither spelling is silently ignored.
  FIREBASE_CLIENT_API_KEY: z.string().optional(),
  FIREBASE_CLIENT_AUTH_DOMAIN: z.string().optional(),
  FIREBASE_CLIENT_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_MESSAGING_SENDER_ID: z.string().optional(),
  FIREBASE_CLIENT_APP_ID: z.string().optional(),
  FIREBASE_WEB_API_KEY: z.string().optional(),
  FIREBASE_WEB_AUTH_DOMAIN: z.string().optional(),
  FIREBASE_WEB_PROJECT_ID: z.string().optional(),
  FIREBASE_WEB_MESSAGING_SENDER_ID: z.string().optional(),
  FIREBASE_WEB_APP_ID: z.string().optional()
});

/** A value that was never filled in is not a value. */
function configured(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  return trimmed && trimmed !== "replace-me" ? trimmed : undefined;
}

export interface FirebaseServiceAccount {
  clientEmail: string;
  privateKey: string;
  projectId: string;
}

export interface FirebaseClientConfig {
  apiKey: string;
  appId: string;
  authDomain: string;
  messagingSenderId: string;
  projectId: string;
}

/**
 * The credentials the admin SDK signs with, from whichever shape was supplied.
 *
 * The private key is the part that goes wrong: a `.env` file holds it with the
 * newlines escaped, and Firebase rejects the key without them restored. That
 * single `replaceAll` is the difference between push working and a
 * "Failed to parse private key" nobody sees because the send is fire-and-forget.
 */
function resolveServiceAccount(
  raw: z.infer<typeof apiEnvSchema>
): FirebaseServiceAccount | null {
  const json = configured(raw.FIREBASE_SERVICE_ACCOUNT_JSON);

  if (json) {
    try {
      const parsed = JSON.parse(json) as {
        client_email?: string;
        private_key?: string;
        project_id?: string;
      };

      if (parsed.client_email && parsed.private_key && parsed.project_id) {
        return {
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key.replaceAll("\\n", "\n"),
          projectId: parsed.project_id
        };
      }
    } catch {
      // Falls through to the split fields, and to the warning below.
    }
  }

  const clientEmail = configured(raw.FIREBASE_CLIENT_EMAIL);
  const privateKey = configured(raw.FIREBASE_PRIVATE_KEY);
  const projectId = configured(raw.FIREBASE_PROJECT_ID);

  if (clientEmail && privateKey && projectId) {
    return { clientEmail, privateKey: privateKey.replaceAll("\\n", "\n"), projectId };
  }

  return null;
}

function resolveClientConfig(raw: z.infer<typeof apiEnvSchema>): FirebaseClientConfig | null {
  const apiKey = configured(raw.FIREBASE_CLIENT_API_KEY) ?? configured(raw.FIREBASE_WEB_API_KEY);
  const appId = configured(raw.FIREBASE_CLIENT_APP_ID) ?? configured(raw.FIREBASE_WEB_APP_ID);
  const authDomain =
    configured(raw.FIREBASE_CLIENT_AUTH_DOMAIN) ?? configured(raw.FIREBASE_WEB_AUTH_DOMAIN);
  const messagingSenderId =
    configured(raw.FIREBASE_CLIENT_MESSAGING_SENDER_ID) ??
    configured(raw.FIREBASE_WEB_MESSAGING_SENDER_ID);
  const projectId =
    configured(raw.FIREBASE_CLIENT_PROJECT_ID) ?? configured(raw.FIREBASE_WEB_PROJECT_ID);

  if (!apiKey || !appId || !authDomain || !messagingSenderId || !projectId) {
    return null;
  }

  return { apiKey, appId, authDomain, messagingSenderId, projectId };
}

const parsedEnv = apiEnvSchema.parse(process.env);
const isS3Configured =
  parsedEnv.AWS_ACCESS_KEY_ID !== "replace-me" &&
  parsedEnv.AWS_SECRET_ACCESS_KEY !== "replace-me" &&
  parsedEnv.AWS_S3_BUCKET !== "replace-me";

if (parsedEnv.STORAGE_PROVIDER === "uploadthing" && parsedEnv.UPLOADTHING_TOKEN === "replace-me") {
  throw new Error("STORAGE_PROVIDER=uploadthing requires UPLOADTHING_TOKEN to be set");
}

if (parsedEnv.STORAGE_PROVIDER === "s3" && !isS3Configured) {
  throw new Error(
    "STORAGE_PROVIDER=s3 requires AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/AWS_S3_BUCKET"
  );
}

const defaultCorsOrigins = [
  parsedEnv.APP_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:8081",
  "exp://127.0.0.1:8081"
];

const firebaseServiceAccount = resolveServiceAccount(parsedEnv);
const firebaseClientConfig = resolveClientConfig(parsedEnv);

export const env = {
  ...parsedEnv,
  firebaseClientConfig,
  firebaseServiceAccount,
  isFirebaseConfigured: firebaseServiceAccount !== null,
  isFirebaseClientConfigured: firebaseClientConfig !== null,
  isRedisEnabled: parsedEnv.REDIS_ENABLED,
  isS3Configured,
  isSslCommerzConfigured:
    parsedEnv.SSLCOMMERZ_STORE_ID !== "replace-me" &&
    parsedEnv.SSLCOMMERZ_STORE_PASSWORD !== "replace-me",
  // `@mma/sms` owns the credentials now -- the auth package sends the sign-in
  // OTP through the same provider and cannot import this file. Kept here under
  // its old name because it is what the admin SMS page reads.
  isOnecodesoftSmsConfigured: smsEnv.isSmsConfigured,
  corsOrigins: parsedEnv.CORS_ORIGINS
    ? parsedEnv.CORS_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0)
    : defaultCorsOrigins
};
