-- Wipe existing tournaments (dev-only, format change)
DELETE FROM "Tournament";

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "bracketTipo" TEXT,
ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "set1Team1" INTEGER,
ADD COLUMN     "set1Team2" INTEGER,
ADD COLUMN     "tieBreakTeam1" INTEGER,
ADD COLUMN     "tieBreakTeam2" INTEGER;

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "fase" TEXT NOT NULL DEFAULT 'GIRONI';

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "posizione" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupTeam" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "seed" INTEGER,
    "punti" INTEGER NOT NULL DEFAULT 0,
    "gameVinti" INTEGER NOT NULL DEFAULT 0,
    "gamePersi" INTEGER NOT NULL DEFAULT 0,
    "matchGiocate" INTEGER NOT NULL DEFAULT 0,
    "posizioneFinale" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupTeam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupTeam_groupId_teamId_key" ON "GroupTeam"("groupId", "teamId");

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupTeam" ADD CONSTRAINT "GroupTeam_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupTeam" ADD CONSTRAINT "GroupTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
