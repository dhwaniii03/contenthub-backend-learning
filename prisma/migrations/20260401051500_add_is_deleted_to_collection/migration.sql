-- AlterTable
ALTER TABLE "collections" ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "collections_is_deleted_idx" ON "collections"("is_deleted");
