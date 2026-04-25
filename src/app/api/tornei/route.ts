import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Genere, StatoTorneo } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERI: Genere[] = ["MASCHILE", "FEMMINILE"];
const STATI: StatoTorneo[] = ["BOZZA", "ATTIVO", "CONCLUSO"];

const matchInclude = {
  team1: { include: { player1: true, player2: true } },
  team2: { include: { player1: true, player2: true } },
  winner: { include: { player1: true, player2: true } },
} as const;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const genere = searchParams.get("genere") ?? undefined;

  const where = genere && GENERI.includes(genere as Genere) ? { genere } : undefined;

  const tornei = await prisma.tournament.findMany({
    where,
    include: {
      matches: {
        include: matchInclude,
        orderBy: [{ round: "desc" }, { posizione: "asc" }],
      },
    },
    orderBy: [{ anno: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(tornei);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "JSON body richiesto" }, { status: 400 });
  }

  const { nome, genere, anno, stato } = body as {
    nome?: string;
    genere?: string;
    anno?: number;
    stato?: string;
  };

  if (!nome || typeof nome !== "string") {
    return NextResponse.json({ error: "nome richiesto" }, { status: 400 });
  }
  if (!genere || !GENERI.includes(genere as Genere)) {
    return NextResponse.json({ error: "genere deve essere MASCHILE o FEMMINILE" }, { status: 400 });
  }
  if (typeof anno !== "number" || !Number.isInteger(anno)) {
    return NextResponse.json({ error: "anno richiesto (intero)" }, { status: 400 });
  }
  const statoFinal = stato && STATI.includes(stato as StatoTorneo) ? stato : "BOZZA";

  const torneo = await prisma.tournament.create({
    data: { nome: nome.trim(), genere, anno, stato: statoFinal },
  });

  return NextResponse.json(torneo, { status: 201 });
}
