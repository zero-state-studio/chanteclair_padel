-- AlterTable
ALTER TABLE "Match" ADD COLUMN "sponsorId" TEXT;

-- CreateIndex
CREATE INDEX "Match_sponsorId_idx" ON "Match"("sponsorId");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
