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
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  FIREBASE_CLIENT_API_KEY: z.string().optional(),
  FIREBASE_CLIENT_AUTH_DOMAIN: z.string().optional(),
  FIREBASE_CLIENT_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_MESSAGING_SENDER_ID: z.string().optional(),
  FIREBASE_CLIENT_APP_ID: z.string().optional(),
  ONECODESOFT_API_KEY: z.string().optional(),
  ONECODESOFT_SENDER_ID: z.string().optional()
});

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

export const env = {
  ...parsedEnv,
  isFirebaseConfigured: Boolean(
    parsedEnv.FIREBASE_SERVICE_ACCOUNT_JSON &&
    parsedEnv.FIREBASE_SERVICE_ACCOUNT_JSON.trim().length > 0
  ),
  isFirebaseClientConfigured: Boolean(
    parsedEnv.FIREBASE_CLIENT_API_KEY &&
    parsedEnv.FIREBASE_CLIENT_AUTH_DOMAIN &&
    parsedEnv.FIREBASE_CLIENT_PROJECT_ID &&
    parsedEnv.FIREBASE_CLIENT_MESSAGING_SENDER_ID &&
    parsedEnv.FIREBASE_CLIENT_APP_ID
  ),
  isRedisEnabled: parsedEnv.REDIS_ENABLED,
  isS3Configured,
  isSslCommerzConfigured:
    parsedEnv.SSLCOMMERZ_STORE_ID !== "replace-me" &&
    parsedEnv.SSLCOMMERZ_STORE_PASSWORD !== "replace-me",
  isOnecodesoftSmsConfigured:
    Boolean(parsedEnv.ONECODESOFT_API_KEY && parsedEnv.ONECODESOFT_API_KEY.trim().length > 0) &&
    Boolean(parsedEnv.ONECODESOFT_SENDER_ID && parsedEnv.ONECODESOFT_SENDER_ID.trim().length > 0),
  corsOrigins: parsedEnv.CORS_ORIGINS
    ? parsedEnv.CORS_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0)
    : defaultCorsOrigins
};
