import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MatchLiveClient } from "@/components/MatchLiveClient";
import type { Genere, MatchWithTeams } from "@/types";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function PartitaPage({ params }: PageProps) {
  const { id } = await params;
  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      team1: { include: { player1: true, player2: true } },
      team2: { include: { player1: true, player2: true } },
      winner: { include: { player1: true, player2: true } },
      tournament: true,
      sponsor: { select: { id: true, nome: true, logoUrl: true } },
      field: { select: { id: true, nome: true, descrizione: true } },
    },
  });

  if (!match) notFound();

  return (
    <div className="relative min-h-screen w-screen bg-night-deep text-paper overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 cc-stripes pointer-events-none"
        style={{ opacity: 0.35 }}
      />
      <MatchLiveClient
        matchIniziale={match as unknown as MatchWithTeams}
        genere={match.tournament.genere as Genere}
        torneoNome={match.tournament.nome}
      />
    </div>
  );
}
