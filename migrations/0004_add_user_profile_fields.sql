-- Add profile photo and additional parent profile fields
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_photo" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_number" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "zip_code" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarding_completed" BOOLEAN DEFAULT FALSE;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_contact" TEXT;