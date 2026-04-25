import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { StatoTorneo } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATI: StatoTorneo[] = ["BOZZA", "ATTIVO", "CONCLUSO"];

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const torneo = await prisma.tournament.findUnique({
    where: { id },
    include: {
      matches: {
        include: { player1: true, player2: true, winner: true },
        orderBy: [{ round: "desc" }, { posizione: "asc" }],
      },
    },
  });
  if (!torneo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(torneo);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "JSON body richiesto" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body.nome === "string" && body.nome.trim()) data.nome = body.nome.trim();
  if (typeof body.anno === "number") data.anno = body.anno;
  if (typeof body.stato === "string") {
    if (!STATI.includes(body.stato as StatoTorneo)) {
      return NextResponse.json({ error: "stato non valido" }, { status: 400 });
    }
    data.stato = body.stato;
  }

  const torneo = await prisma.tournament.update({ where: { id }, data });
  return NextResponse.json(torneo);
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  await prisma.tournament.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
