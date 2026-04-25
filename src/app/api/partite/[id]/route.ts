import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sseEmitter } from "@/lib/sse";
import type { Genere, LiveEvent, PlayerWithMatches, TeamWithPlayers } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const matchInclude = {
  team1: { include: { player1: true, player2: true } },
  team2: { include: { player1: true, player2: true } },
  winner: { include: { player1: true, player2: true } },
  tournament: true,
} as const;

type DbPlayer = {
  id: string;
  nome: string;
  cognome: string;
  email: string | null;
  telefono: string | null;
  fotoUrl: string | null;
  genere: string;
};

type DbTeam = {
  id: string;
  nome: string;
  genere: string;
  livello: number;
  player1: DbPlayer;
  player2: DbPlayer;
};

function toPlayer(p: DbPlayer): PlayerWithMatches {
  return {
    id: p.id,
    nome: p.nome,
    cognome: p.cognome,
    email: p.email,
    telefono: p.telefono,
    fotoUrl: p.fotoUrl,
    genere: p.genere as Genere,
  };
}

function toTeam(t: DbTeam | null): TeamWithPlayers | null {
  if (!t) return null;
  return {
    id: t.id,
    nome: t.nome,
    genere: t.genere as Genere,
    livello: t.livello,
    player1: toPlayer(t.player1),
    player2: toPlayer(t.player2),
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
    if (!match.team1Id || !match.team2Id) {
      return NextResponse.json(
        { error: "Partita senza squadre non può iniziare" },
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
      team1: toTeam(updated.team1 as DbTeam | null)!,
      team2: toTeam(updated.team2 as DbTeam | null)!,
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
    if (winnerId !== match.team1Id && winnerId !== match.team2Id) {
      return NextResponse.json(
        { error: "winnerId deve essere una delle squadre della partita" },
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
      team1: toTeam(updated.team1 as DbTeam | null)!,
      team2: toTeam(updated.team2 as DbTeam | null)!,
      winner: toTeam(updated.winner as DbTeam | null) ?? undefined,
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

  const isTeam1 = match.posizione % 2 === 0;
  await prisma.match.update({
    where: { id: nextMatch.id },
    data: isTeam1 ? { team1Id: match.winnerId } : { team2Id: match.winnerId },
  });
}
