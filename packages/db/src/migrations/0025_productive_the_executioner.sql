CREATE TYPE "public"."device_conflict_status" AS ENUM('OPEN', 'REVIEWED', 'DISMISSED');--> statement-breakpoint
CREATE TABLE "device_conflict_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"attempted_device_id" varchar(64),
	"attempted_platform" varchar(16) DEFAULT 'unknown' NOT NULL,
	"attempted_user_agent" text,
	"attempted_ip_address" varchar(64),
	"active_device_count" integer NOT NULL,
	"device_limit" integer NOT NULL,
	"status" "device_conflict_status" DEFAULT 'OPEN' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_id" varchar(64) NOT NULL,
	"platform" varchar(16) DEFAULT 'unknown' NOT NULL,
	"user_agent" text,
	"last_ip_address" varchar(64),
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "device_id" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "multi_device_allowed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "device_conflict_logs" ADD CONSTRAINT "device_conflict_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_conflict_logs" ADD CONSTRAINT "device_conflict_logs_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "device_conflict_logs_user_id_idx" ON "device_conflict_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "device_conflict_logs_status_idx" ON "device_conflict_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "device_conflict_logs_created_at_idx" ON "device_conflict_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_devices_user_device_unique_idx" ON "user_devices" USING btree ("user_id","device_id");--> statement-breakpoint
CREATE INDEX "user_devices_user_id_idx" ON "user_devices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_devices_last_seen_at_idx" ON "user_devices" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "sessions_user_id_expires_at_idx" ON "sessions" USING btree ("user_id","expires_at");