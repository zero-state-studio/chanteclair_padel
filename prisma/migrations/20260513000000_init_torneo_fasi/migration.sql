-- CreateTable
CREATE TABLE "Sponsor" (
    "id" TEXT NOT NULL,
    "nome" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Field" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descrizione" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cognome" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "fotoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "genere" TEXT NOT NULL,
    "stato" TEXT NOT NULL DEFAULT 'BOZZA',
    "fase" TEXT NOT NULL DEFAULT 'BOZZA',
    "anno" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "posizione" INTEGER NOT NULL,
    "fase" INTEGER NOT NULL DEFAULT 1,
    "bracketTipo" TEXT,
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

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "groupId" TEXT,
    "bracketTipo" TEXT,
    "round" INTEGER NOT NULL,
    "posizione" INTEGER NOT NULL,
    "team1Id" TEXT,
    "team2Id" TEXT,
    "winnerId" TEXT,
    "sponsorId" TEXT,
    "fieldId" TEXT,
    "punteggio" TEXT,
    "set1Team1" INTEGER,
    "set1Team2" INTEGER,
    "tieBreakTeam1" INTEGER,
    "tieBreakTeam2" INTEGER,
    "stato" TEXT NOT NULL DEFAULT 'ATTESA',
    "iniziataAt" TIMESTAMP(3),
    "finitaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_email_key" ON "Player"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Team_player1Id_key" ON "Team"("player1Id");

-- CreateIndex
CREATE UNIQUE INDEX "Team_player2Id_key" ON "Team"("player2Id");

-- CreateIndex
CREATE INDEX "Tournament_genere_stato_idx" ON "Tournament"("genere", "stato");

-- CreateIndex
CREATE INDEX "Group_tournamentId_idx" ON "Group"("tournamentId");

-- CreateIndex
CREATE INDEX "Group_tournamentId_fase_bracketTipo_idx" ON "Group"("tournamentId", "fase", "bracketTipo");

-- CreateIndex
CREATE INDEX "GroupTeam_teamId_idx" ON "GroupTeam"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupTeam_groupId_teamId_key" ON "GroupTeam"("groupId", "teamId");

-- CreateIndex
CREATE INDEX "Match_tournamentId_idx" ON "Match"("tournamentId");

-- CreateIndex
CREATE INDEX "Match_groupId_idx" ON "Match"("groupId");

-- CreateIndex
CREATE INDEX "Match_team1Id_idx" ON "Match"("team1Id");

-- CreateIndex
CREATE INDEX "Match_team2Id_idx" ON "Match"("team2Id");

-- CreateIndex
CREATE INDEX "Match_winnerId_idx" ON "Match"("winnerId");

-- CreateIndex
CREATE INDEX "Match_stato_idx" ON "Match"("stato");

-- CreateIndex
CREATE INDEX "Match_sponsorId_idx" ON "Match"("sponsorId");

-- CreateIndex
CREATE INDEX "Match_fieldId_idx" ON "Match"("fieldId");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupTeam" ADD CONSTRAINT "GroupTeam_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupTeam" ADD CONSTRAINT "GroupTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_team1Id_fkey" FOREIGN KEY ("team1Id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_team2Id_fkey" FOREIGN KEY ("team2Id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("id") ON DELETE SET NULL ON UPDATE CASCADE;

