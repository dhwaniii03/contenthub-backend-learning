-- CreateTable
CREATE TABLE "contents" (
    "id" TEXT NOT NULL,
    "owner_type" VARCHAR(50) NOT NULL DEFAULT 'admin',
    "owner_id" TEXT,
    "content_type_id" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visibility" "VisibilityType" NOT NULL DEFAULT 'PUBLIC',
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CollectionToContent" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CollectionToContent_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "contents_slug_key" ON "contents"("slug");

-- CreateIndex
CREATE INDEX "contents_content_type_id_idx" ON "contents"("content_type_id");

-- CreateIndex
CREATE INDEX "contents_status_idx" ON "contents"("status");

-- CreateIndex
CREATE INDEX "contents_visibility_idx" ON "contents"("visibility");

-- CreateIndex
CREATE INDEX "contents_is_deleted_idx" ON "contents"("is_deleted");

-- CreateIndex
CREATE INDEX "_CollectionToContent_B_index" ON "_CollectionToContent"("B");

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_content_type_id_fkey" FOREIGN KEY ("content_type_id") REFERENCES "content_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CollectionToContent" ADD CONSTRAINT "_CollectionToContent_A_fkey" FOREIGN KEY ("A") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CollectionToContent" ADD CONSTRAINT "_CollectionToContent_B_fkey" FOREIGN KEY ("B") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
