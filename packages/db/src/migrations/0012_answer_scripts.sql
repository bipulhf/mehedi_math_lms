ALTER TYPE "public"."upload_purpose" ADD VALUE 'QUESTION_IMAGE';--> statement-breakpoint
ALTER TYPE "public"."upload_purpose" ADD VALUE 'ANSWER_SCRIPT_PAGE';--> statement-breakpoint
CREATE TABLE "answer_marking_locks" (
	"submission_answer_id" uuid PRIMARY KEY NOT NULL,
	"locked_by_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"upload_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "script_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_answer_id" uuid NOT NULL,
	"upload_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"marking" jsonb,
	"marked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tests" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."test_type";--> statement-breakpoint
CREATE TYPE "public"."test_type" AS ENUM('MCQ', 'WRITTEN');--> statement-breakpoint
ALTER TABLE "tests" ALTER COLUMN "type" SET DATA TYPE "public"."test_type" USING "type"::"public"."test_type";--> statement-breakpoint
ALTER TABLE "submission_answers" ALTER COLUMN "awarded_marks" SET DATA TYPE numeric(5, 2);--> statement-breakpoint
ALTER TABLE "test_questions" ALTER COLUMN "marks" SET DATA TYPE numeric(5, 2);--> statement-breakpoint
ALTER TABLE "test_questions" ALTER COLUMN "marks" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "test_submissions" ALTER COLUMN "score" SET DATA TYPE numeric(7, 2);--> statement-breakpoint
ALTER TABLE "test_submissions" ALTER COLUMN "max_score" SET DATA TYPE numeric(7, 2);--> statement-breakpoint
ALTER TABLE "tests" ALTER COLUMN "passing_score" SET DATA TYPE numeric(7, 2);--> statement-breakpoint
ALTER TABLE "test_questions" ADD COLUMN "marking_guide" text;--> statement-breakpoint
ALTER TABLE "answer_marking_locks" ADD CONSTRAINT "answer_marking_locks_submission_answer_id_submission_answers_id_fk" FOREIGN KEY ("submission_answer_id") REFERENCES "public"."submission_answers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_marking_locks" ADD CONSTRAINT "answer_marking_locks_locked_by_id_users_id_fk" FOREIGN KEY ("locked_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_images" ADD CONSTRAINT "question_images_question_id_test_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."test_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_images" ADD CONSTRAINT "question_images_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_pages" ADD CONSTRAINT "script_pages_submission_answer_id_submission_answers_id_fk" FOREIGN KEY ("submission_answer_id") REFERENCES "public"."submission_answers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_pages" ADD CONSTRAINT "script_pages_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "answer_marking_locks_locked_by_id_idx" ON "answer_marking_locks" USING btree ("locked_by_id");--> statement-breakpoint
CREATE INDEX "answer_marking_locks_expires_at_idx" ON "answer_marking_locks" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "question_images_question_id_idx" ON "question_images" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "question_images_sort_order_idx" ON "question_images" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "question_images_upload_id_unique_idx" ON "question_images" USING btree ("upload_id");--> statement-breakpoint
CREATE INDEX "script_pages_submission_answer_id_idx" ON "script_pages" USING btree ("submission_answer_id");--> statement-breakpoint
CREATE INDEX "script_pages_sort_order_idx" ON "script_pages" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "script_pages_upload_id_unique_idx" ON "script_pages" USING btree ("upload_id");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_answers_submission_question_unique_idx" ON "submission_answers" USING btree ("submission_id","question_id");