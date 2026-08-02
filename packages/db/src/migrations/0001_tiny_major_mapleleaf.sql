ALTER TABLE "payments" DROP CONSTRAINT "payments_enrollment_id_enrollments_id_fk";
--> statement-breakpoint
ALTER TABLE "enrollments" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "enrollments" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::text;--> statement-breakpoint
DROP TYPE "public"."enrollment_status";--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('ACTIVE', 'COMPLETED');--> statement-breakpoint
ALTER TABLE "enrollments" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"public"."enrollment_status";--> statement-breakpoint
ALTER TABLE "enrollments" ALTER COLUMN "status" SET DATA TYPE "public"."enrollment_status" USING "status"::"public"."enrollment_status";--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "enrollment_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "course_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_course_id_idx" ON "payments" USING btree ("course_id");