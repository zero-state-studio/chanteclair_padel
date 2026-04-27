import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { savePhoto } from "@/lib/uploads";
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
  const formData = await request.formData();

  const nome = (formData.get("nome") as string | null)?.trim();
  const cognome = (formData.get("cognome") as string | null)?.trim();
  const email = (formData.get("email") as string | null)?.trim() || null;
  const telefono = (formData.get("telefono") as string | null)?.trim() || null;
  const foto = formData.get("foto") as File | null;

  if (!nome || !cognome) {
    return NextResponse.json({ error: "nome e cognome sono richiesti" }, { status: 400 });
  }

  const player = await prisma.player.create({
    data: { nome, cognome, email, telefono },
  });

  if (foto && foto.size > 0) {
    try {
      const fotoUrl = await savePhoto(foto, player.id);
      const updated = await prisma.player.update({
        where: { id: player.id },
        data: { fotoUrl },
      });
      return NextResponse.json(updated, { status: 201 });
    } catch (err) {
      const e = err as Error;
      console.error("[giocatori POST] photo error", e);
      return NextResponse.json(
        { error: `Caricamento foto fallito: ${e.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(player, { status: 201 });
}
