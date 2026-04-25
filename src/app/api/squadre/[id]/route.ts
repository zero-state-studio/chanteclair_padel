import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const team = await prisma.team.findUnique({
    where: { id },
    include: { player1: true, player2: true },
  });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(team);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const existing = await prisma.team.findUnique({
    where: { id },
    include: { player1: true, player2: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "JSON body richiesto" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body.livello === "number") data.livello = body.livello;

  let player1 = existing.player1;
  let player2 = existing.player2;
  let recomputeName = false;

  if (typeof body.player1Id === "string" && body.player1Id !== existing.player1Id) {
    const p = await prisma.player.findUnique({ where: { id: body.player1Id } });
    if (!p) return NextResponse.json({ error: "player1 non trovato" }, { status: 404 });
    if (p.genere !== existing.genere) {
      return NextResponse.json({ error: "Genere non compatibile" }, { status: 400 });
    }
    data.player1Id = body.player1Id;
    player1 = p;
    recomputeName = true;
  }
  if (typeof body.player2Id === "string" && body.player2Id !== existing.player2Id) {
    const p = await prisma.player.findUnique({ where: { id: body.player2Id } });
    if (!p) return NextResponse.json({ error: "player2 non trovato" }, { status: 404 });
    if (p.genere !== existing.genere) {
      return NextResponse.json({ error: "Genere non compatibile" }, { status: 400 });
    }
    data.player2Id = body.player2Id;
    player2 = p;
    recomputeName = true;
  }

  if (recomputeName) {
    if (player1.id === player2.id) {
      return NextResponse.json({ error: "I due giocatori devono essere diversi" }, { status: 400 });
    }
    data.nome = `${player1.cognome} / ${player2.cognome}`;
  }

  try {
    const team = await prisma.team.update({
      where: { id },
      data,
      include: { player1: true, player2: true },
    });
    return NextResponse.json(team);
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

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  await prisma.team.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
