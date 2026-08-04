CREATE TABLE "video_chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lecture_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"time_seconds" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "video_chapters" ADD CONSTRAINT "video_chapters_lecture_id_lectures_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."lectures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "video_chapters_lecture_id_idx" ON "video_chapters" USING btree ("lecture_id");