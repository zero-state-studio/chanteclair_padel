import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CampoLiveClient } from "@/components/CampoLiveClient";
import type { FieldLite, MatchWithTeams, SponsorLite } from "@/types";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

const matchInclude = {
  team1: { include: { player1: true, player2: true } },
  team2: { include: { player1: true, player2: true } },
  winner: { include: { player1: true, player2: true } },
  tournament: true,
  sponsor: { select: { id: true, nome: true, logoUrl: true } },
  field: { select: { id: true, nome: true, descrizione: true } },
} as const;

export default async function CampoPage({ params }: PageProps) {
  const { id } = await params;

  const [field, match, sponsors] = await Promise.all([
    prisma.field.findUnique({ where: { id } }),
    prisma.match.findFirst({
      where: { fieldId: id, stato: "IN_CORSO" },
      include: matchInclude,
      orderBy: { iniziataAt: "desc" },
    }),
    prisma.sponsor.findMany({ orderBy: { nome: "asc" } }),
  ]);

  if (!field) notFound();

  return (
    <div className="relative min-h-screen w-screen bg-night-deep text-paper overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 cc-stripes pointer-events-none"
        style={{ opacity: 0.35 }}
      />
      <CampoLiveClient
        field={
          {
            id: field.id,
            nome: field.nome,
            descrizione: field.descrizione,
          } satisfies FieldLite
        }
        matchIniziale={
          (match ?? null) as unknown as MatchWithTeams | null
        }
        sponsors={sponsors as SponsorLite[]}
      />
    </div>
  );
}
