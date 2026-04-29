/*
  Warnings:

  - You are about to drop the `_CollectionToContent` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_CollectionToContent" DROP CONSTRAINT "_CollectionToContent_A_fkey";

-- DropForeignKey
ALTER TABLE "_CollectionToContent" DROP CONSTRAINT "_CollectionToContent_B_fkey";

-- DropTable
DROP TABLE "_CollectionToContent";

-- CreateTable
CREATE TABLE "collection_contents" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "collection_contents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "collection_contents_collection_id_idx" ON "collection_contents"("collection_id");

-- CreateIndex
CREATE INDEX "collection_contents_content_id_idx" ON "collection_contents"("content_id");

-- CreateIndex
CREATE INDEX "collection_contents_sort_order_idx" ON "collection_contents"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "collection_contents_collection_id_content_id_key" ON "collection_contents"("collection_id", "content_id");

-- AddForeignKey
ALTER TABLE "collection_contents" ADD CONSTRAINT "collection_contents_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_contents" ADD CONSTRAINT "collection_contents_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
