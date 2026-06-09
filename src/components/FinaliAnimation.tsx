"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import type {
  BracketTipo,
  TeamWithPlayers,
  TournamentWithMatches,
} from "@/types";

const BRACKET_ACCENT: Record<BracketTipo, string> = {
  GOLD: "var(--color-yellow)",
  SILVER: "oklch(0.85 0.02 255)",
  BRONZE: "oklch(0.65 0.08 30)",
};

const BRACKET_LABEL: Record<BracketTipo, string> = {
  GOLD: "Gold",
  SILVER: "Silver",
  BRONZE: "Bronze",
};

const BRACKETS: BracketTipo[] = ["GOLD", "SILVER", "BRONZE"];

const SPIN_MS = 5000;
const PAIR_HOLD_MS = 8000;
const TRANSITION_MS = 600;
const FADE_OUT_MS = 600;
const SKIP_FADE_MS = 250;

type CategoryData = {
  bracket: BracketTipo;
  teams: TeamWithPlayers[];
};

interface Props {
  torneo: TournamentWithMatches;
  onClose: () => void;
}

function extractCategories(torneo: TournamentWithMatches): CategoryData[] {
  const out: CategoryData[] = [];
  for (const bracket of BRACKETS) {
    const semis = torneo.matches
      .filter(
        (m) =>
          m.bracketTipo === bracket &&
          m.groupId === null &&
          m.round === 2
      )
      .sort((a, b) => a.posizione - b.posizione);
    if (semis.length < 2) continue;
    const teams: TeamWithPlayers[] = [];
    for (const semi of semis) {
      if (semi.team1) teams.push(semi.team1);
      if (semi.team2) teams.push(semi.team2);
    }
    if (teams.length === 4) out.push({ bracket, teams });
  }
  return out;
}

export function FinaliAnimation({ torneo, onClose }: Props) {
  const categories = useMemo(() => extractCategories(torneo), [torneo]);
  const [categoryIdx, setCategoryIdx] = useState(0);
  const [stageByIdx, setStageByIdx] = useState<Record<number, "spin" | "paired">>({
    0: "spin",
  });
  const stage = stageByIdx[categoryIdx] ?? "spin";
  const [closing, setClosing] = useState(false);

  const skip = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, SKIP_FADE_MS);
  }, [onClose]);

  useEffect(() => {
    if (closing) return;
    if (categories.length === 0) {
      const t = setTimeout(onClose, 0);
      return () => clearTimeout(t);
    }
  }, [categories.length, onClose, closing]);

  useEffect(() => {
    if (closing) return;
    if (categories.length === 0) return;
    const t1 = setTimeout(
      () => setStageByIdx((m) => ({ ...m, [categoryIdx]: "paired" })),
      SPIN_MS
    );
    const t2 = setTimeout(() => {
      if (categoryIdx + 1 < categories.length) {
        setStageByIdx((m) => ({ ...m, [categoryIdx + 1]: "spin" }));
        setCategoryIdx((i) => i + 1);
      } else {
        setClosing(true);
        setTimeout(onClose, FADE_OUT_MS);
      }
    }, SPIN_MS + PAIR_HOLD_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [categoryIdx, categories.length, onClose, closing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [skip]);

  if (categories.length === 0) return null;

  const current = categories[categoryIdx];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: closing ? 0 : 1 }}
      transition={{
        duration: closing ? FADE_OUT_MS / 1000 : 0.35,
        ease: "easeOut",
      }}
      className="fixed inset-0 z-[100] bg-court-deep overflow-hidden"
    >
      <div className="cc-stripes absolute inset-0 pointer-events-none opacity-30" />

      <button
        type="button"
        onClick={skip}
        aria-label="Chiudi animazione"
        className="absolute inset-0 z-40 cursor-pointer bg-transparent"
      />

      <div className="relative z-10 h-full w-full pointer-events-none flex flex-col">
        <CategoryHeader bracket={current.bracket} />
        <AnimatePresence mode="wait">
          <motion.div
            key={`${current.bracket}-${stage}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: TRANSITION_MS / 1000 }}
            className="flex-1 min-h-0 relative"
          >
            {stage === "spin" ? (
              <SpinStage teams={current.teams} bracket={current.bracket} />
            ) : (
              <PairedStage teams={current.teams} bracket={current.bracket} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function CategoryHeader({ bracket }: { bracket: BracketTipo }) {
  const accent = BRACKET_ACCENT[bracket];
  return (
    <div className="relative z-10 px-6 pt-8 pb-4 text-center">
      <div
        className="cc-mono uppercase tracking-[0.5em]"
        style={{ fontSize: 13, color: accent }}
      >
        — Sorteggio Semifinali
      </div>
      <div
        className="cc-display leading-[0.9] mt-2"
        style={{
          fontSize: "clamp(2.8rem, 7vw, 6rem)",
          color: "var(--color-paper)",
        }}
      >
        Categoria{" "}
        <span style={{ color: accent }}>{BRACKET_LABEL[bracket]}</span>
      </div>
    </div>
  );
}

function SpinStage({
  teams,
  bracket,
}: {
  teams: TeamWithPlayers[];
  bracket: BracketTipo;
}) {
  const accent = BRACKET_ACCENT[bracket];
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <motion.div
        className="relative"
        style={{
          width: "min(92vmin, 980px)",
          height: "min(92vmin, 980px)",
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: SPIN_MS / 1000,
          ease: "linear",
          repeat: Infinity,
        }}
      >
        {teams.map((team, i) => {
          const angle = (i / teams.length) * 2 * Math.PI - Math.PI / 2;
          const radius = 38;
          const x = 50 + radius * Math.cos(angle);
          const y = 50 + radius * Math.sin(angle);
          return (
            <div
              key={team.id}
              className="absolute"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: "min(56vmin, 680px)",
                translate: "-50% -50%",
              }}
            >
              <motion.div
                animate={{ rotate: -360 }}
                transition={{
                  duration: SPIN_MS / 1000,
                  ease: "linear",
                  repeat: Infinity,
                }}
              >
                <TeamCard team={team} accent={accent} variant="spin" />
              </motion.div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

function PairedStage({
  teams,
  bracket,
}: {
  teams: TeamWithPlayers[];
  bracket: BracketTipo;
}) {
  const accent = BRACKET_ACCENT[bracket];
  const pairs: [TeamWithPlayers, TeamWithPlayers][] = [
    [teams[0], teams[1]],
    [teams[2], teams[3]],
  ];
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-8 md:gap-16 px-8">
      {pairs.map((pair, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 30, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.7,
            delay: idx * 0.25,
            ease: [0.22, 0.9, 0.34, 1],
          }}
          className="flex-1 max-w-[760px] flex flex-col items-center gap-6"
        >
          <div
            className="cc-mono uppercase tracking-[0.4em]"
            style={{ fontSize: 16, color: accent }}
          >
            Semifinale {idx + 1}
          </div>
          <div className="w-full flex flex-col items-stretch gap-5">
            <TeamCard team={pair[0]} accent={accent} variant="paired" />
            <div
              className="cc-display text-center leading-none"
              style={{
                fontSize: "clamp(2rem, 4vw, 3.5rem)",
                color: accent,
              }}
            >
              vs
            </div>
            <TeamCard team={pair[1]} accent={accent} variant="paired" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function TeamCard({
  team,
  accent,
  variant = "paired",
}: {
  team: TeamWithPlayers;
  accent: string;
  variant?: "spin" | "paired";
}) {
  const isSpin = variant === "spin";
  const avatarSize = isSpin ? 80 : 112;
  const nameSize = isSpin ? "clamp(1.5rem, 2.4vw, 2.2rem)" : "clamp(2.2rem, 3.4vw, 3.4rem)";
  const subSize = isSpin ? "clamp(0.8rem, 1vw, 1rem)" : "clamp(1rem, 1.4vw, 1.25rem)";
  return (
    <div
      className="rounded-md flex items-center gap-4 p-4 md:p-5"
      style={{
        background: `linear-gradient(135deg, color-mix(in oklch, ${accent} 22%, var(--color-night-deep)) 0%, var(--color-night-deep) 100%)`,
        border: `1px solid ${accent}`,
        boxShadow: `0 0 28px -8px ${accent}`,
      }}
    >
      <div className="flex -space-x-3 shrink-0">
        {[team.player1, team.player2].map((p) =>
          p.fotoUrl ? (
            <Image
              key={p.id}
              src={p.fotoUrl}
              alt=""
              width={avatarSize * 2}
              height={avatarSize * 2}
              className="rounded-full object-cover bg-paper/10"
              style={{
                width: avatarSize,
                height: avatarSize,
                boxShadow: `0 0 0 3px ${accent}`,
              }}
            />
          ) : (
            <span
              key={p.id}
              className="rounded-full bg-paper/10 flex items-center justify-center cc-mono text-paper"
              style={{
                width: avatarSize,
                height: avatarSize,
                fontSize: avatarSize * 0.3,
                boxShadow: `0 0 0 3px ${accent}`,
              }}
            >
              {p.nome[0]}
              {p.cognome[0]}
            </span>
          )
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="cc-display text-paper leading-[0.95] break-words"
          style={{ fontSize: nameSize }}
        >
          {team.player1.cognome} / {team.player2.cognome}
        </div>
        <div
          className="text-paper/70 truncate cc-mono mt-1 uppercase tracking-wider"
          style={{ fontSize: subSize }}
        >
          {team.player1.nome} &middot; {team.player2.nome}
        </div>
      </div>
    </div>
  );
}
