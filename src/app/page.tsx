import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tornei = await prisma.tournament.findMany({
    where: { stato: "ATTIVO" },
    include: { matches: true },
  });

  const torneoM = tornei.find((t) => t.genere === "MASCHILE");
  const torneoF = tornei.find((t) => t.genere === "FEMMINILE");
  const annoCorrente = new Date().getFullYear();

  const liveCount = tornei.reduce(
    (acc, t) => acc + t.matches.filter((m) => m.stato === "IN_CORSO").length,
    0
  );

  return (
    <main className="min-h-screen bg-court text-cream grain overflow-hidden">
      {/* Top bar */}
      <header className="relative z-10 border-b border-line">
        <div className="mx-auto max-w-[1400px] px-6 md:px-12 py-5 flex items-center justify-between text-eyebrow">
          <span className="text-cream/80">Chanteclair · Padel Club</span>
          <span className="hidden md:flex items-center gap-3 text-cream/60">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                liveCount > 0 ? "bg-court-line" : "bg-cream/30"
              }`}
            />
            {liveCount > 0 ? `${liveCount} match in corso` : "Nessun match live"}
          </span>
          <span className="text-cream/60 hidden md:inline">
            Stagione {annoCorrente}
          </span>
        </div>
      </header>

      {/* Hero — asymmetric editorial */}
      <section className="relative">
        <div className="court-grid absolute inset-0 opacity-50 pointer-events-none" />

        <div className="relative mx-auto max-w-[1400px] px-6 md:px-12 pt-16 md:pt-24 pb-12 md:pb-20 grid grid-cols-12 gap-6 md:gap-10">
          <div className="col-span-12 md:col-span-7 flex flex-col justify-between min-h-[60vh]">
            <div className="text-eyebrow text-cream/60 flex items-center gap-3">
              <span>Volume {annoCorrente - 2000}</span>
              <span className="h-px flex-1 bg-cream/15" />
              <span>Open · Singolare</span>
            </div>

            <div className="my-12 md:my-0">
              <h1 className="text-display-jumbo text-cream text-[18vw] md:text-[12vw] leading-[0.82]">
                Torneo
                <br />
                <span className="italic text-court-line">Chanteclair</span>
              </h1>
              <p className="mt-8 max-w-md text-cream/80 text-lg leading-relaxed">
                Tabelloni live aggiornati in tempo reale. Animazioni in campo a ogni
                inizio e chiusura partita. Edizione {annoCorrente}.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/tabellone-maschile"
                className="group btn-primary inline-flex items-center justify-between gap-6 px-6 py-4 rounded-sm hover:bg-[#e7ff75] transition-colors"
              >
                <span className="font-body font-semibold tracking-wide uppercase text-sm">
                  Tabellone · Maschile
                </span>
                <span className="font-mono text-xs">→</span>
              </Link>
              <Link
                href="/tabellone-femminile"
                className="group btn-ghost inline-flex items-center justify-between gap-6 px-6 py-4 rounded-sm transition-colors"
              >
                <span className="font-body font-semibold tracking-wide uppercase text-sm">
                  Tabellone · Femminile
                </span>
                <span className="font-mono text-xs">→</span>
              </Link>
            </div>
          </div>

          <aside className="col-span-12 md:col-span-5 md:pl-10 md:border-l border-line flex flex-col justify-between gap-12">
            <div>
              <div className="text-eyebrow text-cream/50 mb-2">L&apos;anno</div>
              <div className="text-numeral text-court-line text-[26vw] md:text-[14vw]">
                {annoCorrente}
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-eyebrow text-cream/50">In programma</div>
              <ScheduleRow
                label="Maschile"
                tournament={torneoM}
                href="/tabellone-maschile"
              />
              <ScheduleRow
                label="Femminile"
                tournament={torneoF}
                href="/tabellone-femminile"
              />
            </div>
          </aside>
        </div>

        <div className="accent-bar mx-6 md:mx-12 mb-0" />
      </section>

      {/* Tournament cards */}
      <section className="relative mx-auto max-w-[1400px] px-6 md:px-12 py-16 md:py-24">
        <div className="grid grid-cols-12 gap-6 md:gap-10 mb-10">
          <div className="col-span-12 md:col-span-4">
            <div className="text-eyebrow text-cream/50">Sezione 01</div>
            <h2 className="font-display text-4xl md:text-5xl text-cream mt-3 leading-none">
              Tornei
              <br />
              <span className="italic text-cream/70">in corso</span>
            </h2>
          </div>
          <div className="col-span-12 md:col-span-8 md:pt-12">
            <p className="text-cream/70 text-base md:text-lg leading-relaxed max-w-2xl">
              Eliminazione diretta · teste di serie sorteggiate dal regolamento del
              club. Le partite vengono registrate dall&apos;arbitro al momento del
              fischio iniziale: il bracket si aggiorna ovunque, in diretta.
            </p>
          </div>
        </div>

        {tornei.length === 0 ? (
          <div className="border-y border-line py-20 text-center">
            <p className="font-display italic text-3xl text-cream/60">
              Nessun torneo attivo, al momento.
            </p>
            <p className="text-eyebrow text-cream/40 mt-4">torna presto</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-px bg-cream/10 border border-line">
            {[torneoM, torneoF].filter(Boolean).map((torneo, idx) => {
              if (!torneo) return null;
              const giocate = torneo.matches.filter(
                (m) => m.stato === "COMPLETATA"
              ).length;
              const inCorso = torneo.matches.filter(
                (m) => m.stato === "IN_CORSO"
              ).length;
              const totali = torneo.matches.filter(
                (m) => m.team1Id || m.team2Id
              ).length;
              const href =
                torneo.genere === "MASCHILE"
                  ? "/tabellone-maschile"
                  : "/tabellone-femminile";

              return (
                <Link
                  key={torneo.id}
                  href={href}
                  className="group bg-court hover:bg-court-deep transition-colors p-8 md:p-10 flex flex-col gap-8 relative overflow-hidden"
                >
                  <div className="absolute inset-0 court-grid opacity-30 pointer-events-none" />
                  <div className="relative flex items-start justify-between">
                    <div className="text-eyebrow text-cream/50 flex items-center gap-2">
                      <span className="text-numeral text-court-line text-2xl leading-none">
                        0{idx + 1}
                      </span>
                      <span>·</span>
                      <span>{torneo.genere === "MASCHILE" ? "Maschile" : "Femminile"}</span>
                    </div>
                    {inCorso > 0 && (
                      <span className="flex items-center gap-2 text-eyebrow text-court-line">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-court-line opacity-60" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-court-line" />
                        </span>
                        Live
                      </span>
                    )}
                  </div>

                  <h3 className="relative font-display text-5xl md:text-6xl text-cream leading-[0.9] group-hover:text-court-line transition-colors">
                    {torneo.nome}
                  </h3>

                  <div className="relative grid grid-cols-3 gap-4 pt-6 border-t border-line text-cream/70">
                    <Stat label="Stagione" value={String(torneo.anno)} />
                    <Stat
                      label="Match conclusi"
                      value={`${giocate}/${totali}`}
                    />
                    <Stat
                      label="Stato"
                      value={torneo.stato}
                      accent
                    />
                  </div>

                  <div className="relative flex items-center justify-between pt-2 text-cream/60 group-hover:text-court-line transition-colors">
                    <span className="text-eyebrow">Apri tabellone</span>
                    <span className="font-mono text-2xl group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Editorial pull-quote */}
      <section className="relative border-y border-line bg-court-deep">
        <div className="mx-auto max-w-[1400px] px-6 md:px-12 py-16 md:py-24 grid grid-cols-12 gap-6 md:gap-10 items-center">
          <div className="col-span-12 md:col-span-2 text-eyebrow text-cream/50">
            Manifesto
          </div>
          <blockquote className="col-span-12 md:col-span-10 font-display text-3xl md:text-5xl text-cream leading-tight">
            <span className="text-court-line">«</span> Il padel non è solo
            uno sport. È <em className="italic">il</em> sport del club —
            piazzato tra il mosaico dei campi e il legno della clubhouse.
            <span className="text-court-line">»</span>
          </blockquote>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative">
        <div className="mx-auto max-w-[1400px] px-6 md:px-12 py-10 grid grid-cols-12 gap-6 text-eyebrow">
          <div className="col-span-12 md:col-span-4 text-cream/60">
            Chanteclair Padel Club · {annoCorrente}
          </div>
          <div className="col-span-12 md:col-span-4 text-cream/40">
            Eliminazione diretta · arbitri certificati
          </div>
          <div className="col-span-12 md:col-span-4 md:text-right text-cream/40">
            <Link href="/admin/login" className="hover:text-court-line transition-colors">
              Area arbitri ↗
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-eyebrow text-cream/40 mb-1">{label}</div>
      <div
        className={`text-stat text-base ${
          accent ? "text-court-line" : "text-cream"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ScheduleRow({
  label,
  tournament,
  href,
}: {
  label: string;
  tournament: { nome: string; anno: number; matches: { stato: string }[] } | undefined;
  href: string;
}) {
  if (!tournament) {
    return (
      <div className="flex items-baseline justify-between border-b border-line pb-3">
        <span className="font-display text-xl text-cream/60">{label}</span>
        <span className="text-eyebrow text-cream/40">— in attesa</span>
      </div>
    );
  }
  const inCorso = tournament.matches.filter((m) => m.stato === "IN_CORSO").length;
  return (
    <Link
      href={href}
      className="group flex items-baseline justify-between border-b border-line pb-3 hover:border-court-line transition-colors"
    >
      <div>
        <div className="text-eyebrow text-cream/50">{label}</div>
        <div className="font-display text-xl text-cream group-hover:text-court-line transition-colors">
          {tournament.nome}
        </div>
      </div>
      <span className="text-eyebrow text-cream/60 flex items-center gap-2">
        {inCorso > 0 && (
          <span className="h-1.5 w-1.5 rounded-full bg-court-line animate-pulse" />
        )}
        {inCorso > 0 ? "live" : "ATTIVO"}
        <span className="font-mono">→</span>
      </span>
    </Link>
  );
}
