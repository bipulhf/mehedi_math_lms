import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { z } from "zod";

import * as schema from "./schema";

const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required")
});

const databaseEnv = databaseEnvSchema.parse(process.env);

export const pool = new Pool({
  connectionString: databaseEnv.DATABASE_URL
});

export const db = drizzle({
  client: pool,
  schema
});
