DROP INDEX "verification_tokens_token_unique_idx";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_number" varchar(32);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_number_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_number_unique_idx" ON "users" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "verification_tokens_token_idx" ON "verification_tokens" USING btree ("token");