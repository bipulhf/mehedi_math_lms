ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "impersonated_by" uuid;
