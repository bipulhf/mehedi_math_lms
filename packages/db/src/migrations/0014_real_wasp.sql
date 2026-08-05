CREATE TYPE "public"."coupon_kind" AS ENUM('FLAT', 'PERCENT');--> statement-breakpoint
ALTER TYPE "public"."payment_provider" ADD VALUE 'COUPON';--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"course_id" uuid,
	"created_by_id" uuid NOT NULL,
	"kind" "coupon_kind" NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"max_redemptions" integer,
	"is_public" boolean DEFAULT false NOT NULL,
	"is_disabled" boolean DEFAULT false NOT NULL,
	"starts_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "coupon_id" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "coupon_code" varchar(32);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "list_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "discount_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "coupons_course_code_unique_idx" ON "coupons" USING btree ("course_id",upper("code")) WHERE "coupons"."course_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "coupons_platform_code_unique_idx" ON "coupons" USING btree (upper("code")) WHERE "coupons"."course_id" is null;--> statement-breakpoint
CREATE INDEX "coupons_course_id_idx" ON "coupons" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "coupons_created_by_id_idx" ON "coupons" USING btree ("created_by_id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_coupon_id_idx" ON "payments" USING btree ("coupon_id");