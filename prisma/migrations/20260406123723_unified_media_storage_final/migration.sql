/*
  Warnings:

  - You are about to drop the column `banner` on the `collections` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnail` on the `collections` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "collections" DROP COLUMN "banner",
DROP COLUMN "thumbnail",
ADD COLUMN     "banner_id" TEXT,
ADD COLUMN     "thumbnail_id" TEXT;

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "alternative_text" VARCHAR(255),
    "caption" VARCHAR(255),
    "fileType" VARCHAR(255),
    "ext" VARCHAR(50) NOT NULL,
    "mime" VARCHAR(100) NOT NULL,
    "size" DOUBLE PRECISION NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,


    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "media_url_key" ON "media"("url");

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_thumbnail_id_fkey" FOREIGN KEY ("thumbnail_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_banner_id_fkey" FOREIGN KEY ("banner_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
