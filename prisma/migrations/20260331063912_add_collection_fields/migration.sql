-- AlterTable
ALTER TABLE "collections" ADD COLUMN     "banner" VARCHAR(500),
ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "thumbnail" VARCHAR(500);

-- CreateIndex
CREATE INDEX "collections_sort_order_idx" ON "collections"("sort_order");
