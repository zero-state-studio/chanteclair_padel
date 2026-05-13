import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  assegnaCategorie,
  computeStandings,
  distribuisciGironi2,
  generaMatchGironi1,
} from "@/lib/gironi";
import { requireAdmin } from "@/lib/api-auth";

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
        where: { fase: 1 },
        include: { groupTeams: { include: { team: true } } },
        orderBy: { posizione: "asc" },
      },
      matches: true,
    },
  });

  if (!torneo) return NextResponse.json({ error: "Torneo non trovato" }, { status: 404 });
  if (torneo.fase !== "GIRONI_1") {
    return NextResponse.json(
      { error: "Fase corrente non è GIRONI_1" },
      { status: 400 }
    );
  }
  if (torneo.groups.length === 0) {
    return NextResponse.json(
      { error: "Sorteggio fase 1 non eseguito" },
      { status: 400 }
    );
  }

  const fase1Matches = torneo.matches.filter(
    (m) => m.groupId !== null && m.round === 0
  );
  const incompleti = fase1Matches.filter((m) => m.stato !== "COMPLETATA");
  if (incompleti.length > 0) {
    return NextResponse.json(
      { error: `Mancano ${incompleti.length} partite fase 1 da completare` },
      { status: 400 }
    );
  }

  // Compute standings per group, then assign categories
  type StandingForCategory = {
    groupPosizione: number;
    teamId: string;
    posizioneFinale: number;
  };
  const standingsAll: StandingForCategory[] = [];
  const standingsUpdates: { id: string; posizioneFinale: number }[] = [];

  for (const group of torneo.groups) {
    const groupMatchesG = fase1Matches.filter((m) => m.groupId === group.id);
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
      standingsUpdates.push({ id: s.groupTeamId, posizioneFinale: s.posizione });
      standingsAll.push({
        groupPosizione: group.posizione,
        teamId: s.teamId,
        posizioneFinale: s.posizione,
      });
    }
  }

  const categories = assegnaCategorie(standingsAll);

  // Fetch full Team rows for shuffling
  const allTeamIds = [...categories.GOLD, ...categories.SILVER, ...categories.BRONZE];
  const teamRows = await prisma.team.findMany({ where: { id: { in: allTeamIds } } });
  const teamById = new Map(teamRows.map((t) => [t.id, t]));

  const goldTeams = categories.GOLD.map((id) => teamById.get(id)!).filter(Boolean);
  const silverTeams = categories.SILVER.map((id) => teamById.get(id)!).filter(Boolean);
  const bronzeTeams = categories.BRONZE.map((id) => teamById.get(id)!).filter(Boolean);

  // Phase 2 group posizione offsets: 100..103 GOLD, 200..203 SILVER, 300..303 BRONZE
  // Use offsets >= 100 to keep distinct from phase 1 (0..11)
  const goldDraft = distribuisciGironi2(goldTeams, "GOLD", 100);
  const silverDraft = distribuisciGironi2(silverTeams, "SILVER", 200);
  const bronzeDraft = distribuisciGironi2(bronzeTeams, "BRONZE", 300);
  const allDrafts = [...goldDraft, ...silverDraft, ...bronzeDraft];
  const allMatchDrafts = generaMatchGironi1(allDrafts);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Persist posizioneFinale on phase-1 groupTeams
        await Promise.all(
          standingsUpdates.map((u) =>
            tx.groupTeam.update({
              where: { id: u.id },
              data: { posizioneFinale: u.posizioneFinale },
            })
          )
        );

        // Create phase-2 groups + matches
        const createdGroups = await Promise.all(
          allDrafts.map((g) =>
            tx.group.create({
              data: {
                tournamentId: torneo.id,
                nome: g.nome,
                posizione: g.posizione,
                fase: 2,
                bracketTipo: g.bracketTipo,
                groupTeams: {
                  create: g.teams
                    .filter((t) => t.teamId !== null)
                    .map((t) => ({ teamId: t.teamId as string, seed: t.seed })),
                },
              },
              select: { id: true, posizione: true },
            })
          )
        );
        const groupIdByPos = new Map<number, string>(
          createdGroups.map((g) => [g.posizione, g.id])
        );

        if (allMatchDrafts.length > 0) {
          await tx.match.createMany({
            data: allMatchDrafts.map((m) => {
              // Find draft to read bracketTipo
              const draft = allDrafts.find((d) => d.posizione === m.groupPosizione)!;
              return {
                tournamentId: torneo.id,
                groupId: groupIdByPos.get(m.groupPosizione)!,
                bracketTipo: draft.bracketTipo,
                round: 0,
                posizione: m.posizione,
                team1Id: m.team1Id,
                team2Id: m.team2Id,
                winnerId: m.winnerTeamId,
                set1Team1: m.set1Team1,
                set1Team2: m.set1Team2,
                punteggio:
                  m.set1Team1 !== null && m.set1Team2 !== null
                    ? `${m.set1Team1}-${m.set1Team2}`
                    : null,
                stato: m.walkover ? "COMPLETATA" : "ATTESA",
                finitaAt: m.walkover ? new Date() : null,
              };
            }),
          });
        }

        // Recompute stats for phase-2 walkover groups
        for (const cg of createdGroups) {
          await recomputeGroupStats(tx, cg.id);
        }

        return tx.tournament.update({
          where: { id: torneo.id },
          data: { fase: "GIRONI_2" },
          include: tournamentInclude,
        });
      },
      { maxWait: 15000, timeout: 60000 }
    );

    return NextResponse.json(result);
  } catch (err) {
    const e = err as Error & { code?: string; meta?: unknown };
    console.error("[genera-gironi-2] error", { id, message: e.message, code: e.code, meta: e.meta });
    return NextResponse.json(
      { error: e.message, code: e.code, meta: e.meta },
      { status: 500 }
    );
  }
}

async function recomputeGroupStats(
  tx: import("@prisma/client").Prisma.TransactionClient,
  groupId: string
) {
  const groupTeams = await tx.groupTeam.findMany({ where: { groupId } });
  const matches = await tx.match.findMany({
    where: { groupId, stato: "COMPLETATA" },
  });
  for (const gt of groupTeams) {
    let punti = 0, gv = 0, gp = 0, n = 0;
    for (const m of matches) {
      const isT1 = m.team1Id === gt.teamId;
      const isT2 = m.team2Id === gt.teamId;
      if (!isT1 && !isT2) continue;
      n++;
      const my = isT1 ? m.set1Team1 ?? 0 : m.set1Team2 ?? 0;
      const opp = isT1 ? m.set1Team2 ?? 0 : m.set1Team1 ?? 0;
      gv += my;
      gp += opp;
      if (m.winnerId === gt.teamId) punti += 2;
      else if (m.winnerId) punti += 1;
    }
    await tx.groupTeam.update({
      where: { id: gt.id },
      data: { punti, gameVinti: gv, gamePersi: gp, matchGiocate: n },
    });
  }
}
