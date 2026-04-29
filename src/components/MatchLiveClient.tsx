"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useSSE } from "@/hooks/useSSE";
import type {
  MatchWithTeams,
  LiveEvent,
  Genere,
  PlayerWithMatches,
  TeamWithPlayers,
  StatoPartita,
  BracketTipo,
} from "@/types";

interface Props {
  matchIniziale: MatchWithTeams;
  genere: Genere;
  torneoNome: string;
}

type Side = "team1" | "team2";
type Mode = "games" | "tb";

interface Score {
  s1: number;
  s2: number;
  tb1: number | null;
  tb2: number | null;
}

interface AnimState {
  side: Side;
  mode: Mode;
}

const HIGHLIGHT_DURATION_MS = 2200;
const FLIP_DELAY_MS = 450;

const BRACKET_ACCENT: Record<BracketTipo, string> = {
  GOLD: "var(--color-yellow)",
  SILVER: "oklch(0.85 0.02 255)",
  BRONZE: "oklch(0.65 0.08 30)",
};

const BRACKET_LABEL: Record<BracketTipo, string> = {
  GOLD: "GOLD",
  SILVER: "SILVER",
  BRONZE: "BRONZE",
};

const GIRONE_ACCENT = "oklch(0.7 0.14 195)";

function parseScore(p: string | null | undefined): Score {
  if (!p) return { s1: 0, s2: 0, tb1: null, tb2: null };
  const m = p.match(/(\d+)\s*-\s*(\d+)(?:\s*\((\d+)\s*-\s*(\d+)\))?/);
  if (!m) return { s1: 0, s2: 0, tb1: null, tb2: null };
  return {
    s1: parseInt(m[1], 10),
    s2: parseInt(m[2], 10),
    tb1: m[3] ? parseInt(m[3], 10) : null,
    tb2: m[4] ? parseInt(m[4], 10) : null,
  };
}

function fromMatch(m: MatchWithTeams): Score {
  return {
    s1: m.set1Team1 ?? 0,
    s2: m.set1Team2 ?? 0,
    tb1: m.tieBreakTeam1,
    tb2: m.tieBreakTeam2,
  };
}

function detectChange(prev: Score, next: Score): AnimState | null {
  if (next.s1 > prev.s1) return { side: "team1", mode: "games" };
  if (next.s2 > prev.s2) return { side: "team2", mode: "games" };
  if (next.tb1 !== null && (prev.tb1 ?? 0) < next.tb1)
    return { side: "team1", mode: "tb" };
  if (next.tb2 !== null && (prev.tb2 ?? 0) < next.tb2)
    return { side: "team2", mode: "tb" };
  return null;
}

export function MatchLiveClient({
  matchIniziale,
  genere,
  torneoNome,
}: Props) {
  const [match, setMatch] = useState<MatchWithTeams>(matchIniziale);
  const [score, setScore] = useState<Score>(fromMatch(matchIniziale));
  const [anim, setAnim] = useState<AnimState | null>(null);
  const flipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEvent = useCallback(
    (event: LiveEvent) => {
      if (event.tipo === "SPONSOR_SHOWCASE") return;
      if (event.matchId !== match.id) return;

      const next = parseScore(event.punteggio);

      if (event.tipo === "PARTITA_INIZIATA") {
        setMatch((m) => ({
          ...m,
          stato: "IN_CORSO",
          iniziataAt: m.iniziataAt ?? new Date().toISOString(),
          sponsor: event.sponsor ?? m.sponsor,
          field: event.field !== undefined ? event.field : m.field,
        }));
        return;
      }

      if (event.tipo === "PARTITA_FINITA") {
        if (flipTimer.current) clearTimeout(flipTimer.current);
        if (clearTimer.current) clearTimeout(clearTimer.current);
        setAnim(null);
        setScore(next);
        setMatch((m) => ({
          ...m,
          stato: "COMPLETATA",
          finitaAt: m.finitaAt ?? new Date().toISOString(),
          punteggio: event.punteggio ?? m.punteggio,
          set1Team1: next.s1,
          set1Team2: next.s2,
          tieBreakTeam1: next.tb1,
          tieBreakTeam2: next.tb2,
          winner: event.winner ?? m.winner,
          sponsor: event.sponsor ?? m.sponsor,
        }));
        return;
      }

      // PARTITA_PARZIALE
      setMatch((m) => ({
        ...m,
        punteggio: event.punteggio ?? m.punteggio,
        set1Team1: next.s1,
        set1Team2: next.s2,
        tieBreakTeam1: next.tb1,
        tieBreakTeam2: next.tb2,
        sponsor: event.sponsor ?? m.sponsor,
      }));

      const change = detectChange(score, next);
      if (!change) {
        setScore(next);
        return;
      }

      if (flipTimer.current) clearTimeout(flipTimer.current);
      if (clearTimer.current) clearTimeout(clearTimer.current);
      setAnim(change);
      flipTimer.current = setTimeout(() => setScore(next), FLIP_DELAY_MS);
      clearTimer.current = setTimeout(
        () => setAnim(null),
        HIGHLIGHT_DURATION_MS
      );
    },
    [match.id, score]
  );

  useEffect(
    () => () => {
      if (flipTimer.current) clearTimeout(flipTimer.current);
      if (clearTimer.current) clearTimeout(clearTimer.current);
    },
    []
  );

  useSSE(handleEvent);

  const winnerId = match.winner?.id ?? null;
  const showcaseSponsor = !!anim;
  const bracket = match.bracketTipo as BracketTipo | null;
  const isGirone = !bracket && match.groupId !== null;
  const accentColor = bracket
    ? BRACKET_ACCENT[bracket]
    : isGirone
    ? GIRONE_ACCENT
    : "var(--color-yellow)";

  return (
    <>
      {bracket && <BracketDecor bracket={bracket} />}
      {isGirone && <GironeDecor />}
    <div
      className="relative z-[1] flex flex-col min-h-screen w-full max-w-[1600px] mx-auto px-5 md:px-10 py-6 md:py-10 gap-6 md:gap-10"
      style={{
        borderTop: `3px solid ${accentColor}`,
      }}
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-eyebrow text-paper/60 flex items-center gap-3 flex-wrap min-w-0">
          <span className="truncate">
            {torneoNome} · {labelGenere(genere)}
          </span>
          {match.field && (
            <span
              className="inline-flex items-center gap-1.5 px-2 py-1 border border-paper/20"
              style={{
                letterSpacing: "0.28em",
                color: "var(--color-yellow)",
              }}
            >
              <span aria-hidden>◆</span>
              <span>Campo {match.field.nome}</span>
            </span>
          )}
        </div>
        <StatusPill stato={match.stato} />
      </div>

      <div className="flex-1 flex flex-col gap-4 md:gap-6 justify-center">
        <TeamRow
          team={match.team1}
          games={score.s1}
          tb={score.tb1}
          showTb={score.tb1 !== null || score.tb2 !== null}
          highlight={anim?.side === "team1"}
          highlightMode={anim?.side === "team1" ? anim.mode : null}
          dimmed={!!winnerId && winnerId !== match.team1?.id}
          isWinner={!!winnerId && winnerId === match.team1?.id}
          stato={match.stato}
        />
        <TeamRow
          team={match.team2}
          games={score.s2}
          tb={score.tb2}
          showTb={score.tb1 !== null || score.tb2 !== null}
          highlight={anim?.side === "team2"}
          highlightMode={anim?.side === "team2" ? anim.mode : null}
          dimmed={!!winnerId && winnerId !== match.team2?.id}
          isWinner={!!winnerId && winnerId === match.team2?.id}
          stato={match.stato}
        />
      </div>

      <div className="flex items-center justify-between text-eyebrow text-paper/40">
        <span>match #{match.id.slice(-6)}</span>
        {match.bracketTipo && <span>{match.bracketTipo}</span>}
        <span>
          R{match.round} · P{match.posizione}
        </span>
      </div>

      {match.sponsor && (
        <SponsorStrip sponsor={match.sponsor} showcase={showcaseSponsor} />
      )}
    </div>
    </>
  );
}

function BracketDecor({ bracket }: { bracket: BracketTipo }) {
  const color = BRACKET_ACCENT[bracket];
  const label = BRACKET_LABEL[bracket];
  return (
    <>
      {/* Vertical watermark — right edge */}
      <span
        aria-hidden
        className="cc-display fixed pointer-events-none select-none z-0"
        style={{
          right: "-3vw",
          top: "8vh",
          fontSize: "clamp(220px, 30vw, 540px)",
          color,
          opacity: 0.07,
          letterSpacing: "0.06em",
          lineHeight: 0.85,
          whiteSpace: "nowrap",
          transform: "rotate(-90deg)",
          transformOrigin: "right top",
        }}
      >
        {label}
      </span>

      {/* Right edge glow strip */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 bottom-0 right-0 z-0"
        style={{
          width: 6,
          background: color,
          boxShadow: `0 0 32px ${color}`,
          opacity: 0.85,
        }}
      />

      {/* Left edge glow strip */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 bottom-0 left-0 z-0"
        style={{
          width: 6,
          background: color,
          boxShadow: `0 0 32px ${color}`,
          opacity: 0.85,
        }}
      />

      {/* Corner chevron top-right */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 right-0 z-[2] flex items-center"
        style={{
          background: color,
          color: "var(--color-night-deep)",
          fontFamily: "var(--font-bebas), Impact, sans-serif",
          letterSpacing: "0.3em",
          fontSize: 16,
          padding: "8px 18px 6px 28px",
          clipPath: "polygon(14px 0, 100% 0, 100% 100%, 0 100%)",
        }}
      >
        ★ {label}
      </div>

      {/* Soft radial glow background */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 100% 0%, ${color}1f, transparent 60%), radial-gradient(ellipse 60% 50% at 0% 100%, ${color}14, transparent 60%)`,
        }}
      />
    </>
  );
}

function GironeDecor() {
  const color = GIRONE_ACCENT;
  return (
    <>
      {/* Subtle grid pattern */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `linear-gradient(${color}10 1px, transparent 1px), linear-gradient(90deg, ${color}10 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
          opacity: 0.6,
        }}
      />

      {/* Watermark */}
      <span
        aria-hidden
        className="cc-display fixed pointer-events-none select-none z-0"
        style={{
          right: "-2vw",
          top: "10vh",
          fontSize: "clamp(180px, 24vw, 420px)",
          color,
          opacity: 0.08,
          letterSpacing: "0.06em",
          lineHeight: 0.85,
          whiteSpace: "nowrap",
          transform: "rotate(-90deg)",
          transformOrigin: "right top",
        }}
      >
        GIRONI
      </span>

      {/* Corner chevron */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 right-0 z-[2] flex items-center"
        style={{
          background: color,
          color: "var(--color-night-deep)",
          fontFamily: "var(--font-bebas), Impact, sans-serif",
          letterSpacing: "0.3em",
          fontSize: 14,
          padding: "6px 14px 4px 22px",
          clipPath: "polygon(12px 0, 100% 0, 100% 100%, 0 100%)",
        }}
      >
        ◇ GIRONE
      </div>

      {/* Edge strip left */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 bottom-0 left-0 z-0"
        style={{
          width: 4,
          background: color,
          boxShadow: `0 0 24px ${color}`,
          opacity: 0.6,
        }}
      />
    </>
  );
}

function labelGenere(g: Genere): string {
  if (g === "MASCHILE") return "Maschile";
  if (g === "FEMMINILE") return "Femminile";
  return "Misto";
}

function StatusPill({ stato }: { stato: StatoPartita }) {
  const map: Record<StatoPartita, { label: string; color: string; live: boolean }> = {
    ATTESA: { label: "in attesa", color: "oklch(0.7 0.02 255)", live: false },
    IN_CORSO: { label: "live", color: "var(--color-yellow)", live: true },
    COMPLETATA: { label: "concluso", color: "oklch(0.7 0.18 140)", live: false },
  };
  const cfg = map[stato];
  return (
    <div className="flex items-center gap-2">
      {cfg.live && (
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
      )}
      <span
        className="text-eyebrow"
        style={{ color: cfg.color, letterSpacing: "0.3em" }}
      >
        {cfg.label}
      </span>
    </div>
  );
}

function TeamRow({
  team,
  games,
  tb,
  showTb,
  highlight,
  highlightMode,
  dimmed,
  isWinner,
  stato,
}: {
  team: TeamWithPlayers | null;
  games: number;
  tb: number | null;
  showTb: boolean;
  highlight: boolean;
  highlightMode: Mode | null;
  dimmed: boolean;
  isWinner: boolean;
  stato: StatoPartita;
}) {
  if (!team) {
    return (
      <div
        className="grid items-center px-6 md:px-10 py-6 md:py-8"
        style={{
          background: "oklch(0.18 0.03 255)",
          border: "1px dashed oklch(0.32 0.05 255)",
        }}
      >
        <div className="cc-display text-paper/35" style={{ fontSize: 32 }}>
          — in attesa —
        </div>
      </div>
    );
  }

  return (
    <motion.div
      layout
      animate={{
        scale: highlight ? 1.02 : 1,
        boxShadow: highlight
          ? "0 0 0 2px var(--color-yellow), 0 0 80px rgba(236,210,74,0.45)"
          : "0 0 0 1px oklch(0.32 0.05 255)",
      }}
      transition={{ duration: 0.45, ease: [0.22, 0.9, 0.34, 1] }}
      className="relative grid items-center gap-4 md:gap-8 px-5 md:px-10 py-5 md:py-8"
      style={{
        gridTemplateColumns: "auto 1fr auto",
        background: highlight
          ? "linear-gradient(90deg, oklch(0.30 0.06 255) 0%, oklch(0.24 0.05 255) 100%)"
          : "oklch(0.20 0.04 255)",
        opacity: dimmed ? 0.55 : 1,
      }}
    >
      {isWinner && (
        <div
          className="absolute top-2 right-2 cc-mono"
          style={{
            background: "var(--color-yellow)",
            color: "var(--color-night-deep)",
            fontSize: 10,
            padding: "3px 8px",
            letterSpacing: "0.3em",
          }}
        >
          VINCITORE
        </div>
      )}

      <div className="flex -space-x-2 md:-space-x-3 shrink-0">
        <Avatar player={team.player1} />
        <Avatar player={team.player2} />
      </div>

      <div className="min-w-0">
        <div
          className="cc-display text-paper truncate"
          style={{
            fontSize: "clamp(28px, 5vw, 64px)",
            lineHeight: 0.95,
            letterSpacing: "0.005em",
          }}
        >
          {team.player1.cognome}
        </div>
        <div
          className="cc-display text-paper/65 truncate"
          style={{
            fontSize: "clamp(20px, 3.4vw, 44px)",
            lineHeight: 1.05,
          }}
        >
          / {team.player2.cognome}
        </div>
        {team.livello > 0 && (
          <div className="text-eyebrow text-paper/40 mt-1">
            seed #{team.livello}
          </div>
        )}
      </div>

      <div className="flex items-end gap-4 md:gap-6 shrink-0">
        <FlipNumber
          value={games}
          highlight={highlight && highlightMode === "games"}
          big
          stato={stato}
        />
        {showTb && (
          <FlipNumber
            value={tb ?? 0}
            highlight={highlight && highlightMode === "tb"}
            big={false}
            stato={stato}
            label="TB"
            muted={tb === null}
          />
        )}
      </div>
    </motion.div>
  );
}

function FlipNumber({
  value,
  highlight,
  big,
  stato,
  label,
  muted,
}: {
  value: number;
  highlight: boolean;
  big: boolean;
  stato: StatoPartita;
  label?: string;
  muted?: boolean;
}) {
  const fontSize = big
    ? "clamp(56px, 9vw, 144px)"
    : "clamp(28px, 4vw, 56px)";
  const baseColor =
    stato === "COMPLETATA" ? "var(--color-yellow)" : "var(--color-paper)";
  return (
    <div className="relative flex flex-col items-end leading-none">
      {label && (
        <div
          className="text-eyebrow text-paper/40 mb-1"
          style={{ fontSize: 10 }}
        >
          {label}
        </div>
      )}
      <div
        className="relative tabular-nums"
        style={{
          minWidth: big ? "1.1em" : "0.9em",
          height: fontSize,
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ y: 28, opacity: 0, scale: 0.85 }}
            animate={{
              y: 0,
              opacity: muted ? 0.35 : 1,
              scale: highlight ? 1.18 : 1,
            }}
            exit={{ y: -32, opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.55, ease: [0.22, 0.9, 0.34, 1] }}
            className="cc-display absolute right-0 top-0"
            style={{
              fontSize,
              lineHeight: 1,
              color: highlight ? "var(--color-yellow)" : baseColor,
              textShadow: highlight
                ? "0 0 36px rgba(236,210,74,0.65), 0 0 12px rgba(236,210,74,0.4)"
                : "none",
            }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Avatar({ player }: { player: PlayerWithMatches }) {
  const size = "clamp(56px, 7vw, 110px)";
  return player.fotoUrl ? (
    <div
      className="rounded-full overflow-hidden bg-paper/10 relative"
      style={{
        width: size,
        height: size,
        boxShadow: "0 0 0 2px oklch(0.32 0.05 255)",
      }}
    >
      <Image
        src={player.fotoUrl}
        alt={`${player.nome} ${player.cognome}`}
        fill
        sizes="(max-width: 768px) 60px, 110px"
        className="object-cover"
      />
    </div>
  ) : (
    <div
      className="rounded-full bg-paper/10 flex items-center justify-center"
      style={{
        width: size,
        height: size,
        boxShadow: "0 0 0 2px oklch(0.32 0.05 255)",
      }}
    >
      <span
        className="cc-display text-paper/70"
        style={{ fontSize: `calc(${size} * 0.36)` }}
      >
        {player.nome[0]}
        {player.cognome[0]}
      </span>
    </div>
  );
}

function SponsorStrip({
  sponsor,
  showcase,
}: {
  sponsor: { id: string; nome: string; logoUrl: string | null };
  showcase: boolean;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={showcase ? "showcase" : "idle"}
        initial={{ opacity: 0, y: 18, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.94 }}
        transition={{ duration: 0.45, ease: [0.22, 0.9, 0.34, 1] }}
        className={
          showcase
            ? "fixed left-1/2 -translate-x-1/2 bottom-8 md:bottom-14 z-30 flex items-center gap-3 md:gap-4 py-3 px-5 rounded-sm border border-paper/20 bg-night-deep/85 backdrop-blur-sm"
            : "fixed bottom-4 right-4 md:bottom-6 md:right-6 z-30 flex items-center gap-2 py-1.5 px-3 rounded-sm border border-paper/10 bg-night-deep/70 backdrop-blur-sm"
        }
        style={{
          boxShadow: showcase
            ? "0 0 0 1px var(--color-yellow), 0 0 60px rgba(236,210,74,0.25)"
            : "none",
          maxWidth: "min(560px, calc(100vw - 2rem))",
        }}
      >
        <span
          className="cc-mono uppercase text-paper/55 shrink-0"
          style={{
            fontSize: showcase ? 11 : 9,
            letterSpacing: "0.3em",
          }}
        >
          Partita offerta da
        </span>
        {sponsor.logoUrl && (
          <Image
            src={sponsor.logoUrl}
            alt={sponsor.nome}
            width={256}
            height={256}
            className="object-contain bg-paper/10 rounded-sm p-0.5 shrink-0"
            style={{
              height: showcase ? "clamp(36px, 4vw, 52px)" : 22,
              width: "auto",
            }}
          />
        )}
        <span
          className="cc-display text-paper truncate"
          style={{
            fontSize: showcase
              ? "clamp(18px, 2vw, 28px)"
              : "clamp(12px, 1.1vw, 16px)",
            lineHeight: 1,
            letterSpacing: "0.02em",
          }}
        >
          {sponsor.nome}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
