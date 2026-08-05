ALTER TABLE "submission_answers" DROP COLUMN "written_answer";--> statement-breakpoint
ALTER TABLE "test_questions" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "test_questions" DROP COLUMN "expected_answer";--> statement-breakpoint
ALTER TABLE "test_questions" DROP COLUMN "correct_answer";--> statement-breakpoint
DROP TYPE "public"."question_type";