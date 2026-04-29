-- AlterTable
ALTER TABLE "users" ADD COLUMN     "content_update_notifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "email_notifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_2fa_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone_number" VARCHAR(20),
ADD COLUMN     "platform_announcements" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "profile_picture" VARCHAR(500),
ADD COLUMN     "system_alerts" BOOLEAN NOT NULL DEFAULT true;
