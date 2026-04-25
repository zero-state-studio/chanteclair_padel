import { prisma } from "@/lib/prisma";
import { TabelloneClient } from "@/components/TabelloneClient";
import { TabelloneHeader } from "@/components/TabelloneHeader";
import type { TournamentWithMatches } from "@/types";

export const dynamic = "force-dynamic";

export default async function TabelloneFemminilePage() {
  const torneo = await prisma.tournament.findFirst({
    where: { genere: "FEMMINILE", stato: "ATTIVO" },
    include: {
      matches: {
        include: {
          team1: { include: { player1: true, player2: true } },
          team2: { include: { player1: true, player2: true } },
          winner: { include: { player1: true, player2: true } },
        },
        orderBy: [{ round: "desc" }, { posizione: "asc" }],
      },
    },
  });

  return (
    <main className="min-h-screen bg-court text-cream">
      <TabelloneHeader
        sezione="Sezione F"
        titolo="Femminile"
        torneo={torneo ? { nome: torneo.nome, anno: torneo.anno } : null}
      />

      {torneo ? (
        <TabelloneClient
          torneoIniziale={torneo as unknown as TournamentWithMatches}
          genere="FEMMINILE"
        />
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <p className="font-display italic text-4xl text-cream/50">
            Nessun torneo femminile attivo
          </p>
          <p className="text-eyebrow text-cream/40 mt-4">torna presto</p>
        </div>
      )}
    </main>
  );
}
