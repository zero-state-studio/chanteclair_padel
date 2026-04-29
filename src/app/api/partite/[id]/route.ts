import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publishLiveEvent } from "@/lib/realtime";
import { requireAdmin } from "@/lib/api-auth";
import type { Genere, LiveEvent, PlayerWithMatches, TeamWithPlayers } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

const matchInclude = {
  team1: { include: { player1: true, player2: true } },
  team2: { include: { player1: true, player2: true } },
  winner: { include: { player1: true, player2: true } },
  tournament: true,
  sponsor: { select: { id: true, nome: true, logoUrl: true } },
  field: { select: { id: true, nome: true, descrizione: true } },
} as const;

type DbPlayer = {
  id: string;
  nome: string;
  cognome: string;
  email: string | null;
  telefono: string | null;
  fotoUrl: string | null;
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

function buildPunteggioString(
  s1: number,
  s2: number,
  tb1: number | null,
  tb2: number | null
): string {
  if (tb1 != null && tb2 != null) {
    return `${s1}-${s2} (${tb1}-${tb2})`;
  }
  return `${s1}-${s2}`;
}

function inferWinner(
  match: { team1Id: string | null; team2Id: string | null },
  s1: number,
  s2: number,
  tb1: number | null,
  tb2: number | null
): string | null {
  if (!match.team1Id || !match.team2Id) return null;
  if (s1 !== s2) return s1 > s2 ? match.team1Id : match.team2Id;
  if (tb1 != null && tb2 != null && tb1 !== tb2) {
    return tb1 > tb2 ? match.team1Id : match.team2Id;
  }
  return null;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const { id } = await params;
  const match = await prisma.match.findUnique({
    where: { id },
    include: matchInclude,
  });
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(match);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "JSON body richiesto" }, { status: 400 });

  const {
    azione,
    winnerId: winnerIdInput,
    set1Team1,
    set1Team2,
    tieBreakTeam1,
    tieBreakTeam2,
    fieldId,
  } = body as {
    azione?: string;
    winnerId?: string;
    set1Team1?: number;
    set1Team2?: number;
    tieBreakTeam1?: number | null;
    tieBreakTeam2?: number | null;
    fieldId?: string | null;
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

    const data: {
      stato: string;
      iniziataAt: Date;
      fieldId?: string | null;
    } = { stato: "IN_CORSO", iniziataAt: new Date() };
    if (fieldId !== undefined) {
      data.fieldId = fieldId && fieldId.length > 0 ? fieldId : null;
    }

    const updated = await prisma.match.update({
      where: { id },
      data,
      include: matchInclude,
    });

    const event: LiveEvent = {
      tipo: "PARTITA_INIZIATA",
      matchId: updated.id,
      team1: toTeam(updated.team1 as DbTeam | null)!,
      team2: toTeam(updated.team2 as DbTeam | null)!,
      genere: updated.tournament.genere as Genere,
      sponsor: updated.sponsor ?? null,
      field: updated.field ?? null,
    };
    await publishLiveEvent(event);

    return NextResponse.json(updated);
  }

  if (azione === "AGGIORNA_PARZIALE") {
    if (match.stato !== "IN_CORSO") {
      return NextResponse.json(
        { error: "Parziale aggiornabile solo su partite IN_CORSO" },
        { status: 400 }
      );
    }
    if (
      typeof set1Team1 !== "number" ||
      typeof set1Team2 !== "number" ||
      set1Team1 < 0 ||
      set1Team2 < 0 ||
      set1Team1 > 7 ||
      set1Team2 > 7
    ) {
      return NextResponse.json(
        { error: "set1Team1 e set1Team2 richiesti (0-7)" },
        { status: 400 }
      );
    }

    const tb1 = typeof tieBreakTeam1 === "number" ? tieBreakTeam1 : null;
    const tb2 = typeof tieBreakTeam2 === "number" ? tieBreakTeam2 : null;
    if ((tb1 != null) !== (tb2 != null)) {
      return NextResponse.json(
        { error: "tieBreak deve avere entrambi i punteggi" },
        { status: 400 }
      );
    }

    const punteggio = buildPunteggioString(set1Team1, set1Team2, tb1, tb2);

    const updated = await prisma.match.update({
      where: { id },
      data: {
        set1Team1,
        set1Team2,
        tieBreakTeam1: tb1,
        tieBreakTeam2: tb2,
        punteggio,
      },
      include: matchInclude,
    });

    const event: LiveEvent = {
      tipo: "PARTITA_PARZIALE",
      matchId: updated.id,
      team1: toTeam(updated.team1 as DbTeam | null)!,
      team2: toTeam(updated.team2 as DbTeam | null)!,
      punteggio: updated.punteggio ?? undefined,
      genere: updated.tournament.genere as Genere,
      sponsor: updated.sponsor ?? null,
      field: updated.field ?? null,
    };
    await publishLiveEvent(event);

    return NextResponse.json(updated);
  }

  if (azione === "TERMINA") {
    if (
      typeof set1Team1 !== "number" ||
      typeof set1Team2 !== "number" ||
      set1Team1 < 0 ||
      set1Team2 < 0 ||
      set1Team1 > 7 ||
      set1Team2 > 7
    ) {
      return NextResponse.json(
        { error: "set1Team1 e set1Team2 richiesti (0-7)" },
        { status: 400 }
      );
    }

    const tb1 = typeof tieBreakTeam1 === "number" ? tieBreakTeam1 : null;
    const tb2 = typeof tieBreakTeam2 === "number" ? tieBreakTeam2 : null;
    if ((tb1 != null) !== (tb2 != null)) {
      return NextResponse.json(
        { error: "tieBreak deve avere entrambi i punteggi" },
        { status: 400 }
      );
    }

    const computedWinnerId = inferWinner(match, set1Team1, set1Team2, tb1, tb2);
    const winnerId =
      winnerIdInput && (winnerIdInput === match.team1Id || winnerIdInput === match.team2Id)
        ? winnerIdInput
        : computedWinnerId;

    if (!winnerId) {
      return NextResponse.json(
        { error: "Punteggio non determina un vincitore (serve tie-break)" },
        { status: 400 }
      );
    }

    const punteggio = buildPunteggioString(set1Team1, set1Team2, tb1, tb2);

    const updated = await prisma.match.update({
      where: { id },
      data: {
        stato: "COMPLETATA",
        finitaAt: new Date(),
        winnerId,
        punteggio,
        set1Team1,
        set1Team2,
        tieBreakTeam1: tb1,
        tieBreakTeam2: tb2,
      },
      include: matchInclude,
    });

    if (updated.groupId) {
      await updateGroupStats(updated.groupId);
    } else {
      await promoteWinner(updated);
    }

    const event: LiveEvent = {
      tipo: "PARTITA_FINITA",
      matchId: updated.id,
      team1: toTeam(updated.team1 as DbTeam | null)!,
      team2: toTeam(updated.team2 as DbTeam | null)!,
      winner: toTeam(updated.winner as DbTeam | null) ?? undefined,
      punteggio: updated.punteggio ?? undefined,
      genere: updated.tournament.genere as Genere,
      sponsor: updated.sponsor ?? null,
      field: updated.field ?? null,
    };
    await publishLiveEvent(event);

    return NextResponse.json(updated);
  }

  if (azione === "RESET") {
    if (match.stato !== "COMPLETATA" && match.stato !== "IN_CORSO") {
      return NextResponse.json(
        { error: "Reset disponibile solo per partite IN_CORSO o COMPLETATA" },
        { status: 400 }
      );
    }

    const wasWinnerId = match.winnerId;

    const updated = await prisma.match.update({
      where: { id },
      data: {
        stato: "ATTESA",
        iniziataAt: null,
        finitaAt: null,
        winnerId: null,
        punteggio: null,
        set1Team1: null,
        set1Team2: null,
        tieBreakTeam1: null,
        tieBreakTeam2: null,
      },
      include: matchInclude,
    });

    if (updated.groupId) {
      await updateGroupStats(updated.groupId);
    } else if (wasWinnerId) {
      await unpromoteWinner({
        tournamentId: updated.tournamentId,
        bracketTipo: updated.bracketTipo,
        round: updated.round,
        posizione: updated.posizione,
        winnerId: wasWinnerId,
      });
    }

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Azione non valida" }, { status: 400 });
}

async function unpromoteWinner(match: {
  tournamentId: string;
  bracketTipo: string | null;
  round: number;
  posizione: number;
  winnerId: string;
}) {
  const nextRound = match.round - 1;
  if (nextRound < 1) return;
  const nextPosizione = Math.floor(match.posizione / 2);

  const nextMatch = await prisma.match.findFirst({
    where: {
      tournamentId: match.tournamentId,
      bracketTipo: match.bracketTipo,
      round: nextRound,
      posizione: nextPosizione,
    },
  });
  if (!nextMatch) return;

  const isTeam1 = match.posizione % 2 === 0;
  const slotMatches = isTeam1
    ? nextMatch.team1Id === match.winnerId
    : nextMatch.team2Id === match.winnerId;
  if (!slotMatches) return;

  await prisma.match.update({
    where: { id: nextMatch.id },
    data: isTeam1 ? { team1Id: null } : { team2Id: null },
  });
}

type MatchForPromotion = {
  id: string;
  tournamentId: string;
  bracketTipo: string | null;
  groupId: string | null;
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
      bracketTipo: match.bracketTipo,
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

async function updateGroupStats(groupId: string) {
  const groupTeams = await prisma.groupTeam.findMany({
    where: { groupId },
  });
  const matches = await prisma.match.findMany({
    where: { groupId, stato: "COMPLETATA" },
  });

  for (const gt of groupTeams) {
    let punti = 0;
    let gv = 0;
    let gp = 0;
    let n = 0;
    for (const m of matches) {
      const isTeam1 = m.team1Id === gt.teamId;
      const isTeam2 = m.team2Id === gt.teamId;
      if (!isTeam1 && !isTeam2) continue;
      n++;
      const myGames = isTeam1 ? m.set1Team1 ?? 0 : m.set1Team2 ?? 0;
      const oppGames = isTeam1 ? m.set1Team2 ?? 0 : m.set1Team1 ?? 0;
      gv += myGames;
      gp += oppGames;
      if (m.winnerId === gt.teamId) punti += 2;
      else if (m.winnerId) punti += 1;
    }
    await prisma.groupTeam.update({
      where: { id: gt.id },
      data: { punti, gameVinti: gv, gamePersi: gp, matchGiocate: n },
    });
  }
}
