import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeStandings } from "@/lib/gironi";
import { generaBracket } from "@/lib/bracket";
import { requireAdmin } from "@/lib/api-auth";
import type { Team } from "@prisma/client";

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
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
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

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Persisti posizioneFinale + genera match bracket in parallelo
      const allBracketMatches = (["GOLD", "SILVER", "BRONZE"] as const).flatMap(
        (tipo) => {
          const teams = bracketTeams[tipo];
          if (teams.length < 2) return [];
          return generaBracket(teams, torneo.id, tipo);
        }
      );

      await Promise.all([
        ...standingsUpdates.map((u) =>
          tx.groupTeam.update({
            where: { id: u.id },
            data: { posizioneFinale: u.posizioneFinale },
          })
        ),
        allBracketMatches.length > 0
          ? tx.match.createMany({ data: allBracketMatches })
          : Promise.resolve(),
      ]);

      return tx.tournament.update({
        where: { id: torneo.id },
        data: { fase: "BRACKET" },
        include: tournamentInclude,
      });
    }, { maxWait: 10000, timeout: 30000 });

    return NextResponse.json(result);
  } catch (err) {
    const e = err as Error & { code?: string; meta?: unknown };
    console.error("[genera-bracket] error", { id, message: e.message, code: e.code, meta: e.meta });
    return NextResponse.json(
      { error: e.message, code: e.code, meta: e.meta },
      { status: 500 }
    );
  }
}
