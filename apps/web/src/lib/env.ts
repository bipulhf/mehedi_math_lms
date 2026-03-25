import { z } from "zod";

const clientEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url().optional()
});

const parsedClientEnv = clientEnvSchema.safeParse(import.meta.env);

export const clientEnv = {
  apiBaseUrl: parsedClientEnv.success && parsedClientEnv.data.VITE_API_BASE_URL
    ? parsedClientEnv.data.VITE_API_BASE_URL
    : "http://localhost:3001/api/v1"
} as const;
