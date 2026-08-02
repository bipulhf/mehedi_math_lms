CREATE TABLE "conversation_access_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"admin_id" uuid NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "hidden_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "hidden_by_id" uuid;--> statement-breakpoint
ALTER TABLE "conversation_access_log" ADD CONSTRAINT "conversation_access_log_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_access_log" ADD CONSTRAINT "conversation_access_log_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_reports" ADD CONSTRAINT "conversation_reports_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_reports" ADD CONSTRAINT "conversation_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_reports" ADD CONSTRAINT "conversation_reports_resolved_by_id_users_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_access_log_conversation_id_idx" ON "conversation_access_log" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "conversation_access_log_admin_id_idx" ON "conversation_access_log" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "conversation_reports_conversation_id_idx" ON "conversation_reports" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "conversation_reports_reporter_id_idx" ON "conversation_reports" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "conversation_reports_resolved_at_idx" ON "conversation_reports" USING btree ("resolved_at");--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_hidden_by_id_users_id_fk" FOREIGN KEY ("hidden_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;