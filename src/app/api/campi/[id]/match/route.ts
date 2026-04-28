import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

const matchInclude = {
  team1: { include: { player1: true, player2: true } },
  team2: { include: { player1: true, player2: true } },
  winner: { include: { player1: true, player2: true } },
  tournament: true,
  sponsor: { select: { id: true, nome: true, logoUrl: true } },
  field: { select: { id: true, nome: true, descrizione: true } },
} as const;

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const match = await prisma.match.findFirst({
    where: { fieldId: id, stato: "IN_CORSO" },
    include: matchInclude,
    orderBy: { iniziataAt: "desc" },
  });
  return NextResponse.json(match);
}
