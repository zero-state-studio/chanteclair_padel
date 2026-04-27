import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { distribuisciGironi, generaMatchGironi } from "@/lib/gironi";
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

  const gironi = distribuisciGironi(squadre);
  const matchDrafts = generaMatchGironi(gironi);

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.match.deleteMany({ where: { tournamentId: torneo.id } });
      await tx.group.deleteMany({ where: { tournamentId: torneo.id } });

      // Crea gironi + groupTeams in parallelo
      const createdGroups = await Promise.all(
        gironi.map((g) =>
          tx.group.create({
            data: {
              tournamentId: torneo.id,
              nome: g.nome,
              posizione: g.posizione,
              groupTeams: {
                create: g.teams.map((t) => ({
                  teamId: t.teamId,
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

      // Crea match girone (round 0, identifica fase via groupId)
      if (matchDrafts.length > 0) {
        await tx.match.createMany({
          data: matchDrafts.map((m) => ({
            tournamentId: torneo.id,
            groupId: groupIdByPos.get(m.groupPosizione)!,
            round: 0,
            posizione: m.posizione,
            team1Id: m.team1Id,
            team2Id: m.team2Id,
            stato: "ATTESA",
          })),
        });
      }

      return tx.tournament.update({
        where: { id: torneo.id },
        data: { stato: "ATTIVO", fase: "GIRONI" },
        include: tournamentInclude,
      });
    }, { maxWait: 10000, timeout: 30000 });

    return NextResponse.json(result);
  } catch (err) {
    const e = err as Error & { code?: string; meta?: unknown };
    console.error("[sorteggio] error", { id, message: e.message, code: e.code, meta: e.meta });
    return NextResponse.json(
      { error: e.message, code: e.code, meta: e.meta },
      { status: 500 }
    );
  }
}
