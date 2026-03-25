import { z } from "zod";

const apiEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_NAME: z.string().default("Mehedi's Math Academy"),
  APP_URL: z.url().default("https://mehedismathacademy.com"),
  API_PUBLIC_URL: z.url().default("http://localhost:3001/api/v1"),
  API_PORT: z.coerce.number().int().positive().default(3001),
  API_HOST: z.string().default("0.0.0.0"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  AWS_REGION: z.string().default("ap-south-1"),
  AWS_ACCESS_KEY_ID: z.string().default("replace-me"),
  AWS_SECRET_ACCESS_KEY: z.string().default("replace-me"),
  AWS_S3_BUCKET: z.string().default("replace-me"),
  S3_PUBLIC_BASE_URL: z.url().optional(),
  SSLCOMMERZ_STORE_ID: z.string().default("replace-me"),
  SSLCOMMERZ_STORE_PASSWORD: z.string().default("replace-me"),
  SSLCOMMERZ_SANDBOX_MODE: z.coerce.boolean().default(true),
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
  isS3Configured:
    parsedEnv.AWS_ACCESS_KEY_ID !== "replace-me" &&
    parsedEnv.AWS_SECRET_ACCESS_KEY !== "replace-me" &&
    parsedEnv.AWS_S3_BUCKET !== "replace-me",
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
