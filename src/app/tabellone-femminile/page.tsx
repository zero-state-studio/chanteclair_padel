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
    <div
      className="relative bg-night-deep text-paper flex flex-col min-h-screen w-screen md:grid md:h-screen md:overflow-hidden md:grid-rows-[auto_auto_auto_1fr]"
    >
      <div
        aria-hidden
        className="absolute inset-0 cc-stripes pointer-events-none"
        style={{ opacity: 0.4 }}
      />

      <TabelloneHeader genereAttivo="FEMMINILE" />

      {torneo ? (
        <TabelloneClient
          torneoIniziale={torneo as unknown as TournamentWithMatches}
          genere="FEMMINILE"
        />
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="relative z-[2] flex flex-col items-center justify-center text-center px-6"
      style={{ gridRow: "2 / span 3" }}
    >
      <div
        className="cc-display"
        style={{ fontSize: 80, color: "var(--color-paper)" }}
      >
        Nessun torneo femminile attivo
      </div>
      <div className="cc-mono mt-4" style={{ color: "oklch(0.7 0.02 255)" }}>
        torna presto
      </div>
    </div>
  );
}
