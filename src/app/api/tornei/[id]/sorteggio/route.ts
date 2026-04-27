import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { distribuisciGironi, generaMatchGironi } from "@/lib/gironi";

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

  const result = await prisma.$transaction(async (tx) => {
    await tx.match.deleteMany({ where: { tournamentId: torneo.id } });
    await tx.group.deleteMany({ where: { tournamentId: torneo.id } });

    // Crea gironi + groupTeams
    const groupIdByPos = new Map<number, string>();
    for (const g of gironi) {
      const created = await tx.group.create({
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
      });
      groupIdByPos.set(g.posizione, created.id);
    }

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
  });

  return NextResponse.json(result);
}
