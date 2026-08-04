CREATE TYPE "public"."storage_provider" AS ENUM('s3', 'uploadthing');--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "provider" "storage_provider";
--> statement-breakpoint
UPDATE "uploads" SET "provider" = 's3' WHERE "provider" IS NULL;
--> statement-breakpoint
ALTER TABLE "uploads" ALTER COLUMN "provider" SET NOT NULL;
