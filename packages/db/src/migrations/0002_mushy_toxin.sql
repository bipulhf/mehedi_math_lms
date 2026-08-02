CREATE TYPE "public"."course_teacher_role" AS ENUM('OWNER', 'TEACHER');--> statement-breakpoint
ALTER TABLE "course_teachers" ADD COLUMN "role" "course_teacher_role" DEFAULT 'TEACHER' NOT NULL;