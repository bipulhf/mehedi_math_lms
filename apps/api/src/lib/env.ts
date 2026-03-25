import { z } from "zod";

const apiEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_NAME: z.string().default("Mehedi's Math Academy"),
  APP_URL: z.string().url().default("https://mehedismathacademy.com"),
  API_PORT: z.coerce.number().int().positive().default(3001),
  API_HOST: z.string().default("0.0.0.0"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
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
  corsOrigins: parsedEnv.CORS_ORIGINS
    ? parsedEnv.CORS_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0)
    : defaultCorsOrigins
};
