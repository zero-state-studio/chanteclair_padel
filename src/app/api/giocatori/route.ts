import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureUploadsDir, savePhoto } from "@/lib/uploads";
import { requireAdmin } from "@/lib/api-auth";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const players = await prisma.player.findMany({
    orderBy: [{ cognome: "asc" }, { nome: "asc" }],
    include: {
      teamAsPlayer1: { select: { id: true, nome: true, genere: true } },
      teamAsPlayer2: { select: { id: true, nome: true, genere: true } },
    },
  });
  return NextResponse.json(players);
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  await ensureUploadsDir();
  const formData = await request.formData();

  const nome = (formData.get("nome") as string | null)?.trim();
  const cognome = (formData.get("cognome") as string | null)?.trim();
  const email = (formData.get("email") as string | null)?.trim() || null;
  const telefono = (formData.get("telefono") as string | null)?.trim() || null;
  const foto = formData.get("foto") as File | null;

  if (!nome || !cognome) {
    return NextResponse.json({ error: "nome e cognome sono richiesti" }, { status: 400 });
  }

  let fotoUrl: string | null = null;
  if (foto && foto.size > 0) {
    fotoUrl = await savePhoto(foto);
  }

  const player = await prisma.player.create({
    data: { nome, cognome, email, telefono, fotoUrl },
  });

  return NextResponse.json(player, { status: 201 });
}
