-- DropIndex
DROP INDEX "collection_contents_collection_id_idx";

-- DropIndex
DROP INDEX "collection_contents_sort_order_idx";

-- CreateIndex
CREATE INDEX "collection_contents_collection_id_sort_order_idx" ON "collection_contents"("collection_id", "sort_order");
