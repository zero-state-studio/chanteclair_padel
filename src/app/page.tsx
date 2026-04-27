import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";

export const revalidate = 60;

const STATS: { v: string; l: string }[] = [
  { v: "64", l: "Coppie iscritte" },
  { v: "8", l: "Campi attivi" },
  { v: "12h", l: "Di sport non-stop" },
  { v: "2K€", l: "Montepremi totale" },
];

const TICKER_TOP = "★ Chanteclair Padel Cup · 13.06.2026 · Sant'Agata Bolognese · ";
const TICKER_BOTTOM = "★ Sport · Divertimento · Musica · 13.06.2026 · ";

export default async function HomePage() {
  const tornei = await prisma.tournament.findMany({
    where: { stato: "ATTIVO" },
    include: { matches: true },
  });

  const torneoM = tornei.find((t) => t.genere === "MASCHILE");
  const torneoF = tornei.find((t) => t.genere === "FEMMINILE");

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-night-deep text-paper">
      <Marquee text={TICKER_TOP} />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between gap-6 px-6 md:px-10 py-5">
        <Link href="/" className="flex items-center gap-3.5">
          <Image
            src="/chantepadel.PNG"
            alt="Chanteclair Padel Cup"
            width={56}
            height={52}
            priority
            className="object-contain"
          />
          <span className="cc-display text-2xl">Chanteclair</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <a href="#tornei" className="hover:text-yellow transition-colors">
            Tornei
          </a>
          <a href="#premi" className="hover:text-yellow transition-colors">
            Premi
          </a>
          <a href="#programma" className="hover:text-yellow transition-colors">
            Programma
          </a>
          <Link
            href="/tabellone-maschile"
            className="hover:text-yellow transition-colors"
          >
            Tabelloni
          </Link>
        </nav>
        <Link
          href="/tabellone-maschile"
          className="cc-btn cc-btn-primary"
        >
          Tabellone live →
        </Link>
      </header>

      {/* HERO */}
      <section
        className="relative px-6 md:px-10 pt-6 pb-8 overflow-hidden flex flex-col justify-between"
        style={{ minHeight: "calc(100vh - 130px)" }}
      >
        <div
          aria-hidden
          className="absolute inset-0 cc-stripes opacity-60 pointer-events-none"
        />

        {/* Yellow slash — bottom layer, aligned with hero vertical center */}
        <div
          aria-hidden
          className="absolute pointer-events-none z-[1]"
          style={{
            left: "-10%",
            top: "50%",
            width: "120%",
            height: "clamp(110px, 14vw, 180px)",
            background: "var(--color-yellow)",
            transform: "translateY(-50%) rotate(-6deg)",
          }}
        />

        {/* Brand image circle — vertically centered on slash, right-anchored */}
        <div
          aria-hidden
          className="absolute pointer-events-none z-[2] aspect-square rounded-full bg-paper flex items-center justify-center"
          style={{
            right: "4%",
            top: "50%",
            width: "clamp(120px, 30vw, 460px)",
            transform: "translateY(-50%)",
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.45)",
          }}
        >
          <Image
            src="/chanteclairpadel_home_v2.png"
            alt=""
            width={517}
            height={368}
            priority
            className="object-contain"
            style={{ width: "88%", height: "88%" }}
          />
        </div>

        <div className="relative z-[3] flex-1 flex flex-col justify-center">
          <div className="cc-mono inline-block bg-red text-paper px-3 py-1.5 mb-3 self-start">
            ◆ Sabato 13 Giugno 2026 · Open Padel S.A.B.
          </div>

          <h1
            className="m-0 relative"
            style={{ maxWidth: "min(70%, 1100px)" }}
          >
            <div
              className="cc-display text-paper"
              style={{
                fontSize: "clamp(80px, 11vw, 190px)",
                lineHeight: 0.84,
                textShadow: "0 6px 0 var(--color-night-deep)",
              }}
            >
              Chanteclair
            </div>
            <div
              className="cc-display text-paper -mt-2"
              style={{
                fontSize: "clamp(100px, 14vw, 240px)",
                lineHeight: 0.82,
                textShadow:
                  "0 6px 0 var(--color-night-deep), 0 0 22px rgba(14, 20, 36, 0.55)",
              }}
            >
              Padel Cup
            </div>
          </h1>
        </div>

        <div className="relative z-[3] mt-6 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6 lg:gap-10 items-end">
          <div
            className="cc-display text-yellow max-w-[560px]"
            style={{ fontSize: "clamp(24px, 3vw, 40px)", lineHeight: 1 }}
          >
            Due tornei,
            <br />
            <span className="text-paper">un&apos;unica grande</span>
            <br />
            giornata di sport.
          </div>
          <div className="flex gap-3 justify-start lg:justify-end flex-wrap">
            <Link
              href="/tabellone-maschile"
              className="cc-btn cc-btn-primary"
              style={{ fontSize: 20, padding: "14px 24px 11px" }}
            >
              Tabellone live →
            </Link>
            <a
              href="#programma"
              className="cc-btn cc-btn-ghost text-paper"
              style={{ fontSize: 20, padding: "12.5px 24px 9.5px" }}
            >
              Programma
            </a>
          </div>
        </div>
      </section>

      {/* Stat strip */}
      <section className="bg-paper text-night-deep px-6 md:px-10 py-8 grid grid-cols-2 md:grid-cols-4 gap-y-6">
        {STATS.map((s, i) => (
          <div
            key={s.l}
            className="text-center px-3"
            style={{
              borderLeft: i > 0 ? "1px solid var(--color-line)" : undefined,
            }}
          >
            <div
              className="cc-display cc-num"
              style={{ fontSize: 96, lineHeight: 0.9 }}
            >
              {s.v}
            </div>
            <div
              className="cc-mono mt-1.5"
              style={{ color: "oklch(0.45 0.02 255)" }}
            >
              {s.l}
            </div>
          </div>
        ))}
      </section>

      {/* I due tornei */}
      <section id="tornei" className="grid grid-cols-1 md:grid-cols-2">
        <TournamentTile
          tag="M"
          index={1}
          title="Maschile"
          bg="var(--color-blue)"
          href="/tabellone-maschile"
          coppieCount={countTeams(torneoM)}
        />
        <TournamentTile
          tag="F"
          index={2}
          title="Femminile"
          bg="var(--color-pink)"
          href="/tabellone-femminile"
          coppieCount={countTeams(torneoF)}
        />
      </section>

      <Marquee text={TICKER_BOTTOM} />

      <div className="px-6 md:px-10 py-4 text-center">
        <Link
          href="/admin/login"
          className="cc-mono text-paper/40 hover:text-yellow transition-colors"
        >
          Area arbitri ↗
        </Link>
      </div>
    </main>
  );
}

function Marquee({ text }: { text: string }) {
  return (
    <div
      className="cc-ticker fast"
      style={{
        padding: "10px 0",
        background: "var(--color-yellow)",
        color: "var(--color-night-deep)",
        fontFamily: "var(--font-bebas), Impact, sans-serif",
        fontSize: 22,
        letterSpacing: "0.04em",
      }}
    >
      <div>
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className="pr-7">
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}

function TournamentTile({
  tag,
  index,
  title,
  bg,
  href,
  coppieCount,
}: {
  tag: "M" | "F";
  index: number;
  title: string;
  bg: string;
  href: string;
  coppieCount: number;
}) {
  return (
    <div
      className="relative overflow-hidden text-paper px-6 py-10 md:px-10 md:py-[60px]"
      style={{ background: bg, minHeight: "clamp(280px, 60vw, 420px)" }}
    >
      <div className="cc-mono mb-2">
        Torneo · {String(index).padStart(2, "0")} / 02
      </div>
      <div
        className="cc-display"
        style={{
          fontSize: "clamp(64px, 18vw, 220px)",
          lineHeight: 0.84,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </div>
      <div
        className="cc-display mt-4 md:mt-6 opacity-95"
        style={{ fontSize: "clamp(18px, 4vw, 32px)" }}
      >
        {coppieCount > 0 ? `${coppieCount} coppie` : "32 coppie"} · Tabellone live
      </div>
      <div className="mt-5 md:mt-7 flex gap-3 flex-wrap">
        <Link href={href} className="cc-btn cc-btn-primary">
          Tabellone live →
        </Link>
      </div>
      <div
        aria-hidden
        className="cc-display absolute pointer-events-none"
        style={{
          right: "-6%",
          bottom: "-18%",
          fontSize: "clamp(220px, 60vw, 520px)",
          lineHeight: 1,
          color: "rgba(255,255,255,0.10)",
        }}
      >
        {tag}
      </div>
    </div>
  );
}

function countTeams(
  t:
    | { matches: { team1Id: string | null; team2Id: string | null }[] }
    | undefined
): number {
  if (!t) return 0;
  const ids = new Set<string>();
  for (const m of t.matches) {
    if (m.team1Id) ids.add(m.team1Id);
    if (m.team2Id) ids.add(m.team2Id);
  }
  return ids.size;
}
