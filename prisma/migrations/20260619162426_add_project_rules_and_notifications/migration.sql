-- AlterTable
ALTER TABLE "Rule" ADD COLUMN     "pattern" TEXT,
ADD COLUMN     "target" TEXT NOT NULL DEFAULT 'any',
ADD COLUMN     "yamlDefinition" TEXT;

-- CreateTable
CREATE TABLE "ProjectRule" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "catalogueRuleId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'custom',
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "yamlDefinition" TEXT NOT NULL,
    "pattern" TEXT,
    "target" TEXT NOT NULL DEFAULT 'any',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogueRuleNotification" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "seenAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogueRuleNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectRule_projectId_idx" ON "ProjectRule"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectRule_projectId_catalogueRuleId_key" ON "ProjectRule"("projectId", "catalogueRuleId");

-- CreateIndex
CREATE INDEX "CatalogueRuleNotification_projectId_status_idx" ON "CatalogueRuleNotification"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogueRuleNotification_ruleId_projectId_key" ON "CatalogueRuleNotification"("ruleId", "projectId");

-- AddForeignKey
ALTER TABLE "ProjectRule" ADD CONSTRAINT "ProjectRule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRule" ADD CONSTRAINT "ProjectRule_catalogueRuleId_fkey" FOREIGN KEY ("catalogueRuleId") REFERENCES "Rule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogueRuleNotification" ADD CONSTRAINT "CatalogueRuleNotification_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogueRuleNotification" ADD CONSTRAINT "CatalogueRuleNotification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
