import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureUploadsDir, savePhoto } from "@/lib/uploads";
import type { Genere } from "@/types";

const GENERI: Genere[] = ["MASCHILE", "FEMMINILE"];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const genere = searchParams.get("genere") ?? undefined;

  const where = genere && GENERI.includes(genere as Genere) ? { genere } : undefined;

  const players = await prisma.player.findMany({
    where,
    orderBy: [{ livello: "desc" }, { cognome: "asc" }, { nome: "asc" }],
  });

  return NextResponse.json(players);
}

export async function POST(request: NextRequest) {
  await ensureUploadsDir();
  const formData = await request.formData();

  const nome = (formData.get("nome") as string | null)?.trim();
  const cognome = (formData.get("cognome") as string | null)?.trim();
  const email = (formData.get("email") as string | null)?.trim() || null;
  const telefono = (formData.get("telefono") as string | null)?.trim() || null;
  const genere = (formData.get("genere") as string | null)?.trim();
  const livelloRaw = formData.get("livello") as string | null;
  const livello = Number.isFinite(Number(livelloRaw)) ? parseInt(livelloRaw ?? "0", 10) : 0;
  const foto = formData.get("foto") as File | null;

  if (!nome || !cognome) {
    return NextResponse.json({ error: "nome e cognome sono richiesti" }, { status: 400 });
  }
  if (!genere || !GENERI.includes(genere as Genere)) {
    return NextResponse.json({ error: "genere deve essere MASCHILE o FEMMINILE" }, { status: 400 });
  }

  let fotoUrl: string | null = null;
  if (foto && foto.size > 0) {
    fotoUrl = await savePhoto(foto);
  }

  const player = await prisma.player.create({
    data: { nome, cognome, email, telefono, genere, livello, fotoUrl },
  });

  return NextResponse.json(player, { status: 201 });
}
