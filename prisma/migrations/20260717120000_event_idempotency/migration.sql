-- AlterTable
ALTER TABLE "SecurityEvent" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SecurityEvent_projectId_createdAt_idx" ON "SecurityEvent"("projectId", "createdAt");

-- CreateUniqueIndex (NULLs are distinct in Postgres unique constraints)
CREATE UNIQUE INDEX IF NOT EXISTS "SecurityEvent_projectId_idempotencyKey_key" ON "SecurityEvent"("projectId", "idempotencyKey");
