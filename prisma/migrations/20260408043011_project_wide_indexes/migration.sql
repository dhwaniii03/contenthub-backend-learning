-- CreateIndex
CREATE INDEX "content_types_is_deleted_idx" ON "content_types"("is_deleted");

-- CreateIndex
CREATE INDEX "media_is_deleted_idx" ON "media"("is_deleted");

-- CreateIndex
CREATE INDEX "media_fileType_idx" ON "media"("fileType");

-- CreateIndex
CREATE INDEX "system_keys_is_deleted_idx" ON "system_keys"("is_deleted");
