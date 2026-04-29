/*
  Warnings:

  - The `status` column on the `collections` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "GeneralStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "collections" DROP COLUMN "status",
ADD COLUMN     "status" "GeneralStatus" NOT NULL DEFAULT 'ACTIVE';

-- DropEnum
DROP TYPE "CollectionStatus";

-- CreateTable
CREATE TABLE "content_types" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "GeneralStatus" NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_enabled_content" BOOLEAN NOT NULL DEFAULT true,
    "allow_media_upload" BOOLEAN NOT NULL DEFAULT true,
    "allow_tags" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "content_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "content_types_name_key" ON "content_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "content_types_key_key" ON "content_types"("key");

-- CreateIndex
CREATE UNIQUE INDEX "content_types_slug_key" ON "content_types"("slug");

-- CreateIndex
CREATE INDEX "content_types_status_idx" ON "content_types"("status");

-- CreateIndex
CREATE INDEX "collections_status_idx" ON "collections"("status");
