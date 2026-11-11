CREATE TABLE "desks" (
	"id" text PRIMARY KEY,
	"code" text NOT NULL UNIQUE,
	"floor_id" text NOT NULL,
	"zone" text NOT NULL,
	"x" integer NOT NULL,
	"y" integer NOT NULL,
	"facing" text NOT NULL,
	"equipment" text[] DEFAULT '{}'::text[] NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"disabled_reason" text
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"desk_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"am" boolean NOT NULL,
	"pm" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservations_half_day_check" CHECK ("am" or "pm")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_active_at" timestamp with time zone NOT NULL,
	"mfa" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"email" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"team" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"password_hash" text,
	"demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX "desks_floor_id_idx" ON "desks" ("floor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reservations_desk_am_uq" ON "reservations" ("desk_id","date") WHERE "am";--> statement-breakpoint
CREATE UNIQUE INDEX "reservations_desk_pm_uq" ON "reservations" ("desk_id","date") WHERE "pm";--> statement-breakpoint
CREATE UNIQUE INDEX "reservations_user_am_uq" ON "reservations" ("user_id","date") WHERE "am";--> statement-breakpoint
CREATE UNIQUE INDEX "reservations_user_pm_uq" ON "reservations" ("user_id","date") WHERE "pm";--> statement-breakpoint
CREATE INDEX "reservations_date_idx" ON "reservations" ("date");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" ("expires_at");--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_desk_id_desks_id_fkey" FOREIGN KEY ("desk_id") REFERENCES "desks"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;