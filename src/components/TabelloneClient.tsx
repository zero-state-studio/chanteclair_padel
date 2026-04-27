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
  const [eventQueue, setEventQueue] = useState<LiveEvent[]>([]);
  const [focused, setFocused] = useState<string | null>(null);
  const [userMode, setUserMode] = useState<BracketViewMode | null>(null);
  const [activeBracket, setActiveBracket] = useState<BracketTipo>("GOLD");
  const [activePhase, setActivePhase] = useState<"GIRONI" | "BRACKET">(
    torneoIniziale.fase
  );
  const [autoCycle, setAutoCycle] = useState(false);

  const accent = genere === "MASCHILE" ? "var(--color-blue)" : "var(--color-pink)";

  const handleSSEEvent = useCallback(
    (event: LiveEvent) => {
      if (event.genere !== genere) return;

      setEventQueue((q) => [...q, event]);

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

  const currentEvent = eventQueue[0] ?? null;
  const dismissCurrentEvent = useCallback(() => {
    setEventQueue((q) => q.slice(1));
  }, []);

  useSSE(handleSSEEvent);

  const hasGroups = torneo.groups.length > 0;
  const hasBracket = torneo.fase === "BRACKET";
  const isFaseGironi = activePhase === "GIRONI" || !hasBracket;

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

  // Zoom Live disabilitato — viewMode forzato a "full"
  const viewMode: BracketViewMode = "full";

  useEffect(() => {
    setUserMode(null);
  }, [liveRound]);

  useEffect(() => {
    setActivePhase(torneo.fase);
  }, [torneo.fase]);

  useEffect(() => {
    if (!autoCycle) return;
    if (isFaseGironi) return;
    if (bracketsConPartite.length < 2) return;
    const id = setInterval(() => {
      setActiveBracket((curr) => {
        const idx = bracketsConPartite.indexOf(curr);
        const next = bracketsConPartite[(idx + 1) % bracketsConPartite.length];
        return next ?? curr;
      });
    }, 45000);
    return () => clearInterval(id);
  }, [autoCycle, isFaseGironi, bracketsConPartite]);

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

      {(hasBracket && hasGroups) || !isFaseGironi ? (
        <div
          className="relative z-[3] flex flex-wrap items-center gap-3 px-4 md:px-8 py-2 border-b"
          style={{ borderColor: "oklch(0.3 0.04 255)" }}
        >
          {hasBracket && hasGroups && (
            <PhaseToggle
              active={activePhase}
              onChange={setActivePhase}
              accent={accent}
            />
          )}
          {!isFaseGironi && bracketsConPartite.length > 1 && (
            <BracketTabs
              brackets={bracketsConPartite}
              active={activeBracket}
              onChange={setActiveBracket}
            />
          )}
          {!isFaseGironi && (
            <div className="ml-auto flex items-center gap-3 flex-wrap">
              {bracketsConPartite.length > 1 && (
                <AutoToggle
                  active={autoCycle}
                  onChange={setAutoCycle}
                />
              )}
              <ViewModeToggle
                mode={viewMode}
                canLive={canToggleLive}
                onChange={setUserMode}
              />
            </div>
          )}
        </div>
      ) : null}

      {isFaseGironi ? (
        <GironiView groups={torneo.groups} matches={torneo.matches} accent={accent} />
      ) : (
        <>
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

      <LiveMatchOverlay event={currentEvent} onClose={dismissCurrentEvent} />
    </>
  );
}

function AutoToggle({
  active,
  onChange,
}: {
  active: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="cc-mono mr-1 hidden sm:inline"
        style={{ fontSize: 10, color: "oklch(0.7 0.02 255)" }}
      >
        Auto
      </span>
      <button
        type="button"
        onClick={() => onChange(!active)}
        className="cc-mono uppercase transition-colors"
        title={active ? "Cambio bracket ogni 45s — clicca per fermare" : "Cambio bracket automatico ogni 45s"}
        style={{
          fontSize: 11,
          padding: "6px 12px",
          background: active ? "var(--color-yellow)" : "oklch(0.24 0.05 255)",
          color: active ? "var(--color-night-deep)" : "var(--color-paper)",
          border: "1px solid oklch(0.32 0.05 255)",
        }}
      >
        {active ? "ON" : "OFF"}
      </button>
    </div>
  );
}

function PhaseToggle({
  active,
  onChange,
  accent,
}: {
  active: "GIRONI" | "BRACKET";
  onChange: (p: "GIRONI" | "BRACKET") => void;
  accent: string;
}) {
  const phases: { value: "GIRONI" | "BRACKET"; label: string }[] = [
    { value: "GIRONI", label: "Gironi" },
    { value: "BRACKET", label: "Bracket" },
  ];
  return (
    <div className="flex items-center gap-2">
      {phases.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(p.value)}
          className="cc-mono uppercase transition-colors"
          style={{
            fontSize: 11,
            padding: "6px 16px",
            background: active === p.value ? accent : "oklch(0.24 0.05 255)",
            color:
              active === p.value
                ? "var(--color-night-deep)"
                : "var(--color-paper)",
            border: `1px solid ${accent}`,
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
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
    <div className="flex items-center gap-2">
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
    <div className="flex items-center gap-2">
      <span
        className="cc-mono mr-1 hidden sm:inline"
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
      {/* Zoom Live disabilitato — feature in pausa
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
      */}
    </div>
  );
}
