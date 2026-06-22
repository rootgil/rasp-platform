-- DropForeignKey
ALTER TABLE "BreakGlassToken" DROP CONSTRAINT "BreakGlassToken_createdById_fkey";

-- AddForeignKey
ALTER TABLE "BreakGlassToken" ADD CONSTRAINT "BreakGlassToken_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
