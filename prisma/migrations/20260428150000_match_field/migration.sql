-- AlterTable
ALTER TABLE "Match" ADD COLUMN "fieldId" TEXT;

-- CreateIndex
CREATE INDEX "Match_fieldId_idx" ON "Match"("fieldId");

-- AddForeignKey
ALTER TABLE "Match"
  ADD CONSTRAINT "Match_fieldId_fkey"
  FOREIGN KEY ("fieldId") REFERENCES "Field"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
