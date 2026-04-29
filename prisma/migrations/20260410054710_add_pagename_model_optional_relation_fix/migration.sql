/*
  Warnings:

  - You are about to drop the column `category` on the `system_keys` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SystemKeyType" AS ENUM ('TEXT', 'ERROR');

-- DropIndex
DROP INDEX "system_keys_category_idx";

-- DropIndex
DROP INDEX "system_keys_category_key_name_idx";

-- AlterTable
ALTER TABLE "system_keys" DROP COLUMN "category",
ADD COLUMN     "page_name_id" TEXT,
ADD COLUMN     "type" "SystemKeyType" NOT NULL DEFAULT 'TEXT';

-- CreateTable
CREATE TABLE "page_names" (
    "id" TEXT NOT NULL,
    "page_name" TEXT NOT NULL,

    CONSTRAINT "page_names_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "page_names_page_name_key" ON "page_names"("page_name");

-- CreateIndex
CREATE INDEX "system_keys_page_name_id_idx" ON "system_keys"("page_name_id");

-- CreateIndex
CREATE INDEX "system_keys_page_name_id_key_name_idx" ON "system_keys"("page_name_id", "key_name");

-- AddForeignKey
ALTER TABLE "system_keys" ADD CONSTRAINT "system_keys_page_name_id_fkey" FOREIGN KEY ("page_name_id") REFERENCES "page_names"("id") ON DELETE SET NULL ON UPDATE CASCADE;
