import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

export async function POST() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const sponsors = await prisma.sponsor.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (sponsors.length === 0) {
    return NextResponse.json(
      { error: "Nessuno sponsor disponibile" },
      { status: 400 }
    );
  }

  const matches = await prisma.match.findMany({
    select: { id: true },
    orderBy: [{ tournamentId: "asc" }, { round: "asc" }, { posizione: "asc" }],
  });

  if (matches.length === 0) {
    return NextResponse.json(
      { error: "Nessuna partita in programma" },
      { status: 400 }
    );
  }

  const shuffled = [...sponsors].sort(() => Math.random() - 0.5);

  const updates = matches.map((m, i) =>
    prisma.match.update({
      where: { id: m.id },
      data: { sponsorId: shuffled[i % shuffled.length].id },
    })
  );

  await prisma.$transaction(updates);

  return NextResponse.json({
    success: true,
    matches: matches.length,
    sponsors: sponsors.length,
  });
}
