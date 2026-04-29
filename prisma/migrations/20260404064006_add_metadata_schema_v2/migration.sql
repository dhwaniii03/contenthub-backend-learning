-- AlterTable
ALTER TABLE "content_types" ADD COLUMN     "metadata_schema_id" TEXT;

-- CreateTable
CREATE TABLE "metadata_schemas" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "schema_type" VARCHAR(100) NOT NULL,
    "schema" JSONB NOT NULL,
    "seo_schema" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "GeneralStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "metadata_schemas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "metadata_schemas_title_key" ON "metadata_schemas"("title");

-- AddForeignKey
ALTER TABLE "content_types" ADD CONSTRAINT "content_types_metadata_schema_id_fkey" FOREIGN KEY ("metadata_schema_id") REFERENCES "metadata_schemas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
