-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "WebsiteState" AS ENUM ('DRAFT', 'PUBLISH');

-- CreateEnum
CREATE TYPE "PageState" AS ENUM ('DRAFT', 'PUBLISH');

-- CreateTable
CREATE TABLE "workspaces" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "settings" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_workspaces" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'VIEWER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "websites" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "state" "WebsiteState" NOT NULL DEFAULT 'DRAFT',
    "workspace_id" INTEGER NOT NULL,
    "domain" TEXT,
    "favicon_url" TEXT,
    "settings" JSONB,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "websites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "structure" JSONB,
    "website_id" INTEGER NOT NULL,
    "parent_id" INTEGER,
    "state" "PageState" NOT NULL DEFAULT 'DRAFT',
    "lang" VARCHAR(10) NOT NULL DEFAULT 'fr',
    "is_homepage" BOOLEAN NOT NULL DEFAULT false,
    "meta_title" TEXT,
    "meta_description" TEXT,
    "meta_image_url" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_versions" (
    "id" SERIAL NOT NULL,
    "page_id" INTEGER NOT NULL,
    "version_number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "structure" JSONB,
    "state" "PageState" NOT NULL,
    "lang" VARCHAR(10) NOT NULL,
    "meta_title" TEXT,
    "meta_description" TEXT,
    "meta_image_url" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workspaces_is_active_idx" ON "workspaces"("is_active");

-- CreateIndex
CREATE INDEX "workspaces_deleted_at_idx" ON "workspaces"("deleted_at");

-- CreateIndex
CREATE INDEX "user_workspaces_workspace_id_idx" ON "user_workspaces"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_workspaces_user_id_workspace_id_key" ON "user_workspaces"("user_id", "workspace_id");

-- CreateIndex
CREATE INDEX "websites_workspace_id_idx" ON "websites"("workspace_id");

-- CreateIndex
CREATE INDEX "websites_state_idx" ON "websites"("state");

-- CreateIndex
CREATE INDEX "websites_deleted_at_idx" ON "websites"("deleted_at");

-- CreateIndex
CREATE INDEX "pages_website_id_idx" ON "pages"("website_id");

-- CreateIndex
CREATE INDEX "pages_parent_id_idx" ON "pages"("parent_id");

-- CreateIndex
CREATE INDEX "pages_state_idx" ON "pages"("state");

-- CreateIndex
CREATE INDEX "pages_lang_idx" ON "pages"("lang");

-- CreateIndex
CREATE INDEX "pages_deleted_at_idx" ON "pages"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "pages_website_id_slug_key" ON "pages"("website_id", "slug");

-- CreateIndex
CREATE INDEX "page_versions_page_id_idx" ON "page_versions"("page_id");

-- CreateIndex
CREATE UNIQUE INDEX "page_versions_page_id_version_number_key" ON "page_versions"("page_id", "version_number");

-- AddForeignKey
ALTER TABLE "user_workspaces" ADD CONSTRAINT "user_workspaces_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_workspaces" ADD CONSTRAINT "user_workspaces_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "websites" ADD CONSTRAINT "websites_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_versions" ADD CONSTRAINT "page_versions_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_versions" ADD CONSTRAINT "page_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
