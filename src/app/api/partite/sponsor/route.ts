import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  if (
    !body ||
    !Array.isArray(body.matchIds) ||
    body.matchIds.length === 0 ||
    body.matchIds.some((id: unknown) => typeof id !== "string")
  ) {
    return NextResponse.json(
      { error: "matchIds (string[]) richiesto" },
      { status: 400 }
    );
  }

  const sponsorId =
    typeof body.sponsorId === "string" && body.sponsorId.length > 0
      ? body.sponsorId
      : null;

  if (sponsorId) {
    const exists = await prisma.sponsor.findUnique({
      where: { id: sponsorId },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json({ error: "Sponsor non trovato" }, { status: 404 });
    }
  }

  const result = await prisma.match.updateMany({
    where: { id: { in: body.matchIds as string[] } },
    data: { sponsorId },
  });

  return NextResponse.json({ success: true, count: result.count });
}
