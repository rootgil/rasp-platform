-- Transform Rule from per-project to global catalogue
ALTER TABLE "Rule" DROP CONSTRAINT "Rule_projectId_fkey";
ALTER TABLE "Rule" DROP COLUMN "projectId";
ALTER TABLE "Rule" DROP COLUMN "mode";

ALTER TABLE "Rule" ADD COLUMN "severity" TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE "Rule" ADD COLUMN "description" TEXT;
ALTER TABLE "Rule" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "Rule_name_key" ON "Rule"("name");

-- CreateTable ProjectRule
CREATE TABLE "ProjectRule" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectRule_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProjectRule" ADD CONSTRAINT "ProjectRule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectRule" ADD CONSTRAINT "ProjectRule_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ProjectRule_projectId_ruleId_key" ON "ProjectRule"("projectId", "ruleId");

-- Drop default (Prisma updatedAt convention)
ALTER TABLE "ProjectRule" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "Rule" ALTER COLUMN "updatedAt" DROP DEFAULT;
