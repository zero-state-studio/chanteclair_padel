import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { distribuisciGironi1, generaMatchGironi1 } from "@/lib/gironi";
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

  const torneo = await prisma.tournament.findUnique({ where: { id } });
  if (!torneo) {
    return NextResponse.json({ error: "Torneo non trovato" }, { status: 404 });
  }

  const squadre = await prisma.team.findMany({
    where: { genere: torneo.genere },
  });

  if (squadre.length < 2) {
    return NextResponse.json(
      { error: "Servono almeno 2 squadre per il sorteggio" },
      { status: 400 }
    );
  }

  const { gironi, warnings } = distribuisciGironi1(squadre);
  const matchDrafts = generaMatchGironi1(gironi);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Hard reset existing rounds for this tournament
        await tx.match.deleteMany({ where: { tournamentId: torneo.id } });
        await tx.group.deleteMany({ where: { tournamentId: torneo.id } });

        const createdGroups = await Promise.all(
          gironi.map((g) =>
            tx.group.create({
              data: {
                tournamentId: torneo.id,
                nome: g.nome,
                posizione: g.posizione,
                fase: 1,
                bracketTipo: null,
                groupTeams: {
                  create: g.teams
                    .filter((t) => t.teamId !== null)
                    .map((t) => ({
                      teamId: t.teamId as string,
                      seed: t.seed,
                    })),
                },
              },
              select: { id: true, posizione: true },
            })
          )
        );
        const groupIdByPos = new Map<number, string>(
          createdGroups.map((g) => [g.posizione, g.id])
        );

        if (matchDrafts.length > 0) {
          await tx.match.createMany({
            data: matchDrafts.map((m) => ({
              tournamentId: torneo.id,
              groupId: groupIdByPos.get(m.groupPosizione)!,
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
            })),
          });
        }

        // Recompute group stats for walkover-affected groups
        const groupIds = createdGroups.map((g) => g.id);
        for (const gid of groupIds) {
          await recomputeGroupStats(tx, gid);
        }

        return tx.tournament.update({
          where: { id: torneo.id },
          data: { fase: "GIRONI_1" },
          include: tournamentInclude,
        });
      },
      { maxWait: 15000, timeout: 60000 }
    );

    return NextResponse.json({ ...result, warnings });
  } catch (err) {
    const e = err as Error & { code?: string; meta?: unknown };
    console.error("[sorteggio] error", {
      id,
      message: e.message,
      code: e.code,
      meta: e.meta,
    });
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
