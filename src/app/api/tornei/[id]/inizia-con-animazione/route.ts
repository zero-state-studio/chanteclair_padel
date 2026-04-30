import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publishLiveEvent } from "@/lib/realtime";
import { requireAdmin } from "@/lib/api-auth";
import type { Genere, GironiAnimationEvent } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const torneo = await prisma.tournament.findUnique({
    where: { id },
    select: {
      id: true,
      genere: true,
      stato: true,
      groups: { select: { id: true } },
    },
  });

  if (!torneo) {
    return NextResponse.json({ error: "Torneo non trovato" }, { status: 404 });
  }
  if (torneo.groups.length === 0) {
    return NextResponse.json(
      { error: "Sorteggia prima i gironi" },
      { status: 400 }
    );
  }

  if (torneo.stato !== "ATTIVO") {
    await prisma.tournament.update({
      where: { id },
      data: { stato: "ATTIVO" },
    });
  }

  const event: GironiAnimationEvent = {
    tipo: "GIRONI_ANIMATION",
    genere: torneo.genere as Genere,
    tournamentId: torneo.id,
  };

  try {
    await publishLiveEvent(event);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
