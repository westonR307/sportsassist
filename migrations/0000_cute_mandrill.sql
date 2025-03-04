CREATE TABLE "camp_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"camp_id" integer NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL
);
--> statement-breakpoint
CREATE TABLE "camp_sports" (
	"id" serial PRIMARY KEY NOT NULL,
	"camp_id" integer NOT NULL,
	"sport_id" integer,
	"custom_sport" text,
	"skill_level" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "camp_staff" (
	"id" serial PRIMARY KEY NOT NULL,
	"camp_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "camps" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"street_address" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"zip_code" text NOT NULL,
	"additional_location_details" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"registration_start_date" timestamp NOT NULL,
	"registration_end_date" timestamp NOT NULL,
	"price" integer NOT NULL,
	"capacity" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"waitlist_enabled" boolean DEFAULT true NOT NULL,
	"type" text NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"min_age" integer NOT NULL,
	"max_age" integer NOT NULL,
	"repeat_type" text DEFAULT 'none' NOT NULL,
	"repeat_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "child_sports" (
	"id" serial PRIMARY KEY NOT NULL,
	"child_id" integer NOT NULL,
	"sport_id" integer NOT NULL,
	"skill_level" text NOT NULL,
	"preferred_positions" text[],
	"current_team" text
);
--> statement-breakpoint
CREATE TABLE "children" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"date_of_birth" timestamp NOT NULL,
	"gender" text NOT NULL,
	"profile_photo" text,
	"parent_id" integer NOT NULL,
	"emergency_contact" text,
	"emergency_phone" text,
	"emergency_relation" text,
	"allergies" text[],
	"medical_conditions" text[],
	"medications" text[],
	"special_needs" text,
	"preferred_contact" text NOT NULL,
	"communication_opt_in" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"organization_id" integer NOT NULL,
	"token" text NOT NULL,
	"accepted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"stripe_account_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"camp_id" integer NOT NULL,
	"child_id" integer NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"stripe_payment_id" text,
	"waitlisted" boolean DEFAULT false NOT NULL,
	"registered_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sports" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "sports_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"role" text NOT NULL,
	"organization_id" integer,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "camp_schedules" ADD CONSTRAINT "camp_schedules_camp_id_camps_id_fk" FOREIGN KEY ("camp_id") REFERENCES "public"."camps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camp_sports" ADD CONSTRAINT "camp_sports_camp_id_camps_id_fk" FOREIGN KEY ("camp_id") REFERENCES "public"."camps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camp_sports" ADD CONSTRAINT "camp_sports_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camp_staff" ADD CONSTRAINT "camp_staff_camp_id_camps_id_fk" FOREIGN KEY ("camp_id") REFERENCES "public"."camps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camp_staff" ADD CONSTRAINT "camp_staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camps" ADD CONSTRAINT "camps_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "child_sports" ADD CONSTRAINT "child_sports_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "child_sports" ADD CONSTRAINT "child_sports_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "children_parent_id_users_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_camp_id_camps_id_fk" FOREIGN KEY ("camp_id") REFERENCES "public"."camps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;