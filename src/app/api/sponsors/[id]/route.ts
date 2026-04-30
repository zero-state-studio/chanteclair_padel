import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveSponsorLogo, deleteSponsorLogo } from "@/lib/uploads";
import { requireAdmin } from "@/lib/api-auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const { id } = await params;
  const sponsor = await prisma.sponsor.findUnique({ where: { id } });
  if (!sponsor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(sponsor);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const { id } = await params;
  const existing = await prisma.sponsor.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await request.formData();

  const data: Record<string, unknown> = {};

  const nome = formData.get("nome");
  if (typeof nome === "string") {
    const trimmed = nome.trim();
    data.nome = trimmed === "" ? null : trimmed;
  }

  const logo = formData.get("logo") as File | null;
  if (logo && logo.size > 0) {
    try {
      data.logoUrl = await saveSponsorLogo(logo, id);
    } catch (err) {
      const e = err as Error;
      console.error("[sponsors PATCH] logo error", e);
      return NextResponse.json(
        { error: `Caricamento logo fallito: ${e.message}` },
        { status: 500 }
      );
    }
  }

  const updated = await prisma.sponsor.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const { id } = await params;
  const existing = await prisma.sponsor.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteSponsorLogo(id);
  await prisma.sponsor.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
