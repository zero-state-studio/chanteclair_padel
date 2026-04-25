import { prisma } from "@/lib/prisma";
import { TabelloneClient } from "@/components/TabelloneClient";
import Link from "next/link";
import type { TournamentWithMatches } from "@/types";

export const dynamic = "force-dynamic";

export default async function TabelloneFemminilePage() {
  const torneo = await prisma.tournament.findFirst({
    where: { genere: "FEMMINILE", stato: "ATTIVO" },
    include: {
      matches: {
        include: { player1: true, player2: true, winner: true },
        orderBy: [{ round: "desc" }, { posizione: "asc" }],
      },
    },
  });

  return (
    <main className="min-h-screen bg-slate-900 text-white">
      <header className="px-6 py-5 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">🎾 Tabellone Femminile</h1>
          {torneo && (
            <p className="text-slate-400 text-sm mt-1">
              {torneo.nome} — {torneo.anno}
            </p>
          )}
        </div>
        <Link
          href="/"
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          ← Home
        </Link>
      </header>

      {torneo ? (
        <TabelloneClient
          torneoIniziale={torneo as unknown as TournamentWithMatches}
          genere="FEMMINILE"
        />
      ) : (
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-400 text-xl">Nessun torneo femminile attivo al momento.</p>
        </div>
      )}
    </main>
  );
}
