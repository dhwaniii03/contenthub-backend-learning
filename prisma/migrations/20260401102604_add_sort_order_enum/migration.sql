/*
  Warnings:

  - The `sort_order` column on the `collections` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "SortOrderType" AS ENUM ('MANUAL', 'LATEST_FIRST');

-- AlterTable
ALTER TABLE "collections" DROP COLUMN "sort_order",
ADD COLUMN     "sort_order" "SortOrderType" NOT NULL DEFAULT 'MANUAL';

-- CreateIndex
CREATE INDEX "collections_sort_order_idx" ON "collections"("sort_order");
