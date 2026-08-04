ALTER TABLE "tests" ADD COLUMN "max_attempts" integer;--> statement-breakpoint
ALTER TABLE "tests" ADD COLUMN "lock_answer_on_select" boolean DEFAULT false NOT NULL;