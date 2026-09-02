-- Every account row predates the column, so each one needs the issuer Better
-- Auth will look it up by. `provider_id` decides it: `credential` is a local
-- method and gets the synthetic `local:credential`, Google publishes its own,
-- and any other OAuth provider falls back to the synthetic OAuth namespace.
-- Until this runs, sign-in matches nothing and password reset updates nothing.
UPDATE "accounts" SET "issuer" = 'local:credential' WHERE "issuer" IS NULL AND "provider_id" = 'credential';--> statement-breakpoint
UPDATE "accounts" SET "issuer" = 'https://accounts.google.com' WHERE "issuer" IS NULL AND "provider_id" = 'google';--> statement-breakpoint
UPDATE "accounts" SET "issuer" = 'local:oauth:' || "provider_id" WHERE "issuer" IS NULL;
