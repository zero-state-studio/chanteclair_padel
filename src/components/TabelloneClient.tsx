"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Bracket, buildCode, type BracketViewMode } from "@/components/Bracket";
import { GironiView } from "@/components/GironiView";
import { LiveStrip } from "@/components/LiveStrip";
import { RoundLabels } from "@/components/RoundLabels";
import { LiveMatchOverlay } from "@/components/LiveMatchOverlay";
import { SponsorShowcaseOverlay } from "@/components/SponsorShowcaseOverlay";
import { GironiAnimation } from "@/components/GironiAnimation";
import { FinaliAnimation } from "@/components/FinaliAnimation";
import { FinalPresentation } from "@/components/FinalPresentation";
import { FinalVictory } from "@/components/FinalVictory";
import { useRealtime } from "@/hooks/useRealtime";
import type {
  TournamentWithMatches,
  LiveEvent,
  MatchLiveEvent,
  SponsorLite,
  Genere,
  BracketTipo,
} from "@/types";

interface TabelloneClientProps {
  torneoIniziale: TournamentWithMatches;
  genere: Genere;
  enableGironiAnimation?: boolean;
  autoStartAnimationOnMount?: boolean;
  autoStartFinaliAnimationOnMount?: boolean;
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
  enableGironiAnimation = true,
  autoStartAnimationOnMount = false,
  autoStartFinaliAnimationOnMount = false,
}: TabelloneClientProps) {
  const [torneo, setTorneo] = useState(torneoIniziale);
  const [eventQueue, setEventQueue] = useState<MatchLiveEvent[]>([]);
  const [parzialeNotice, setParzialeNotice] = useState<MatchLiveEvent | null>(
    null
  );
  const [showcaseSponsors, setShowcaseSponsors] = useState<SponsorLite[] | null>(
    null
  );
  const [focused, setFocused] = useState<string | null>(null);
  const [userMode, setUserMode] = useState<BracketViewMode | null>(null);
  const [activeBracket, setActiveBracket] = useState<BracketTipo>("GOLD");
  const [activePhase, setActivePhase] = useState<"GIRONI_1" | "GIRONI_2" | "FINALI">(
    torneoIniziale.fase === "BOZZA"
      ? "GIRONI_1"
      : torneoIniziale.fase === "COMPLETATO"
      ? "FINALI"
      : (torneoIniziale.fase as "GIRONI_1" | "GIRONI_2" | "FINALI")
  );
  const [autoCycle, setAutoCycle] = useState(false);
  const [animationTorneo, setAnimationTorneo] = useState<TournamentWithMatches | null>(
    autoStartAnimationOnMount && enableGironiAnimation ? torneoIniziale : null
  );
  const [finaliAnimationTorneo, setFinaliAnimationTorneo] =
    useState<TournamentWithMatches | null>(
      autoStartFinaliAnimationOnMount ? torneoIniziale : null
    );

  const accent = genere === "MASCHILE" ? "var(--color-blue)" : "var(--color-pink)";

  const handleSSEEvent = useCallback(
    (event: LiveEvent) => {
      if (event.tipo === "SPONSOR_SHOWCASE") {
        setShowcaseSponsors(event.sponsors);
        return;
      }

      if (event.tipo === "GIRONI_ANIMATION") {
        if (!enableGironiAnimation) return;
        if (event.genere !== genere) return;
        (async () => {
          try {
            const res = await fetch(`/api/tornei/${event.tournamentId}`, {
              cache: "no-store",
            });
            if (!res.ok) return;
            const data = (await res.json()) as TournamentWithMatches;
            if (data.groups.length === 0) return;
            setAnimationTorneo(data);
          } catch {
            // ignora
          }
        })();
        return;
      }

      if (event.tipo === "FINALI_ANIMATION") {
        if (event.genere !== genere) return;
        (async () => {
          try {
            const res = await fetch(`/api/tornei/${event.tournamentId}`, {
              cache: "no-store",
            });
            if (!res.ok) return;
            const data = (await res.json()) as TournamentWithMatches;
            setTorneo(data);
            setFinaliAnimationTorneo(data);
          } catch {
            // ignora
          }
        })();
        return;
      }

      if (event.tipo === "TORNEO_INIZIATO") {
        return;
      }

      if (event.genere !== genere) return;

      if (event.tipo === "PARTITA_PARZIALE") {
        setParzialeNotice(event);
      } else {
        setEventQueue((q) => [...q, event]);
      }

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
    [torneo.id, genere, enableGironiAnimation]
  );

  useEffect(() => {
    if (!parzialeNotice) return;
    const t = setTimeout(() => setParzialeNotice(null), 6000);
    return () => clearTimeout(t);
  }, [parzialeNotice]);

  const currentEvent = eventQueue[0] ?? null;
  const dismissCurrentEvent = useCallback(() => {
    setEventQueue((q) => q.slice(1));
  }, []);
  const dismissShowcase = useCallback(() => {
    setShowcaseSponsors(null);
  }, []);

  useRealtime(handleSSEEvent);

  const hasFase1 = torneo.groups.some((g) => g.fase === 1);
  const hasFase2 = torneo.groups.some((g) => g.fase === 2);
  const hasFinali = torneo.matches.some((m) => m.bracketTipo !== null && m.groupId === null);
  const isFaseGironi = activePhase === "GIRONI_1" || activePhase === "GIRONI_2";

  const bracketMatchesByTipo = useMemo(() => {
    const map = new Map<BracketTipo, typeof torneo.matches>();
    for (const tipo of BRACKETS) {
      map.set(
        tipo,
        torneo.matches.filter(
          (m) => m.bracketTipo === tipo && m.groupId === null
        )
      );
    }
    return map;
  }, [torneo.matches]);

  const bracketsConPartite = useMemo(
    () => BRACKETS.filter((t) => (bracketMatchesByTipo.get(t)?.length ?? 0) > 0),
    [bracketMatchesByTipo]
  );

  const bracketsConGironi2 = useMemo(
    () =>
      BRACKETS.filter((t) =>
        torneo.groups.some((g) => g.fase === 2 && g.bracketTipo === t)
      ),
    [torneo.groups]
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
    if (torneo.fase === "BOZZA") setActivePhase("GIRONI_1");
    else if (torneo.fase === "COMPLETATO") setActivePhase("FINALI");
    else setActivePhase(torneo.fase as "GIRONI_1" | "GIRONI_2" | "FINALI");
  }, [torneo.fase]);

  useEffect(() => {
    if (!autoCycle) return;
    if (activePhase !== "FINALI") return;
    if (bracketsConPartite.length < 2) return;
    const id = setInterval(() => {
      setActiveBracket((curr) => {
        const idx = bracketsConPartite.indexOf(curr);
        const next = bracketsConPartite[(idx + 1) % bracketsConPartite.length];
        return next ?? curr;
      });
    }, 20000);
    return () => clearInterval(id);
  }, [autoCycle, activePhase, bracketsConPartite]);

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

      {hasFase1 || hasFase2 || hasFinali ? (
        <div
          className="relative z-[3] flex flex-wrap items-center gap-3 px-4 md:px-8 py-2 border-b"
          style={{ borderColor: "oklch(0.3 0.04 255)" }}
        >
          {(hasFase1 || hasFase2 || hasFinali) && (
            <PhaseToggle
              active={activePhase}
              onChange={setActivePhase}
              available={{ fase1: hasFase1, fase2: hasFase2, finali: hasFinali }}
              accent={accent}
            />
          )}
          {activePhase !== "GIRONI_1" &&
            (activePhase === "FINALI" ? bracketsConPartite.length > 1 : bracketsConGironi2.length > 1) && (
              <BracketTabs
                brackets={activePhase === "FINALI" ? bracketsConPartite : bracketsConGironi2}
                active={activeBracket}
                onChange={setActiveBracket}
              />
            )}
          {activePhase === "FINALI" && (
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
        <GironiView
          groups={
            activePhase === "GIRONI_1"
              ? torneo.groups.filter((g) => g.fase === 1)
              : torneo.groups.filter((g) => g.fase === 2 && g.bracketTipo === activeBracket)
          }
          matches={torneo.matches}
          accent={accent}
        />
      ) : (
        <div
          className="relative isolate overflow-hidden"
          style={{
            borderTop: `3px solid ${BRACKET_ACCENT[activeBracket]}`,
          }}
        >
          {/* Watermark verticale — colore tabellone, ancorato a destra */}
          <span
            aria-hidden
            className="cc-display absolute pointer-events-none select-none"
            style={{
              right: "-2vw",
              top: "12vh",
              fontSize: "clamp(180px, 26vw, 440px)",
              color: BRACKET_ACCENT[activeBracket],
              opacity: 0.08,
              letterSpacing: "0.06em",
              lineHeight: 0.85,
              whiteSpace: "nowrap",
              transform: "rotate(-90deg)",
              transformOrigin: "right top",
              zIndex: 0,
            }}
          >
            {BRACKET_LABEL[activeBracket]}
          </span>

          {/* Striscia verticale edge destra con glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 bottom-0 right-0"
            style={{
              width: 6,
              background: BRACKET_ACCENT[activeBracket],
              boxShadow: `0 0 28px ${BRACKET_ACCENT[activeBracket]}`,
              opacity: 0.85,
              zIndex: 1,
            }}
          />

          {/* Chevron label angolo top-right */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 right-0 z-[2] flex items-center"
            style={{
              background: BRACKET_ACCENT[activeBracket],
              color: "var(--color-night-deep)",
              fontFamily: "var(--font-bebas), Impact, sans-serif",
              letterSpacing: "0.3em",
              fontSize: 14,
              padding: "6px 14px 4px 22px",
              clipPath: "polygon(12px 0, 100% 0, 100% 100%, 0 100%)",
            }}
          >
            ★ {BRACKET_LABEL[activeBracket]}
          </div>

          <div className="relative" style={{ zIndex: 1 }}>
            <RoundLabels rounds={visibleRoundsSummary} maxRound={maxRound} />
            <Bracket
              torneo={torneoActiveBracket}
              accent={BRACKET_ACCENT[activeBracket]}
              focused={autoFocus}
              onFocus={setFocused}
              viewMode={viewMode}
              liveRound={liveRound}
            />
          </div>
        </div>
      )}

      {currentEvent?.tipo === "PARTITA_INIZIATA" &&
      currentEvent.isFinal &&
      currentEvent.bracket ? (
        <FinalPresentation
          team1={currentEvent.team1}
          team2={currentEvent.team2}
          bracket={currentEvent.bracket}
          onClose={dismissCurrentEvent}
        />
      ) : currentEvent?.tipo === "PARTITA_FINITA" &&
        currentEvent.isFinal &&
        currentEvent.bracket &&
        currentEvent.winner ? (
        <FinalVictory
          team1={currentEvent.team1}
          team2={currentEvent.team2}
          winner={currentEvent.winner}
          punteggio={currentEvent.punteggio}
          bracket={currentEvent.bracket}
          onClose={dismissCurrentEvent}
        />
      ) : (
        <LiveMatchOverlay event={currentEvent} onClose={dismissCurrentEvent} />
      )}

      <SponsorShowcaseOverlay
        sponsors={showcaseSponsors}
        onClose={dismissShowcase}
      />

      {animationTorneo && (
        <GironiAnimation
          torneo={animationTorneo}
          accent={accent}
          onClose={() => setAnimationTorneo(null)}
        />
      )}

      {finaliAnimationTorneo && (
        <FinaliAnimation
          torneo={finaliAnimationTorneo}
          onClose={() => setFinaliAnimationTorneo(null)}
        />
      )}

      <AnimatePresence>
        {parzialeNotice && (
          <motion.button
            type="button"
            key={parzialeNotice.matchId + (parzialeNotice.punteggio ?? "")}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.22, 0.9, 0.34, 1] }}
            onClick={() => setParzialeNotice(null)}
            className="fixed bottom-6 right-6 z-40 w-[440px] max-w-[calc(100vw-3rem)] text-left rounded-md border border-paper/15 bg-court-deep/95 backdrop-blur shadow-2xl p-5 cursor-pointer hover:border-paper/30 transition-colors"
            aria-label="Chiudi notifica parziale"
          >
            <div className="flex items-center justify-between gap-2 mb-3 text-eyebrow text-yellow">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span
                    className="absolute inline-flex h-full w-full rounded-full opacity-60"
                    style={{
                      background: "var(--color-yellow)",
                      animation: "cc-live-pulse 1.4s ease-in-out infinite",
                    }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-2 w-2"
                    style={{ background: "var(--color-yellow)" }}
                  />
                </span>
                Parziale aggiornato
              </div>
              {parzialeNotice.punteggio && (
                <div
                  className="text-stat tabular-nums"
                  style={{
                    color: "var(--color-yellow)",
                    fontSize: 22,
                    lineHeight: 1,
                  }}
                >
                  {parzialeNotice.punteggio}
                </div>
              )}
            </div>
            <div className="space-y-2">
              {([parzialeNotice.team1, parzialeNotice.team2] as const).map(
                (team, idx) => (
                  <div key={team.id} className="flex items-center gap-3">
                    <div className="flex -space-x-2 shrink-0">
                      {[team.player1, team.player2].map((p) =>
                        p.fotoUrl ? (
                          <Image
                            key={p.id}
                            src={p.fotoUrl}
                            alt=""
                            width={36}
                            height={36}
                            className="h-9 w-9 rounded-full object-cover bg-paper/10 ring-2 ring-court-deep"
                          />
                        ) : (
                          <span
                            key={p.id}
                            className="h-9 w-9 rounded-full bg-paper/10 ring-2 ring-court-deep flex items-center justify-center text-[10px] font-mono text-paper/80"
                          >
                            {p.nome[0]}
                            {p.cognome[0]}
                          </span>
                        )
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-paper text-sm font-semibold truncate">
                        {team.player1.cognome} / {team.player2.cognome}
                      </div>
                    </div>
                    {idx === 0 && (
                      <span className="text-eyebrow text-paper/35 shrink-0">
                        vs
                      </span>
                    )}
                  </div>
                )
              )}
            </div>
          </motion.button>
        )}
      </AnimatePresence>
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
  available,
  accent,
}: {
  active: "GIRONI_1" | "GIRONI_2" | "FINALI";
  onChange: (p: "GIRONI_1" | "GIRONI_2" | "FINALI") => void;
  available: { fase1: boolean; fase2: boolean; finali: boolean };
  accent: string;
}) {
  const phases: { value: "GIRONI_1" | "GIRONI_2" | "FINALI"; label: string; enabled: boolean }[] = [
    { value: "GIRONI_1", label: "Gironi 1", enabled: available.fase1 },
    { value: "GIRONI_2", label: "Gironi 2", enabled: available.fase2 },
    { value: "FINALI", label: "Finali", enabled: available.finali },
  ];
  return (
    <div className="flex items-center gap-2">
      {phases.map((p) => (
        <button
          key={p.value}
          type="button"
          disabled={!p.enabled}
          onClick={() => onChange(p.value)}
          className="cc-mono uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            fontSize: 11,
            padding: "6px 16px",
            background: active === p.value ? accent : "oklch(0.24 0.05 255)",
            color: active === p.value ? "var(--color-night-deep)" : "var(--color-paper)",
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
