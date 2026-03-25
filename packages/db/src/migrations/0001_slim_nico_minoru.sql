CREATE TYPE "public"."sms_batch_status" AS ENUM('QUEUED', 'SENDING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."sms_recipient_status" AS ENUM('PENDING', 'SENT', 'FAILED', 'SKIPPED_NO_PHONE');--> statement-breakpoint
CREATE TYPE "public"."sms_target_kind" AS ENUM('ALL_STUDENTS', 'ROLE', 'COURSE');--> statement-breakpoint
CREATE TABLE "sms_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"message_body" text NOT NULL,
	"target_kind" "sms_target_kind" NOT NULL,
	"target_role" "user_role",
	"course_id" uuid,
	"status" "sms_batch_status" DEFAULT 'QUEUED' NOT NULL,
	"provider_last_response" text,
	"total_recipients" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sms_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"user_id" uuid,
	"phone_e164" varchar(20),
	"status" "sms_recipient_status" DEFAULT 'PENDING' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sms_batches" ADD CONSTRAINT "sms_batches_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_batches" ADD CONSTRAINT "sms_batches_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_recipients" ADD CONSTRAINT "sms_recipients_batch_id_sms_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."sms_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_recipients" ADD CONSTRAINT "sms_recipients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sms_batches_created_by_user_id_idx" ON "sms_batches" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "sms_batches_created_at_idx" ON "sms_batches" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sms_batches_status_idx" ON "sms_batches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sms_recipients_batch_id_idx" ON "sms_recipients" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "sms_recipients_status_idx" ON "sms_recipients" USING btree ("status");
