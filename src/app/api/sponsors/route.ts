import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveSponsorLogo } from "@/lib/uploads";
import { requireAdmin } from "@/lib/api-auth";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const sponsors = await prisma.sponsor.findMany({
    orderBy: { nome: "asc" },
  });
  return NextResponse.json(sponsors);
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const formData = await request.formData();

  const nome = (formData.get("nome") as string | null)?.trim();
  const logo = formData.get("logo") as File | null;

  if (!nome) {
    return NextResponse.json({ error: "nome è richiesto" }, { status: 400 });
  }

  const sponsor = await prisma.sponsor.create({ data: { nome } });

  if (logo && logo.size > 0) {
    try {
      const logoUrl = await saveSponsorLogo(logo, sponsor.id);
      const updated = await prisma.sponsor.update({
        where: { id: sponsor.id },
        data: { logoUrl },
      });
      return NextResponse.json(updated, { status: 201 });
    } catch (err) {
      const e = err as Error;
      console.error("[sponsors POST] logo error", e);
      return NextResponse.json(
        { error: `Caricamento logo fallito: ${e.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(sponsor, { status: 201 });
}
