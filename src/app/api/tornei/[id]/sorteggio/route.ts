import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generaBracket } from "@/lib/bracket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

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

  const matches = generaBracket(squadre, torneo.id);

  const result = await prisma.$transaction(async (tx) => {
    await tx.match.deleteMany({ where: { tournamentId: torneo.id } });
    await tx.match.createMany({ data: matches });
    return tx.tournament.update({
      where: { id: torneo.id },
      data: { stato: "ATTIVO" },
      include: {
        matches: {
          include: {
            team1: { include: { player1: true, player2: true } },
            team2: { include: { player1: true, player2: true } },
            winner: { include: { player1: true, player2: true } },
          },
          orderBy: [{ round: "desc" }, { posizione: "asc" }],
        },
      },
    });
  });

  return NextResponse.json(result);
}
