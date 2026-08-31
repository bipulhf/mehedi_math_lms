CREATE TYPE "public"."script_challenge_status" AS ENUM('OPEN', 'RESOLVED');--> statement-breakpoint
CREATE TABLE "script_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"raised_by_id" uuid NOT NULL,
	"assigned_teacher_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" "script_challenge_status" DEFAULT 'OPEN' NOT NULL,
	"response" text,
	"score_at_challenge" numeric(7, 2),
	"score_after_review" numeric(7, 2),
	"resolved_by_id" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "script_challenges" ADD CONSTRAINT "script_challenges_submission_id_test_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."test_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_challenges" ADD CONSTRAINT "script_challenges_raised_by_id_users_id_fk" FOREIGN KEY ("raised_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_challenges" ADD CONSTRAINT "script_challenges_assigned_teacher_id_users_id_fk" FOREIGN KEY ("assigned_teacher_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_challenges" ADD CONSTRAINT "script_challenges_resolved_by_id_users_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "script_challenges_submission_id_idx" ON "script_challenges" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "script_challenges_assigned_teacher_id_idx" ON "script_challenges" USING btree ("assigned_teacher_id");--> statement-breakpoint
CREATE UNIQUE INDEX "script_challenges_one_open_per_submission_idx" ON "script_challenges" USING btree ("submission_id") WHERE "script_challenges"."status" = 'OPEN';