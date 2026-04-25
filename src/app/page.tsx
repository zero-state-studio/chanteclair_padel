import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tornei = await prisma.tournament.findMany({
    where: { stato: "ATTIVO" },
    include: {
      matches: true,
    },
  });

  const torneoM = tornei.find((t) => t.genere === "MASCHILE");
  const torneoF = tornei.find((t) => t.genere === "FEMMINILE");

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-green-950 text-white">
      <section className="px-6 py-20 md:py-28 flex flex-col items-center text-center">
        <span className="text-7xl mb-6">🎾</span>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight">
          Chanteclair Padel Tournament
        </h1>
        <p className="text-slate-400 mt-4 text-lg md:text-xl">
          Stagione {new Date().getFullYear()}
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link href="/tabellone-maschile">
            <Button
              size="lg"
              className="bg-green-600 hover:bg-green-500 text-white px-8 h-12 text-base font-semibold"
            >
              Tabellone Maschile
            </Button>
          </Link>
          <Link href="/tabellone-femminile">
            <Button
              size="lg"
              variant="outline"
              className="border-green-600 text-green-300 hover:bg-green-950 hover:text-white px-8 h-12 text-base font-semibold bg-transparent"
            >
              Tabellone Femminile
            </Button>
          </Link>
        </div>
      </section>

      <section className="px-6 py-12 max-w-6xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
          Tornei Attivi
        </h2>

        {tornei.length === 0 ? (
          <p className="text-center text-slate-400">
            Nessun torneo attivo al momento. Torna presto!
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {[torneoM, torneoF].filter(Boolean).map((torneo) => {
              if (!torneo) return null;
              const giocate = torneo.matches.filter(
                (m) => m.stato === "COMPLETATA"
              ).length;
              const totali = torneo.matches.filter(
                (m) => m.player1Id || m.player2Id
              ).length;
              const href =
                torneo.genere === "MASCHILE"
                  ? "/tabellone-maschile"
                  : "/tabellone-femminile";

              return (
                <Link
                  key={torneo.id}
                  href={href}
                  className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 hover:border-green-500 hover:bg-slate-900 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-slate-400 text-sm uppercase tracking-widest">
                        {torneo.genere === "MASCHILE" ? "Maschile" : "Femminile"}
                      </p>
                      <h3 className="text-xl font-bold mt-1">{torneo.nome}</h3>
                      <p className="text-slate-400 text-sm mt-1">
                        Stagione {torneo.anno}
                      </p>
                    </div>
                    <Badge className="bg-green-600 hover:bg-green-600 text-white">
                      {torneo.stato}
                    </Badge>
                  </div>
                  <div className="mt-4 text-sm text-slate-300">
                    <span className="font-semibold text-white">{giocate}</span>
                    <span className="text-slate-500"> / {totali} partite giocate</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="px-6 py-12 max-w-3xl mx-auto text-center">
        <p className="text-slate-400 leading-relaxed">
          Segui in tempo reale tutte le partite del torneo Chanteclair. I tabelloni
          si aggiornano automaticamente al termine di ogni match, con notifiche live
          per partite iniziate e vincitori proclamati.
        </p>
      </section>

      <footer className="px-6 py-8 border-t border-slate-800 text-center text-sm text-slate-500">
        Powered by Chanteclair · {new Date().getFullYear()}
      </footer>
    </main>
  );
}
