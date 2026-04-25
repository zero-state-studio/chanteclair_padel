import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sseEmitter } from "@/lib/sse";
import type { Genere, LiveEvent, PlayerWithMatches } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

const matchInclude = {
  player1: true,
  player2: true,
  winner: true,
  tournament: true,
} as const;

function toPlayerWithMatches(
  p: { id: string; nome: string; cognome: string; email: string | null; telefono: string | null; fotoUrl: string | null; genere: string; livello: number } | null
): PlayerWithMatches | null {
  if (!p) return null;
  return {
    id: p.id,
    nome: p.nome,
    cognome: p.cognome,
    email: p.email,
    telefono: p.telefono,
    fotoUrl: p.fotoUrl,
    genere: p.genere as Genere,
    livello: p.livello,
  };
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const match = await prisma.match.findUnique({
    where: { id },
    include: matchInclude,
  });
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(match);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "JSON body richiesto" }, { status: 400 });

  const { azione, winnerId, punteggio } = body as {
    azione?: string;
    winnerId?: string;
    punteggio?: string;
  };

  const match = await prisma.match.findUnique({ where: { id }, include: matchInclude });
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (azione === "INIZIA") {
    if (!match.player1Id || !match.player2Id) {
      return NextResponse.json(
        { error: "Partita senza giocatori non può iniziare" },
        { status: 400 }
      );
    }

    const updated = await prisma.match.update({
      where: { id },
      data: { stato: "IN_CORSO", iniziataAt: new Date() },
      include: matchInclude,
    });

    const event: LiveEvent = {
      tipo: "PARTITA_INIZIATA",
      matchId: updated.id,
      player1: toPlayerWithMatches(updated.player1)!,
      player2: toPlayerWithMatches(updated.player2)!,
      genere: updated.tournament.genere as Genere,
    };
    sseEmitter.emit("live-event", event);

    return NextResponse.json(updated);
  }

  if (azione === "TERMINA") {
    if (!winnerId || !punteggio) {
      return NextResponse.json(
        { error: "winnerId e punteggio richiesti" },
        { status: 400 }
      );
    }
    if (winnerId !== match.player1Id && winnerId !== match.player2Id) {
      return NextResponse.json(
        { error: "winnerId deve essere uno dei giocatori della partita" },
        { status: 400 }
      );
    }

    const updated = await prisma.match.update({
      where: { id },
      data: {
        stato: "COMPLETATA",
        finitaAt: new Date(),
        winnerId,
        punteggio,
      },
      include: matchInclude,
    });

    await promoteWinner(updated);

    const event: LiveEvent = {
      tipo: "PARTITA_FINITA",
      matchId: updated.id,
      player1: toPlayerWithMatches(updated.player1)!,
      player2: toPlayerWithMatches(updated.player2)!,
      winner: toPlayerWithMatches(updated.winner) ?? undefined,
      punteggio: updated.punteggio ?? undefined,
      genere: updated.tournament.genere as Genere,
    };
    sseEmitter.emit("live-event", event);

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Azione non valida" }, { status: 400 });
}

type MatchForPromotion = {
  id: string;
  tournamentId: string;
  round: number;
  posizione: number;
  winnerId: string | null;
};

async function promoteWinner(match: MatchForPromotion) {
  const nextRound = match.round - 1;
  if (nextRound < 1 || !match.winnerId) return;

  const nextPosizione = Math.floor(match.posizione / 2);

  const nextMatch = await prisma.match.findFirst({
    where: {
      tournamentId: match.tournamentId,
      round: nextRound,
      posizione: nextPosizione,
    },
  });
  if (!nextMatch) return;

  const isPlayer1 = match.posizione % 2 === 0;
  await prisma.match.update({
    where: { id: nextMatch.id },
    data: isPlayer1 ? { player1Id: match.winnerId } : { player2Id: match.winnerId },
  });
}
