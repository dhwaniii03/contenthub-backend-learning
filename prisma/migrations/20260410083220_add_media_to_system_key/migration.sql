-- AlterEnum
ALTER TYPE "SystemKeyType" ADD VALUE 'MEDIA';

-- AlterTable
ALTER TABLE "system_keys" ADD COLUMN     "media_id" TEXT;

-- AddForeignKey
ALTER TABLE "system_keys" ADD CONSTRAINT "system_keys_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
