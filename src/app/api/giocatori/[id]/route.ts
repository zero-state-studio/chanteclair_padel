import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { savePhoto, deletePhoto } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const player = await prisma.player.findUnique({ where: { id } });
  if (!player) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(player);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const existing = await prisma.player.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await request.formData();

  const data: Record<string, unknown> = {};

  const nome = formData.get("nome");
  if (typeof nome === "string" && nome.trim()) data.nome = nome.trim();

  const cognome = formData.get("cognome");
  if (typeof cognome === "string" && cognome.trim()) data.cognome = cognome.trim();

  if (formData.has("email")) {
    const email = (formData.get("email") as string | null)?.trim();
    data.email = email || null;
  }
  if (formData.has("telefono")) {
    const telefono = (formData.get("telefono") as string | null)?.trim();
    data.telefono = telefono || null;
  }

  const foto = formData.get("foto") as File | null;
  if (foto && foto.size > 0) {
    if (existing.fotoUrl) await deletePhoto(existing.fotoUrl);
    data.fotoUrl = await savePhoto(foto);
  }

  const updated = await prisma.player.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const existing = await prisma.player.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.fotoUrl) await deletePhoto(existing.fotoUrl);
  await prisma.player.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
