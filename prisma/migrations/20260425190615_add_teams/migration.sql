/*
  Warnings:

  - You are about to drop the column `player1Id` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `player2Id` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `livello` on the `Player` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_player1Id_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_player2Id_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_winnerId_fkey";

-- AlterTable
ALTER TABLE "Match" DROP COLUMN "player1Id",
DROP COLUMN "player2Id",
ADD COLUMN     "team1Id" TEXT,
ADD COLUMN     "team2Id" TEXT;

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "livello";

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "genere" TEXT NOT NULL,
    "livello" INTEGER NOT NULL DEFAULT 0,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_player1Id_key" ON "Team"("player1Id");

-- CreateIndex
CREATE UNIQUE INDEX "Team_player2Id_key" ON "Team"("player2Id");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_team1Id_fkey" FOREIGN KEY ("team1Id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_team2Id_fkey" FOREIGN KEY ("team2Id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
