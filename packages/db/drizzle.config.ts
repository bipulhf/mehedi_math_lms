import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { z } from "zod";

config({
  path: fileURLToPath(new URL("../../.env", import.meta.url))
});

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required")
});

const env = envSchema.parse(process.env);

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./src/migrations",
  dbCredentials: {
    url: env.DATABASE_URL
  },
  strict: true,
  verbose: true
});
