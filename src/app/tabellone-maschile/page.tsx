import { prisma } from "@/lib/prisma";
import { TabelloneShell } from "@/components/TabelloneShell";
import { TabelloneHeader } from "@/components/TabelloneHeader";
import type { TournamentWithMatches } from "@/types";

export const dynamic = "force-dynamic";

export default async function TabelloneMaschilePage() {
  const torneo = await prisma.tournament.findFirst({
    where: { genere: "MASCHILE", stato: "ATTIVO" },
    include: {
      matches: {
        include: {
          team1: { include: { player1: true, player2: true } },
          team2: { include: { player1: true, player2: true } },
          winner: { include: { player1: true, player2: true } },
          sponsor: { select: { id: true, nome: true, logoUrl: true } },
          field: { select: { id: true, nome: true, descrizione: true } },
        },
        orderBy: [{ round: "desc" }, { posizione: "asc" }],
      },
      groups: {
        include: {
          groupTeams: {
            include: {
              team: { include: { player1: true, player2: true } },
            },
          },
        },
        orderBy: { posizione: "asc" },
      },
    },
  });

  return (
    <div
      className="relative bg-night-deep text-paper flex flex-col min-h-screen w-screen md:h-screen md:overflow-hidden"
    >
      <div
        aria-hidden
        className="absolute inset-0 cc-stripes pointer-events-none"
        style={{ opacity: 0.4 }}
      />

      <TabelloneHeader genereAttivo="MASCHILE" />

      <TabelloneShell
        torneoIniziale={(torneo as unknown as TournamentWithMatches) ?? null}
        genere="MASCHILE"
        emptyLabel="Lo spettacolo sta per iniziare"
      />
    </div>
  );
}
