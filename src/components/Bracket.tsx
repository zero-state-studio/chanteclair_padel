"use client";

import { useEffect, useRef, useState } from "react";
import { BracketMatch, type MatchSize } from "@/components/BracketMatch";
import type { MatchWithTeams, TournamentWithMatches } from "@/types";

export type BracketViewMode = "full" | "live";

interface BracketProps {
  torneo: TournamentWithMatches;
  accent?: string;
  focused?: string | null;
  onFocus?: (code: string | null) => void;
  viewMode?: BracketViewMode;
  liveRound?: number | null;
}

// Size by stage from finale (0 = finale, 1 = semi, 2 = quarti, 3 = ottavi, 4+ = early)
const SIZE_BY_STAGE: MatchSize[] = ["xl", "lg", "md", "sm", "xs"];

function sizeForRound(round: number): MatchSize {
  const stage = Math.max(0, round - 1);
  return SIZE_BY_STAGE[Math.min(stage, SIZE_BY_STAGE.length - 1)];
}

// Approx natural width per size (px) — used to compute container width
const WIDTH_BY_SIZE: Record<MatchSize, number> = {
  xs: 200,
  sm: 240,
  md: 320,
  lg: 420,
  xl: 540,
};

export function Bracket({
  torneo,
  accent = "var(--color-yellow)",
  focused = null,
  onFocus = () => {},
  viewMode = "full",
  liveRound = null,
}: BracketProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const bracketRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fit = () => {
      const stage = stageRef.current;
      const bracket = bracketRef.current;
      if (!stage || !bracket) return;
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
      const padding = 16;
      const s = Math.min(
        (stageBox.width - padding) / natW,
        (stageBox.height - padding) / natH,
        2.6
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
  }, [torneo.id, torneo.matches.length, viewMode, liveRound]);

  // Auto-scroll to live column when overflow (mobile or narrow desktop).
  useEffect(() => {
    if (liveRound === null) return;
    const stage = stageRef.current;
    if (!stage) return;
    const liveEl = stage.querySelector<HTMLElement>(
      `[data-round="${liveRound}"]`
    );
    if (!liveEl) return;
    if (stage.scrollWidth <= stage.clientWidth) return;
    const target =
      liveEl.offsetLeft - (stage.clientWidth - liveEl.offsetWidth) / 2;
    stage.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [liveRound, viewMode, torneo.matches.length]);

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

  let rounds = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => b - a);

  // Live mode: show live round + its successor (closer to finale).
  // If no live round, fallback to first round with un-played matches + successor.
  if (viewMode === "live") {
    const focal =
      liveRound ??
      torneo.matches.find((m) => m.stato === "IN_CORSO")?.round ??
      pickActiveRound(torneo.matches) ??
      rounds[rounds.length - 1];
    const visible = new Set<number>([focal]);
    if (focal > 1) visible.add(focal - 1);
    rounds = rounds.filter((r) => visible.has(r));
  }

  // Compute container width as sum of column widths so cards render at natural
  // size; the scale logic upscales to fill the stage.
  const colWidths = rounds.map((r) => WIDTH_BY_SIZE[sizeForRound(r)]);
  const containerWidth = colWidths.reduce((a, b) => a + b, 0) + (rounds.length - 1) * 24;

  return (
    <section
      ref={stageRef}
      className="relative z-[2] md:flex-1 md:min-h-0 px-3 md:px-8 py-3 md:py-3 flex items-start md:items-center justify-start md:justify-center overflow-x-auto md:overflow-hidden"
    >
      <div
        ref={bracketRef}
        style={{
          width: containerWidth,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          display: "grid",
          gridTemplateColumns: colWidths.map((w) => `${w}px`).join(" "),
          gap: 24,
          alignItems: "stretch",
        }}
      >
        {rounds.map((round) => {
          const matches = matchesByRound[round].sort(
            (a, b) => a.posizione - b.posizione
          );
          const matchSize = sizeForRound(round);
          const isFinaleCol = round === 1;
          const isLiveCol = liveRound === round;

          if (isFinaleCol) {
            return (
              <div
                key={round}
                data-round={round}
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
                      style={{ fontSize: 11, color: "var(--color-yellow)" }}
                    >
                      ★ FINALE
                    </div>
                    {matches[0] && (
                      <BracketMatch
                        match={matches[0]}
                        size={matchSize}
                        accent={accent}
                        focused={focused === buildCode(matches[0])}
                        onFocus={onFocus}
                        code={buildCode(matches[0])}
                      />
                    )}
                    <div
                      className="cc-display text-center mt-2"
                      style={{
                        fontSize: 16,
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
              data-round={round}
              className="flex flex-col"
              style={{
                gap: 4,
                justifyContent: "space-around",
                outline: isLiveCol
                  ? `1.5px dashed ${accent}`
                  : "none",
                outlineOffset: 8,
              }}
            >
              {matches.map((m) => (
                <BracketMatch
                  key={m.id}
                  match={m}
                  size={matchSize}
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

function pickActiveRound(matches: MatchWithTeams[]): number | null {
  // Earliest round (largest round number) that still has unplayed matches.
  const byRound = new Map<number, MatchWithTeams[]>();
  for (const m of matches) {
    const arr = byRound.get(m.round) ?? [];
    arr.push(m);
    byRound.set(m.round, arr);
  }
  const sorted = [...byRound.keys()].sort((a, b) => b - a);
  for (const r of sorted) {
    const arr = byRound.get(r)!;
    const hasOpen = arr.some(
      (m) => m.stato !== "COMPLETATA" && m.team1 && m.team2
    );
    if (hasOpen) return r;
  }
  return sorted[0] ?? null;
}
