-- AlterTable: Add type column to Block
ALTER TABLE "Block" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'content';

-- CreateNewEnum: Create new WebsiteState enum with all states
CREATE TYPE "WebsiteState_new" AS ENUM ('STRATEGIE_DIGITALE', 'CHARTE_GRAPHIQUE', 'WIREFRAME', 'STRATEGIE_SEO', 'GENERATE_CONTENT', 'READY_TO_BE_PUBLISH', 'PUBLISHED', 'ARCHIVED', 'UNPUBLISHED');

-- AlterTable: Convert existing data (DRAFT -> STRATEGIE_DIGITALE, PUBLISH -> PUBLISHED)
ALTER TABLE "websites" ALTER COLUMN "state" DROP DEFAULT;
ALTER TABLE "websites" ALTER COLUMN "state" TYPE "WebsiteState_new" USING (
  CASE "state"::text
    WHEN 'DRAFT' THEN 'STRATEGIE_DIGITALE'::text
    WHEN 'PUBLISH' THEN 'PUBLISHED'::text
    ELSE 'STRATEGIE_DIGITALE'::text
  END
)::text::"WebsiteState_new";

-- DropOldEnum: Remove old enum
DROP TYPE "WebsiteState";

-- RenameEnum: Rename new enum to original name
ALTER TYPE "WebsiteState_new" RENAME TO "WebsiteState";

-- SetDefault: Set new default value
ALTER TABLE "websites" ALTER COLUMN "state" SET DEFAULT 'STRATEGIE_DIGITALE'::"WebsiteState";
