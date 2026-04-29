-- AlterTable
ALTER TABLE "users" ALTER COLUMN "profile_picture" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_profile_picture_fkey" FOREIGN KEY ("profile_picture") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
