/*
  Warnings:

  - Made the column `slug` on table `metadata_schemas` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "metadata_schemas" ALTER COLUMN "slug" SET NOT NULL;
