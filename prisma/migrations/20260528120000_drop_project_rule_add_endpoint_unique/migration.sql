-- Drop ProjectRule table and its references
DROP TABLE "ProjectRule";

-- Remove projectRules relation columns already handled by cascade; clean up Rule
ALTER TABLE "Rule" DROP COLUMN IF EXISTS "severity" CASCADE;
ALTER TABLE "Rule" ADD COLUMN IF NOT EXISTS "severity" TEXT NOT NULL DEFAULT 'medium';

-- Add unique constraint on DiscoveredEndpoint
CREATE UNIQUE INDEX IF NOT EXISTS "DiscoveredEndpoint_projectId_method_pathPattern_key"
  ON "DiscoveredEndpoint"("projectId", "method", "pathPattern");
