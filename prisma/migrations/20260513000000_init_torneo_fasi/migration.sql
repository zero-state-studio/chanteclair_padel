-- AlterTable
ALTER TABLE "Group" ADD COLUMN "fase" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Group" ADD COLUMN "bracketTipo" TEXT;

-- CreateIndex
CREATE INDEX "Group_tournamentId_fase_bracketTipo_idx" ON "Group"("tournamentId", "fase", "bracketTipo");
