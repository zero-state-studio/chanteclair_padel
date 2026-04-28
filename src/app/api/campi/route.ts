import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const fields = await prisma.field.findMany({
    orderBy: { nome: "asc" },
  });
  return NextResponse.json(fields);
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "JSON richiesto" }, { status: 400 });

  const nome = typeof body.nome === "string" ? body.nome.trim() : "";
  const descrizione =
    typeof body.descrizione === "string" ? body.descrizione.trim() : "";

  if (!nome) {
    return NextResponse.json({ error: "nome è richiesto" }, { status: 400 });
  }

  const field = await prisma.field.create({
    data: { nome, descrizione: descrizione || null },
  });
  return NextResponse.json(field, { status: 201 });
}
