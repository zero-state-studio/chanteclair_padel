import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publishLiveEvent } from "@/lib/realtime";
import { requireAdmin } from "@/lib/api-auth";
import type { SponsorShowcaseEvent } from "@/types";

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  if (
    !body ||
    !Array.isArray(body.sponsorIds) ||
    body.sponsorIds.length === 0 ||
    body.sponsorIds.some((id: unknown) => typeof id !== "string")
  ) {
    return NextResponse.json(
      { error: "sponsorIds (string[]) richiesto" },
      { status: 400 }
    );
  }

  const sponsors = await prisma.sponsor.findMany({
    where: { id: { in: body.sponsorIds as string[] } },
    select: { id: true, nome: true, logoUrl: true },
  });

  if (sponsors.length === 0) {
    return NextResponse.json({ error: "Nessuno sponsor valido" }, { status: 404 });
  }

  const event: SponsorShowcaseEvent = { tipo: "SPONSOR_SHOWCASE", sponsors };
  await publishLiveEvent(event);

  return NextResponse.json({ success: true, count: sponsors.length });
}
