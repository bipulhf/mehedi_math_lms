import { z } from "zod";

const apiEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_NAME: z.string().default("Mehedi's Math Academy"),
  APP_URL: z.string().url().default("https://mehedismathacademy.com"),
  API_PORT: z.coerce.number().int().positive().default(3001),
  API_HOST: z.string().default("0.0.0.0"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  AWS_REGION: z.string().default("ap-south-1"),
  AWS_ACCESS_KEY_ID: z.string().default("replace-me"),
  AWS_SECRET_ACCESS_KEY: z.string().default("replace-me"),
  AWS_S3_BUCKET: z.string().default("replace-me"),
  S3_PUBLIC_BASE_URL: z.url().optional(),
  CORS_ORIGINS: z.string().optional(),
  BODY_LIMIT_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info")
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
  isS3Configured:
    parsedEnv.AWS_ACCESS_KEY_ID !== "replace-me" &&
    parsedEnv.AWS_SECRET_ACCESS_KEY !== "replace-me" &&
    parsedEnv.AWS_S3_BUCKET !== "replace-me",
  corsOrigins: parsedEnv.CORS_ORIGINS
    ? parsedEnv.CORS_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0)
    : defaultCorsOrigins
};
