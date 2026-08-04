ALTER TABLE "chapters" ADD COLUMN "is_published" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "lectures" ADD COLUMN "is_published" boolean DEFAULT true NOT NULL;