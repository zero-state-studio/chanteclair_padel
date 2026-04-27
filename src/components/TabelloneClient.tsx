"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Bracket, buildCode, type BracketViewMode } from "@/components/Bracket";
import { GironiView } from "@/components/GironiView";
import { LiveStrip } from "@/components/LiveStrip";
import { RoundLabels } from "@/components/RoundLabels";
import { LiveMatchOverlay } from "@/components/LiveMatchOverlay";
import { useSSE } from "@/hooks/useSSE";
import type {
  TournamentWithMatches,
  LiveEvent,
  Genere,
  BracketTipo,
} from "@/types";

interface TabelloneClientProps {
  torneoIniziale: TournamentWithMatches;
  genere: Genere;
}

const BRACKETS: BracketTipo[] = ["GOLD", "SILVER", "BRONZE"];

const BRACKET_LABEL: Record<BracketTipo, string> = {
  GOLD: "GOLD",
  SILVER: "SILVER",
  BRONZE: "BRONZE",
};

const BRACKET_ACCENT: Record<BracketTipo, string> = {
  GOLD: "var(--color-yellow)",
  SILVER: "oklch(0.85 0.02 255)",
  BRONZE: "oklch(0.65 0.08 30)",
};

export function TabelloneClient({
  torneoIniziale,
  genere,
}: TabelloneClientProps) {
  const [torneo, setTorneo] = useState(torneoIniziale);
  const [liveEvent, setLiveEvent] = useState<LiveEvent | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [userMode, setUserMode] = useState<BracketViewMode | null>(null);
  const [activeBracket, setActiveBracket] = useState<BracketTipo>("GOLD");

  const accent = genere === "MASCHILE" ? "var(--color-blue)" : "var(--color-pink)";

  const handleSSEEvent = useCallback(
    (event: LiveEvent) => {
      if (event.genere !== genere) return;

      setLiveEvent(event);

      setTimeout(async () => {
        try {
          const res = await fetch(`/api/tornei/${torneo.id}`, {
            cache: "no-store",
          });
          if (res.ok) {
            const torneoAggiornato = (await res.json()) as TournamentWithMatches;
            setTorneo(torneoAggiornato);
          }
        } catch {
          // ignora
        }
      }, 1000);
    },
    [torneo.id, genere]
  );

  useSSE(handleSSEEvent);

  const isFaseGironi = torneo.fase === "GIRONI";

  const bracketMatchesByTipo = useMemo(() => {
    const map = new Map<BracketTipo, typeof torneo.matches>();
    for (const tipo of BRACKETS) {
      map.set(
        tipo,
        torneo.matches.filter((m) => m.bracketTipo === tipo)
      );
    }
    return map;
  }, [torneo.matches]);

  const bracketsConPartite = useMemo(
    () => BRACKETS.filter((t) => (bracketMatchesByTipo.get(t)?.length ?? 0) > 0),
    [bracketMatchesByTipo]
  );

  const torneoActiveBracket = useMemo<TournamentWithMatches>(
    () => ({
      ...torneo,
      matches: bracketMatchesByTipo.get(activeBracket) ?? [],
    }),
    [torneo, bracketMatchesByTipo, activeBracket]
  );

  const liveMatches = useMemo(
    () => torneo.matches.filter((m) => m.stato === "IN_CORSO"),
    [torneo.matches]
  );

  const liveRound = useMemo<number | null>(() => {
    if (isFaseGironi) return null;
    const lm = liveMatches.filter((m) => m.bracketTipo === activeBracket);
    if (lm.length === 0) return null;
    return Math.min(...lm.map((m) => m.round));
  }, [liveMatches, isFaseGironi, activeBracket]);

  const autoMode: BracketViewMode = liveMatches.length > 0 ? "live" : "full";
  const viewMode: BracketViewMode = userMode ?? autoMode;

  useEffect(() => {
    setUserMode(null);
  }, [liveRound]);

  // Default tab to first bracket with live match
  useEffect(() => {
    if (isFaseGironi) return;
    const liveBracket = liveMatches.find((m) => m.bracketTipo)?.bracketTipo;
    if (liveBracket && BRACKETS.includes(liveBracket as BracketTipo)) {
      setActiveBracket(liveBracket as BracketTipo);
    }
  }, [liveMatches, isFaseGironi]);

  const roundsSummary = useMemo(() => {
    const map = new Map<number, number>();
    for (const m of torneoActiveBracket.matches) {
      map.set(m.round, (map.get(m.round) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([round, total]) => ({ round, total }))
      .sort((a, b) => b.round - a.round);
  }, [torneoActiveBracket.matches]);

  const maxRound = roundsSummary[0]?.round ?? 1;

  const visibleRoundsSummary = useMemo(() => {
    if (viewMode === "full") return roundsSummary;
    if (liveRound === null) return roundsSummary;
    const visible = new Set<number>([liveRound]);
    if (liveRound > 1) visible.add(liveRound - 1);
    return roundsSummary.filter((r) => visible.has(r.round));
  }, [roundsSummary, viewMode, liveRound]);

  const autoFocus =
    focused ??
    (liveMatches[0] && !isFaseGironi ? buildCode(liveMatches[0]) : null);

  const canToggleLive = liveRound !== null;

  return (
    <>
      <LiveStrip
        liveMatches={liveMatches}
        focused={autoFocus}
        onFocus={setFocused}
        accent={accent}
      />

      {!isFaseGironi && (
        <ViewModeToggle
          mode={viewMode}
          canLive={canToggleLive}
          onChange={setUserMode}
        />
      )}

      {isFaseGironi ? (
        <GironiView groups={torneo.groups} matches={torneo.matches} accent={accent} />
      ) : (
        <>
          {bracketsConPartite.length > 1 && (
            <BracketTabs
              brackets={bracketsConPartite}
              active={activeBracket}
              onChange={setActiveBracket}
            />
          )}
          <RoundLabels rounds={visibleRoundsSummary} maxRound={maxRound} />
          <Bracket
            torneo={torneoActiveBracket}
            accent={BRACKET_ACCENT[activeBracket]}
            focused={autoFocus}
            onFocus={setFocused}
            viewMode={viewMode}
            liveRound={liveRound}
          />
        </>
      )}

      <LiveMatchOverlay event={liveEvent} onClose={() => setLiveEvent(null)} />
    </>
  );
}

function BracketTabs({
  brackets,
  active,
  onChange,
}: {
  brackets: BracketTipo[];
  active: BracketTipo;
  onChange: (b: BracketTipo) => void;
}) {
  return (
    <div
      className="relative z-[3] flex items-center justify-center gap-2 px-4 md:px-8 py-2 border-b"
      style={{ borderColor: "oklch(0.3 0.04 255)" }}
    >
      {brackets.map((b) => (
        <button
          key={b}
          type="button"
          onClick={() => onChange(b)}
          className="cc-mono transition-colors"
          style={{
            fontSize: 11,
            padding: "6px 14px",
            background: active === b ? BRACKET_ACCENT[b] : "oklch(0.24 0.05 255)",
            color: active === b ? "var(--color-night-deep)" : "var(--color-paper)",
            border: `1px solid ${BRACKET_ACCENT[b]}`,
          }}
        >
          {BRACKET_LABEL[b]}
        </button>
      ))}
    </div>
  );
}

function ViewModeToggle({
  mode,
  canLive,
  onChange,
}: {
  mode: BracketViewMode;
  canLive: boolean;
  onChange: (m: BracketViewMode) => void;
}) {
  return (
    <div
      className="relative z-[3] flex items-center justify-center md:justify-end gap-2 px-4 md:px-8 py-2 border-b"
      style={{ borderColor: "oklch(0.3 0.04 255)" }}
    >
      <span
        className="cc-mono mr-2 hidden sm:inline"
        style={{ fontSize: 10, color: "oklch(0.7 0.02 255)" }}
      >
        Vista
      </span>
      <button
        type="button"
        onClick={() => onChange("full")}
        className="cc-mono transition-colors"
        style={{
          fontSize: 11,
          padding: "6px 12px",
          background:
            mode === "full" ? "var(--color-yellow)" : "oklch(0.24 0.05 255)",
          color: mode === "full" ? "var(--color-night-deep)" : "var(--color-paper)",
          border: "1px solid oklch(0.32 0.05 255)",
        }}
      >
        Completo
      </button>
      <button
        type="button"
        onClick={() => onChange("live")}
        disabled={!canLive}
        className="cc-mono transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          fontSize: 11,
          padding: "6px 12px",
          background:
            mode === "live" ? "var(--color-yellow)" : "oklch(0.24 0.05 255)",
          color: mode === "live" ? "var(--color-night-deep)" : "var(--color-paper)",
          border: "1px solid oklch(0.32 0.05 255)",
        }}
        title={canLive ? "Zoom su round live" : "Nessun match live"}
      >
        Zoom Live
      </button>
    </div>
  );
}
