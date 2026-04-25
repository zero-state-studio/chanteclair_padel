import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generaBracket } from "@/lib/bracket";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const torneo = await prisma.tournament.findUnique({ where: { id } });
  if (!torneo) {
    return NextResponse.json({ error: "Torneo non trovato" }, { status: 404 });
  }

  const giocatori = await prisma.player.findMany({
    where: { genere: torneo.genere },
  });

  if (giocatori.length < 2) {
    return NextResponse.json(
      { error: "Servono almeno 2 giocatori per il sorteggio" },
      { status: 400 }
    );
  }

  const matches = generaBracket(giocatori, torneo.id);

  const result = await prisma.$transaction(async (tx) => {
    await tx.match.deleteMany({ where: { tournamentId: torneo.id } });
    await tx.match.createMany({ data: matches });
    return tx.tournament.update({
      where: { id: torneo.id },
      data: { stato: "ATTIVO" },
      include: {
        matches: {
          include: { player1: true, player2: true, winner: true },
          orderBy: [{ round: "desc" }, { posizione: "asc" }],
        },
      },
    });
  });

  return NextResponse.json(result);
}
