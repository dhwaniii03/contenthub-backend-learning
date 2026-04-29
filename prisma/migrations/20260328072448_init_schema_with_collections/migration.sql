-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "VisibilityType" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255),
    "role" "UserRole" NOT NULL DEFAULT 'admin',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" "TokenType" NOT NULL DEFAULT 'PASSWORD_RESET',
    "expires_at" TIMESTAMPTZ NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "general" JSONB NOT NULL,
    "seo" JSONB NOT NULL,
    "preferences" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "global_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "description" JSONB,
    "slug" VARCHAR(255) NOT NULL,
    "visibility" "VisibilityType" NOT NULL DEFAULT 'PUBLIC',
    "status" "CollectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "languages" (
    "id" TEXT NOT NULL,
    "language_code" TEXT NOT NULL,
    "language_name" TEXT NOT NULL,
    "country_code" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_rtl" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_keys" (
    "id" TEXT NOT NULL,
    "key_name" TEXT NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_predefined" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "system_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_translations" (
    "id" TEXT NOT NULL,
    "key_id" TEXT NOT NULL,
    "language_code" VARCHAR(10) NOT NULL,
    "content" TEXT,
    "draftContent" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "system_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_token_key" ON "tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "collections_slug_key" ON "collections"("slug");

-- CreateIndex
CREATE INDEX "collections_status_idx" ON "collections"("status");

-- CreateIndex
CREATE INDEX "collections_visibility_idx" ON "collections"("visibility");

-- CreateIndex
CREATE UNIQUE INDEX "languages_language_code_key" ON "languages"("language_code");

-- CreateIndex
CREATE UNIQUE INDEX "system_keys_key_name_key" ON "system_keys"("key_name");

-- CreateIndex
CREATE INDEX "system_keys_category_idx" ON "system_keys"("category");

-- CreateIndex
CREATE INDEX "system_keys_category_key_name_idx" ON "system_keys"("category", "key_name");

-- CreateIndex
CREATE INDEX "system_translations_language_code_idx" ON "system_translations"("language_code");

-- CreateIndex
CREATE UNIQUE INDEX "system_translations_key_id_language_code_key" ON "system_translations"("key_id", "language_code");

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_translations" ADD CONSTRAINT "system_translations_key_id_fkey" FOREIGN KEY ("key_id") REFERENCES "system_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_translations" ADD CONSTRAINT "system_translations_language_code_fkey" FOREIGN KEY ("language_code") REFERENCES "languages"("language_code") ON DELETE CASCADE ON UPDATE CASCADE;
