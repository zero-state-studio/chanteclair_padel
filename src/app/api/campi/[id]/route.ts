import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const { id } = await params;
  const field = await prisma.field.findUnique({ where: { id } });
  if (!field) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(field);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const { id } = await params;
  const existing = await prisma.field.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "JSON richiesto" }, { status: 400 });

  const data: { nome?: string; descrizione?: string | null } = {};
  if (typeof body.nome === "string" && body.nome.trim()) {
    data.nome = body.nome.trim();
  }
  if (typeof body.descrizione === "string") {
    data.descrizione = body.descrizione.trim() || null;
  }

  const updated = await prisma.field.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const { id } = await params;
  const existing = await prisma.field.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.field.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
