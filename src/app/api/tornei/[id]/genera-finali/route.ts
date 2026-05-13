import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeStandings } from "@/lib/gironi";
import { generaFinali } from "@/lib/bracket";
import { requireAdmin } from "@/lib/api-auth";

type RouteContext = { params: Promise<{ id: string }> };
type Categoria = "GOLD" | "SILVER" | "BRONZE";

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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const { id } = await params;

  const torneo = await prisma.tournament.findUnique({
    where: { id },
    include: {
      groups: {
        where: { fase: 2 },
        include: { groupTeams: { include: { team: true } } },
        orderBy: { posizione: "asc" },
      },
      matches: true,
    },
  });

  if (!torneo) return NextResponse.json({ error: "Torneo non trovato" }, { status: 404 });
  if (torneo.fase !== "GIRONI_2") {
    return NextResponse.json({ error: "Fase corrente non è GIRONI_2" }, { status: 400 });
  }

  const phase2GroupIds = new Set(torneo.groups.map((g) => g.id));
  const fase2Matches = torneo.matches.filter(
    (m) => m.groupId !== null && phase2GroupIds.has(m.groupId) && m.round === 0
  );
  const incompleti = fase2Matches.filter((m) => m.stato !== "COMPLETATA");
  if (incompleti.length > 0) {
    return NextResponse.json(
      { error: `Mancano ${incompleti.length} partite fase 2 da completare` },
      { status: 400 }
    );
  }

  // For each phase-2 group, pick the 1st-place team
  const primaPerCategoria: Record<Categoria, string[]> = {
    GOLD: [],
    SILVER: [],
    BRONZE: [],
  };
  const standingsUpdates: { id: string; posizioneFinale: number }[] = [];

  for (const group of torneo.groups) {
    const groupMatchesG = fase2Matches.filter((m) => m.groupId === group.id);
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
    }
    const primo = standings.find((s) => s.posizione === 1);
    const categoria = group.bracketTipo as Categoria | null;
    if (primo && categoria) {
      primaPerCategoria[categoria].push(primo.teamId);
    }
  }

  // Random pairing per category
  const allDrafts = (["GOLD", "SILVER", "BRONZE"] as const).flatMap((cat) => {
    const teams = shuffle(primaPerCategoria[cat]);
    if (teams.length === 0) return [];
    return generaFinali(teams, torneo.id, cat);
  });

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        await Promise.all(
          standingsUpdates.map((u) =>
            tx.groupTeam.update({
              where: { id: u.id },
              data: { posizioneFinale: u.posizioneFinale },
            })
          )
        );

        if (allDrafts.length > 0) {
          await tx.match.createMany({ data: allDrafts });
        }

        return tx.tournament.update({
          where: { id: torneo.id },
          data: { fase: "FINALI" },
          include: tournamentInclude,
        });
      },
      { maxWait: 10000, timeout: 30000 }
    );

    return NextResponse.json(result);
  } catch (err) {
    const e = err as Error & { code?: string; meta?: unknown };
    console.error("[genera-finali] error", { id, message: e.message, code: e.code, meta: e.meta });
    return NextResponse.json(
      { error: e.message, code: e.code, meta: e.meta },
      { status: 500 }
    );
  }
}
