import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Genere } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERI: Genere[] = ["MASCHILE", "FEMMINILE"];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const genere = searchParams.get("genere") ?? undefined;

  const where = genere && GENERI.includes(genere as Genere) ? { genere } : undefined;

  const squadre = await prisma.team.findMany({
    where,
    include: { player1: true, player2: true },
    orderBy: [{ livello: "desc" }, { nome: "asc" }],
  });

  return NextResponse.json(squadre);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "JSON body richiesto" }, { status: 400 });

  const { player1Id, player2Id, livello, genere } = body as {
    player1Id?: string;
    player2Id?: string;
    livello?: number;
    genere?: string;
  };

  if (!player1Id || !player2Id) {
    return NextResponse.json({ error: "player1Id e player2Id richiesti" }, { status: 400 });
  }
  if (player1Id === player2Id) {
    return NextResponse.json({ error: "I due giocatori devono essere diversi" }, { status: 400 });
  }
  if (!genere || !GENERI.includes(genere as Genere)) {
    return NextResponse.json({ error: "Tabellone (MASCHILE|FEMMINILE) richiesto" }, { status: 400 });
  }

  const [p1, p2] = await Promise.all([
    prisma.player.findUnique({ where: { id: player1Id } }),
    prisma.player.findUnique({ where: { id: player2Id } }),
  ]);
  if (!p1 || !p2) return NextResponse.json({ error: "Giocatore non trovato" }, { status: 404 });

  const livelloFinal = Number.isFinite(Number(livello)) ? parseInt(String(livello ?? 0), 10) : 0;
  const nome = `${p1.cognome} / ${p2.cognome}`;

  try {
    const team = await prisma.team.create({
      data: {
        nome,
        genere,
        livello: livelloFinal,
        player1Id: p1.id,
        player2Id: p2.id,
      },
      include: { player1: true, player2: true },
    });
    return NextResponse.json(team, { status: 201 });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Uno dei giocatori è già in un'altra squadra" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
