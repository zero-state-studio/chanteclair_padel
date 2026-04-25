import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Genere, StatoPartita } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERI: Genere[] = ["MASCHILE", "FEMMINILE"];
const STATI: StatoPartita[] = ["ATTESA", "IN_CORSO", "COMPLETATA"];

const matchInclude = {
  team1: { include: { player1: true, player2: true } },
  team2: { include: { player1: true, player2: true } },
  winner: { include: { player1: true, player2: true } },
  tournament: true,
} as const;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const genere = searchParams.get("genere") ?? undefined;
  const stato = searchParams.get("stato") ?? undefined;
  const tournamentId = searchParams.get("tournamentId") ?? undefined;

  const where: Record<string, unknown> = {};
  if (tournamentId) where.tournamentId = tournamentId;
  if (stato && STATI.includes(stato as StatoPartita)) where.stato = stato;
  if (genere && GENERI.includes(genere as Genere)) {
    where.tournament = { genere };
  }

  const matches = await prisma.match.findMany({
    where,
    include: matchInclude,
    orderBy: [{ round: "desc" }, { posizione: "asc" }],
  });

  return NextResponse.json(matches);
}
