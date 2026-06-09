-- CreateIndex
CREATE INDEX "Group_tournamentId_idx" ON "Group"("tournamentId");

-- CreateIndex
CREATE INDEX "GroupTeam_teamId_idx" ON "GroupTeam"("teamId");

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
CREATE INDEX "Tournament_genere_stato_idx" ON "Tournament"("genere", "stato");

-- Enable RLS on tables exposed via PostgREST anon key.
-- Prisma uses the postgres role which BYPASSRLS, so app keeps working.
-- No policies = default deny for anon/authenticated roles.
ALTER TABLE "Team" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Group" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GroupTeam" ENABLE ROW LEVEL SECURITY;
