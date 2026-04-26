"use client";

import { useEffect, useRef, useState } from "react";
import { BracketMatch } from "@/components/BracketMatch";
import type { MatchWithTeams, TournamentWithMatches } from "@/types";

interface BracketProps {
  torneo: TournamentWithMatches;
  accent?: string;
  focused?: string | null;
  onFocus?: (code: string | null) => void;
}

const COL_TEMPLATES: Record<number, string> = {
  4: "1.5fr 1.2fr 1fr 1fr",
  3: "1.4fr 1.1fr 1fr",
  2: "1.2fr 1fr",
  1: "1fr",
};

export function Bracket({
  torneo,
  accent = "var(--color-yellow)",
  focused = null,
  onFocus = () => {},
}: BracketProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const bracketRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fit = () => {
      const stage = stageRef.current;
      const bracket = bracketRef.current;
      if (!stage || !bracket) return;
      // Mobile: skip transform scaling — use horizontal scroll instead
      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      if (isMobile) {
        bracket.style.transform = "none";
        setScale(1);
        return;
      }
      bracket.style.transform = "scale(1)";
      const stageBox = stage.getBoundingClientRect();
      const natW = bracket.scrollWidth;
      const natH = bracket.scrollHeight;
      const padding = 12;
      const s = Math.min(
        (stageBox.width - padding) / natW,
        (stageBox.height - padding) / natH,
        1
      );
      setScale(Number.isFinite(s) && s > 0 ? s : 1);
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (stageRef.current) ro.observe(stageRef.current);
    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [torneo.id, torneo.matches.length]);

  if (!torneo.matches.length) {
    return (
      <section className="relative z-[2] flex flex-1 items-center justify-center px-6">
        <div className="text-center">
          <div
            className="cc-display"
            style={{ fontSize: 60, color: "oklch(0.55 0.02 255)" }}
          >
            Bracket non ancora generato
          </div>
          <div className="cc-mono mt-3" style={{ color: "oklch(0.55 0.02 255)" }}>
            In attesa di sorteggio
          </div>
        </div>
      </section>
    );
  }

  const matchesByRound = torneo.matches.reduce<Record<number, MatchWithTeams[]>>(
    (acc, match) => {
      (acc[match.round] ??= []).push(match);
      return acc;
    },
    {}
  );

  const rounds = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => b - a);
  const cols = COL_TEMPLATES[rounds.length] ?? `repeat(${rounds.length}, 1fr)`;

  return (
    <section
      ref={stageRef}
      className="relative z-[2] md:flex-1 md:min-h-0 px-4 md:px-8 py-4 md:py-3 flex items-start md:items-center justify-start md:justify-center overflow-x-auto md:overflow-hidden"
    >
      <div
        ref={bracketRef}
        style={{
          width: 1280,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          display: "grid",
          gridTemplateColumns: cols,
          gap: 16,
        }}
      >
        {rounds.map((round, idx) => {
          const matches = matchesByRound[round].sort(
            (a, b) => a.posizione - b.posizione
          );
          const isFinaleCol = round === 1;
          const isOttaviCol = idx === 0; // first column = stacked
          const isBig = !isOttaviCol;

          if (isFinaleCol) {
            return (
              <div
                key={round}
                className="flex items-center justify-center"
              >
                <div
                  style={{
                    padding: 4,
                    background: `linear-gradient(135deg, ${accent}, var(--color-yellow))`,
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      background: "oklch(0.20 0.04 255)",
                      padding: 14,
                    }}
                  >
                    <div
                      className="cc-mono text-center mb-1.5"
                      style={{ fontSize: 10, color: "var(--color-yellow)" }}
                    >
                      ★ FINALE
                    </div>
                    {matches[0] && (
                      <BracketMatch
                        match={matches[0]}
                        big
                        accent={accent}
                        focused={focused === buildCode(matches[0])}
                        onFocus={onFocus}
                        code={buildCode(matches[0])}
                      />
                    )}
                    <div
                      className="cc-display text-center mt-2"
                      style={{
                        fontSize: 14,
                        color: "var(--color-yellow)",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Trofeo Chanteclair
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={round}
              className="flex flex-col"
              style={{
                gap: 4,
                justifyContent: isOttaviCol ? "flex-start" : "space-around",
              }}
            >
              {matches.map((m) => (
                <BracketMatch
                  key={m.id}
                  match={m}
                  big={isBig}
                  accent={accent}
                  focused={focused === buildCode(m)}
                  onFocus={onFocus}
                  code={buildCode(m)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function buildCode(m: MatchWithTeams): string {
  return `R${m.round}-P${m.posizione}`;
}
