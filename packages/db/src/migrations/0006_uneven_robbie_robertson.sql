ALTER TABLE "courses" ADD COLUMN "featured_order" integer;--> statement-breakpoint
CREATE INDEX "courses_featured_order_idx" ON "courses" USING btree ("featured_order");