"use client";

import type { MatchWithTeams } from "@/types";

interface LiveStripProps {
  liveMatches: MatchWithTeams[];
  focused: string | null;
  onFocus: (code: string | null) => void;
  accent: string;
}

export function LiveStrip({
  liveMatches,
  focused,
  onFocus,
  accent,
}: LiveStripProps) {
  const now = new Date();
  const ora = `${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;

  return (
    <section
      className="relative z-[4] grid items-center gap-6 px-6 md:px-8 py-3.5 border-b"
      style={{
        gridTemplateColumns: "auto 1fr",
        background: `linear-gradient(90deg, ${accent}22, transparent 60%)`,
        borderColor: "oklch(0.3 0.04 255)",
      }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="inline-block"
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "var(--color-yellow)",
            boxShadow: "0 0 18px var(--color-yellow)",
            animation: "cc-live-pulse 1.4s ease-in-out infinite",
          }}
        />
        <div>
          <div
            className="cc-display"
            style={{ fontSize: 26, lineHeight: 1, color: "var(--color-yellow)" }}
          >
            In esecuzione
          </div>
          <div
            className="cc-mono"
            style={{ fontSize: 10, color: "oklch(0.78 0.02 255)" }}
          >
            {liveMatches.length} match · ora {ora}
          </div>
        </div>
      </div>

      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${Math.max(liveMatches.length, 1)}, 1fr)`,
        }}
      >
        {liveMatches.length === 0 ? (
          <div
            className="cc-mono py-2.5 px-3.5"
            style={{
              border: "1px dashed oklch(0.32 0.05 255)",
              color: "oklch(0.6 0.02 255)",
            }}
          >
            Nessun match live al momento
          </div>
        ) : (
          liveMatches.map((m) => {
            const code = matchCode(m);
            const t1 = teamLabel(m.team1);
            const t2 = teamLabel(m.team2);
            const score = m.punteggio ?? "—";
            const isFocus = focused === code;
            return (
              <button
                key={m.id}
                onMouseEnter={() => onFocus(code)}
                onMouseLeave={() => onFocus(null)}
                onClick={() => onFocus(isFocus ? null : code)}
                className="text-left grid items-center gap-3 cursor-pointer transition-all"
                style={{
                  gridTemplateColumns: "1fr auto",
                  background: isFocus
                    ? "oklch(0.32 0.05 255)"
                    : "oklch(0.24 0.05 255)",
                  border: `1.5px solid ${accent}`,
                  padding: "10px 14px",
                  color: "var(--color-paper)",
                  fontFamily: "inherit",
                }}
              >
                <div className="min-w-0">
                  <div
                    className="cc-mono mb-1"
                    style={{
                      fontSize: 9,
                      color: "oklch(0.78 0.02 255)",
                    }}
                  >
                    {code}
                  </div>
                  <div
                    className="cc-display truncate"
                    style={{ fontSize: 16, lineHeight: 1.15 }}
                  >
                    {t1}
                  </div>
                  <div
                    className="cc-display truncate"
                    style={{ fontSize: 16, lineHeight: 1.15 }}
                  >
                    {t2}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="cc-display cc-num"
                    style={{
                      fontSize: 22,
                      color: "var(--color-yellow)",
                      lineHeight: 1,
                    }}
                  >
                    {score}
                  </div>
                  <div
                    className="cc-mono mt-1"
                    style={{ fontSize: 9, color: accent }}
                  >
                    ● LIVE
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}

function matchCode(m: MatchWithTeams): string {
  // Round 1 = finale; build code as e.g. "R3-P2"
  return `R${m.round}-P${m.posizione}`;
}

function teamLabel(team: { player1: { cognome: string }; player2: { cognome: string } } | null): string {
  if (!team) return "—";
  return `${team.player1.cognome} / ${team.player2.cognome}`;
}
