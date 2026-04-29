/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `metadata_schemas` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "metadata_schemas" ADD COLUMN     "slug" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "metadata_schemas_slug_key" ON "metadata_schemas"("slug");
