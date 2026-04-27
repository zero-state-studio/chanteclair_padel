import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeStandings } from "@/lib/gironi";
import { generaBracket } from "@/lib/bracket";
import type { Team } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const tournamentInclude = {
  matches: {
    include: {
      team1: { include: { player1: true, player2: true } },
      team2: { include: { player1: true, player2: true } },
      winner: { include: { player1: true, player2: true } },
    },
    orderBy: [{ round: "desc" }, { posizione: "asc" }],
  },
  groups: {
    include: {
      groupTeams: {
        include: { team: { include: { player1: true, player2: true } } },
      },
    },
    orderBy: { posizione: "asc" },
  },
} satisfies import("@prisma/client").Prisma.TournamentInclude;

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const torneo = await prisma.tournament.findUnique({
    where: { id },
    include: {
      groups: {
        include: {
          groupTeams: { include: { team: true } },
        },
        orderBy: { posizione: "asc" },
      },
      matches: true,
    },
  });

  if (!torneo) {
    return NextResponse.json({ error: "Torneo non trovato" }, { status: 404 });
  }
  if (torneo.fase !== "GIRONI") {
    return NextResponse.json(
      { error: "Bracket già generato o fase non corretta" },
      { status: 400 }
    );
  }
  if (torneo.groups.length === 0) {
    return NextResponse.json(
      { error: "Sorteggio gironi non eseguito" },
      { status: 400 }
    );
  }

  const groupMatches = torneo.matches.filter((m) => m.groupId !== null);
  const incompleti = groupMatches.filter((m) => m.stato !== "COMPLETATA");
  if (incompleti.length > 0) {
    return NextResponse.json(
      { error: `Mancano ${incompleti.length} partite girone da completare` },
      { status: 400 }
    );
  }

  // Calcola classifica per girone e raggruppa per posizione finale
  const teamsPerPosition = new Map<number, Team[]>();
  const standingsUpdates: { id: string; posizioneFinale: number }[] = [];

  for (const group of torneo.groups) {
    const groupMatchesG = groupMatches.filter((m) => m.groupId === group.id);
    const standings = computeStandings(
      group.groupTeams.map((gt) => ({
        groupTeamId: gt.id,
        teamId: gt.teamId,
        punti: gt.punti,
        gameVinti: gt.gameVinti,
        gamePersi: gt.gamePersi,
        matchGiocate: gt.matchGiocate,
      })),
      groupMatchesG.map((m) => ({
        team1Id: m.team1Id ?? "",
        team2Id: m.team2Id ?? "",
        winnerId: m.winnerId,
      }))
    );

    for (const s of standings) {
      const gt = group.groupTeams.find((x) => x.id === s.groupTeamId)!;
      standingsUpdates.push({ id: gt.id, posizioneFinale: s.posizione });
      const arr = teamsPerPosition.get(s.posizione) ?? [];
      arr.push(gt.team);
      teamsPerPosition.set(s.posizione, arr);
    }
  }

  const bracketTeams: Record<"GOLD" | "SILVER" | "BRONZE", Team[]> = {
    GOLD: teamsPerPosition.get(1) ?? [],
    SILVER: teamsPerPosition.get(2) ?? [],
    BRONZE: teamsPerPosition.get(3) ?? [],
  };

  const result = await prisma.$transaction(async (tx) => {
    // Persisti posizioneFinale
    for (const u of standingsUpdates) {
      await tx.groupTeam.update({
        where: { id: u.id },
        data: { posizioneFinale: u.posizioneFinale },
      });
    }

    // Genera match bracket
    for (const tipo of ["GOLD", "SILVER", "BRONZE"] as const) {
      const teams = bracketTeams[tipo];
      if (teams.length < 2) continue;
      const matches = generaBracket(teams, torneo.id, tipo);
      await tx.match.createMany({ data: matches });
    }

    return tx.tournament.update({
      where: { id: torneo.id },
      data: { fase: "BRACKET" },
      include: tournamentInclude,
    });
  });

  return NextResponse.json(result);
}
