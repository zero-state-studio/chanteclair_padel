interface RoundLabelsProps {
  rounds: { round: number; total: number }[];
  maxRound: number;
}

const ROUND_NAMES: Record<number, string> = {
  1: "Finale",
  2: "Semifinali",
  3: "Quarti",
  4: "Ottavi",
  5: "Sedicesimi",
  6: "Trentaduesimi",
};

const COL_TEMPLATES: Record<number, string> = {
  4: "1.5fr 1.2fr 1fr 1fr",
  3: "1.4fr 1.1fr 1fr",
  2: "1.2fr 1fr",
  1: "1fr",
};

export function RoundLabels({ rounds, maxRound }: RoundLabelsProps) {
  // Order: largest round first (Ottavi → Finale)
  const ordered = [...rounds].sort((a, b) => b.round - a.round);
  const cols = COL_TEMPLATES[ordered.length] ?? "repeat(4, 1fr)";

  return (
    <section
      className="relative z-[3] flex flex-wrap md:grid gap-x-3 gap-y-1 md:gap-4 px-4 md:px-8 py-2 md:py-2.5 border-b"
      style={{
        gridTemplateColumns: cols,
        borderColor: "oklch(0.3 0.04 255)",
      }}
    >
      {ordered.map((r) => {
        const isFinale = r.round === 1;
        return (
          <div
            key={r.round}
            className="flex items-baseline gap-1.5 md:gap-2.5"
          >
            <span
              className="cc-display"
              style={{
                fontSize: "clamp(14px, 4vw, 22px)",
                color: isFinale ? "var(--color-yellow)" : "var(--color-paper)",
              }}
            >
              {ROUND_NAMES[r.round] ?? `Round ${maxRound - r.round + 1}`}
            </span>
            <span
              className="cc-mono"
              style={{
                fontSize: 10,
                color: isFinale
                  ? "var(--color-yellow)"
                  : "oklch(0.7 0.02 255)",
                opacity: isFinale ? 0.9 : 1,
              }}
            >
              {r.total}
            </span>
          </div>
        );
      })}
    </section>
  );
}
