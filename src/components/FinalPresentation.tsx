"use client";

import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import type {
  BracketTipo,
  PlayerWithMatches,
  TeamWithPlayers,
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

type Phase =
  | "intro"
  | "team1"
  | "team2"
  | "explosion"
  | "faceoff"
  | "done";

const TIMING = {
  INTRO_MS: 2200,
  PLAYERS_IN_MS: 1400,
  NAME_HOLD_MS: 2200,
  EXPLOSION_MS: 2400,
  FACEOFF_MS: 6500,
  FADE_MS: 600,
  SKIP_FADE_MS: 350,
};

const TEAM_REVEAL_MS = TIMING.PLAYERS_IN_MS + TIMING.NAME_HOLD_MS;

interface Props {
  team1: TeamWithPlayers;
  team2: TeamWithPlayers;
  bracket: BracketTipo;
  onClose: () => void;
}

export function FinalPresentation({ team1, team2, bracket, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [slowFade, setSlowFade] = useState(false);
  const accent = BRACKET_ACCENT[bracket];

  const skip = useCallback(() => {
    setSlowFade(false);
    setPhase("done");
  }, []);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(
      setTimeout(() => setPhase("team1"), TIMING.INTRO_MS)
    );
    timers.push(
      setTimeout(() => setPhase("team2"), TIMING.INTRO_MS + TEAM_REVEAL_MS)
    );
    timers.push(
      setTimeout(
        () => setPhase("explosion"),
        TIMING.INTRO_MS + 2 * TEAM_REVEAL_MS
      )
    );
    timers.push(
      setTimeout(
        () => setPhase("faceoff"),
        TIMING.INTRO_MS + 2 * TEAM_REVEAL_MS + TIMING.EXPLOSION_MS
      )
    );
    timers.push(
      setTimeout(() => {
        setSlowFade(true);
        setPhase("done");
      }, TIMING.INTRO_MS + 2 * TEAM_REVEAL_MS + TIMING.EXPLOSION_MS + TIMING.FACEOFF_MS)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (phase !== "done") return;
    const dur = slowFade ? TIMING.FADE_MS : TIMING.SKIP_FADE_MS;
    const t = setTimeout(onClose, dur);
    return () => clearTimeout(t);
  }, [phase, slowFade, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [skip]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: phase === "done" ? 0 : 1 }}
      transition={{
        duration:
          phase === "done"
            ? (slowFade ? TIMING.FADE_MS : TIMING.SKIP_FADE_MS) / 1000
            : 0.4,
        ease: "easeOut",
      }}
      className="fixed inset-0 z-[110] overflow-hidden cursor-pointer"
      onClick={skip}
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, oklch(0.22 0.04 255) 0%, oklch(0.08 0.02 255) 75%)",
      }}
    >
      <div className="cc-stripes absolute inset-0 pointer-events-none opacity-25" />

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.15, duration: 0.6, ease: [0.85, 0, 0.15, 1] }}
        className="absolute top-0 left-0 right-0 h-[3px] origin-left"
        style={{ background: accent }}
      />
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.25, duration: 0.6, ease: [0.85, 0, 0.15, 1] }}
        className="absolute bottom-0 left-0 right-0 h-[3px] origin-right"
        style={{ background: accent }}
      />

      <div className="relative z-10 h-full w-full">
        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <IntroPhase key="intro" bracket={bracket} accent={accent} />
          )}
          {phase === "team1" && (
            <TeamRevealPhase
              key="t1"
              team={team1}
              accent={accent}
              side="A"
            />
          )}
          {phase === "team2" && (
            <TeamRevealPhase
              key="t2"
              team={team2}
              accent={accent}
              side="B"
            />
          )}
          {phase === "explosion" && (
            <ExplosionPhase key="boom" accent={accent} />
          )}
          {phase === "faceoff" && (
            <FaceoffPhase
              key="faceoff"
              team1={team1}
              team2={team2}
              bracket={bracket}
              accent={accent}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function IntroPhase({
  bracket,
  accent,
}: {
  bracket: BracketTipo;
  accent: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05, transition: { duration: 0.45 } }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 flex flex-col items-center justify-center"
    >
      <motion.div
        initial={{ y: 30, opacity: 0, letterSpacing: "0.5em" }}
        animate={{ y: 0, opacity: 1, letterSpacing: "0.4em" }}
        transition={{ delay: 0.1, duration: 0.7, ease: [0.22, 0.9, 0.34, 1] }}
        className="cc-mono uppercase mb-3 md:mb-5"
        style={{
          color: accent,
          fontSize: "clamp(14px, 1.4vw, 22px)",
        }}
      >
        ◆ Finale ◆
      </motion.div>
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{
          delay: 0.25,
          type: "spring",
          stiffness: 80,
          damping: 14,
        }}
        className="cc-display"
        style={{
          color: accent,
          fontSize: "clamp(80px, 16vw, 280px)",
          lineHeight: 0.85,
          letterSpacing: "-0.01em",
          textShadow: `0 0 80px ${accent}`,
        }}
      >
        {BRACKET_LABEL[bracket]}
      </motion.div>
    </motion.div>
  );
}

function TeamRevealPhase({
  team,
  accent,
  side,
}: {
  team: TeamWithPlayers;
  accent: string;
  side: "A" | "B";
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 flex flex-col items-center justify-center px-6"
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="cc-mono uppercase mb-6 md:mb-10"
        style={{
          color: accent,
          fontSize: "clamp(12px, 1.2vw, 18px)",
          letterSpacing: "0.5em",
        }}
      >
        Team {side}
      </motion.div>

      <div
        className="relative flex items-center justify-center mb-8 md:mb-12"
        style={{ gap: "calc(clamp(120px, 16vw, 240px) * -0.12)" }}
      >
        <PlayerEntry
          player={team.player1}
          fromSide="left"
          accent={accent}
          delay={0.15}
        />
        <PlayerEntry
          player={team.player2}
          fromSide="right"
          accent={accent}
          delay={0.45}
        />
      </div>

      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.85 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{
          delay: TIMING.PLAYERS_IN_MS / 1000 + 0.15,
          type: "spring",
          stiffness: 110,
          damping: 14,
        }}
        className="text-center"
      >
        <div
          className="cc-display text-paper"
          style={{
            fontSize: "clamp(40px, 6vw, 110px)",
            lineHeight: 0.9,
            letterSpacing: "-0.005em",
          }}
        >
          {team.player1.cognome}
        </div>
        <div
          className="cc-display"
          style={{
            color: accent,
            fontSize: "clamp(28px, 4.4vw, 80px)",
            lineHeight: 1,
            letterSpacing: "0.01em",
          }}
        >
          / {team.player2.cognome}
        </div>
      </motion.div>
    </motion.div>
  );
}

function PlayerEntry({
  player,
  fromSide,
  accent,
  delay,
}: {
  player: PlayerWithMatches;
  fromSide: "left" | "right";
  accent: string;
  delay: number;
}) {
  const offX = fromSide === "left" ? "-110vw" : "110vw";
  const rot = fromSide === "left" ? -10 : 10;
  return (
    <motion.div
      initial={{ x: offX, opacity: 0, rotate: rot, scale: 0.9 }}
      animate={{ x: 0, opacity: 1, rotate: 0, scale: 1 }}
      transition={{
        delay,
        duration: TIMING.PLAYERS_IN_MS / 1000,
        ease: [0.22, 0.9, 0.34, 1],
      }}
      className="rounded-full overflow-hidden bg-paper/10 relative"
      style={{
        width: "clamp(120px, 16vw, 240px)",
        height: "clamp(120px, 16vw, 240px)",
        boxShadow: `0 0 0 5px ${accent}, 0 0 60px -8px ${accent}`,
      }}
    >
      {player.fotoUrl ? (
        <Image
          src={player.fotoUrl}
          alt={`${player.nome} ${player.cognome}`}
          fill
          sizes="(max-width: 768px) 160px, 320px"
          className="object-cover"
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center cc-display text-paper/85 text-[26vw] sm:text-[14vw] md:text-[7rem] leading-none">
          {player.nome[0]}
          {player.cognome[0]}
        </div>
      )}
    </motion.div>
  );
}

function ExplosionPhase({ accent }: { accent: string }) {
  const dur = TIMING.EXPLOSION_MS / 1000;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
      className="absolute inset-0 flex items-center justify-center"
    >
      {/* white flash */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.4, 0] }}
        transition={{
          duration: dur,
          ease: [0.85, 0, 0.15, 1],
          times: [0, 0.08, 0.35, 1],
        }}
        className="absolute inset-0"
        style={{ background: "var(--color-paper)" }}
      />

      {/* core blast */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.6, 8], opacity: [0, 1, 0] }}
        transition={{
          duration: dur,
          ease: [0.16, 1, 0.3, 1],
          times: [0, 0.25, 1],
        }}
        className="absolute rounded-full"
        style={{
          width: "40vmin",
          height: "40vmin",
          background: `radial-gradient(circle, ${accent} 0%, transparent 70%)`,
          filter: "blur(14px)",
        }}
      />

      {/* shockwave rings */}
      {[0, 0.25, 0.5].map((delay, idx) => (
        <motion.div
          key={`ring-${idx}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 5], opacity: [0, 0.9, 0] }}
          transition={{
            delay: delay * dur,
            duration: dur * 0.7,
            ease: [0.22, 0.9, 0.34, 1],
            times: [0, 0.15, 1],
          }}
          className="absolute rounded-full"
          style={{
            width: "22vmin",
            height: "22vmin",
            border: `4px solid ${accent}`,
            boxShadow: `0 0 30px ${accent}`,
          }}
        />
      ))}

      {/* particles */}
      {[...Array(28)].map((_, i) => {
        const angle = (i / 28) * Math.PI * 2;
        const dist = 70 + (i % 4) * 18;
        const size = 10 + (i % 3) * 6;
        return (
          <motion.span
            key={i}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
            animate={{
              x: `${Math.cos(angle) * dist}vmin`,
              y: `${Math.sin(angle) * dist}vmin`,
              opacity: 0,
              scale: 0,
            }}
            transition={{
              duration: dur,
              ease: [0.22, 0.9, 0.34, 1],
            }}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              background: accent,
              boxShadow: `0 0 24px ${accent}`,
            }}
          />
        );
      })}

      {/* lingering embers */}
      {[...Array(16)].map((_, i) => {
        const angle = ((i + 0.5) / 16) * Math.PI * 2;
        const dist = 35 + (i % 3) * 10;
        return (
          <motion.span
            key={`ember-${i}`}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
            animate={{
              x: [`0vmin`, `${Math.cos(angle) * dist}vmin`],
              y: [`0vmin`, `${Math.sin(angle) * dist}vmin`],
              opacity: [0, 1, 0],
              scale: [0, 1, 0.4],
            }}
            transition={{
              delay: dur * 0.35,
              duration: dur * 0.65,
              ease: "easeOut",
              times: [0, 0.4, 1],
            }}
            className="absolute rounded-full"
            style={{
              width: 6,
              height: 6,
              background: "var(--color-paper)",
              boxShadow: `0 0 18px ${accent}`,
            }}
          />
        );
      })}
    </motion.div>
  );
}

function FaceoffPhase({
  team1,
  team2,
  bracket,
  accent,
}: {
  team1: TeamWithPlayers;
  team2: TeamWithPlayers;
  bracket: BracketTipo;
  accent: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 flex flex-col px-6 md:px-12 py-8 md:py-12"
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-center mb-4 md:mb-6"
      >
        <div
          className="cc-mono uppercase"
          style={{
            color: accent,
            fontSize: "clamp(11px, 1vw, 16px)",
            letterSpacing: "0.5em",
          }}
        >
          ◆ Finale {BRACKET_LABEL[bracket]} ◆
        </div>
      </motion.div>

      <div className="flex-1 grid grid-cols-[1fr_auto_1fr] gap-4 md:gap-10 items-center min-h-0">
        <FaceoffTeam
          team={team1}
          accent={accent}
          fromSide="left"
          delay={0.3}
        />

        <motion.div
          initial={{ scale: 0.4, opacity: 0, rotate: -90 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{
            delay: 0.55,
            type: "spring",
            stiffness: 100,
            damping: 12,
          }}
          className="cc-display"
          style={{
            color: accent,
            fontSize: "clamp(70px, 12vw, 200px)",
            lineHeight: 1,
            textShadow: `0 0 60px ${accent}`,
          }}
        >
          ×
        </motion.div>

        <FaceoffTeam
          team={team2}
          accent={accent}
          fromSide="right"
          delay={0.3}
        />
      </div>

      <FinalTitleDrop accent={accent} />
    </motion.div>
  );
}

function FinalTitleDrop({ accent }: { accent: string }) {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
      style={{
        bottom: "clamp(8vh, 12vh, 16vh)",
        fontSize: "clamp(60px, 11vw, 200px)",
      }}
    >
      <div className="relative flex items-baseline gap-[0.18em]">
        <ImpactFlash delay={1.4 + 0.55} accent={accent} side="left" />
        <ImpactFlash delay={2.2 + 0.55} accent={accent} side="right" />
        <DropWord
          word="THE"
          delay={1.4}
          color="var(--color-paper)"
          accent={accent}
        />
        <DropWord
          word="FINAL"
          delay={2.2}
          color={accent}
          accent={accent}
        />
      </div>
    </div>
  );
}

function ImpactFlash({
  delay,
  accent,
  side,
}: {
  delay: number;
  accent: string;
  side: "left" | "right";
}) {
  return (
    <motion.span
      aria-hidden
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: [0, 1, 0], scaleX: [0, 1.4, 0] }}
      transition={{
        delay,
        duration: 0.9,
        ease: "easeOut",
        times: [0, 0.2, 1],
      }}
      className="absolute pointer-events-none"
      style={{
        left: side === "left" ? "0%" : "55%",
        right: side === "right" ? "0%" : "auto",
        bottom: "-0.15em",
        height: "0.18em",
        width: "45%",
        background: `linear-gradient(${
          side === "left" ? "to right" : "to left"
        }, transparent 0%, ${accent} 50%, transparent 100%)`,
        filter: "blur(8px)",
        transformOrigin: side === "left" ? "left" : "right",
      }}
    />
  );
}

function DropWord({
  word,
  delay,
  color,
  accent,
}: {
  word: string;
  delay: number;
  color: string;
  accent: string;
}) {
  return (
    <motion.span
      initial={{ y: "-110vh", opacity: 0, scaleY: 1.4, rotate: -2 }}
      animate={{
        y: ["-110vh", "0vh", "0vh", "-2vh", "0vh"],
        opacity: [0, 1, 1, 1, 1],
        scaleY: [1.4, 0.7, 1.05, 0.95, 1],
        scaleX: [0.85, 1.25, 0.95, 1.02, 1],
        rotate: [-2, 0, 0, 0, 0],
      }}
      transition={{
        delay,
        duration: 1.2,
        times: [0, 0.55, 0.7, 0.85, 1],
        ease: [0.6, 0, 0.4, 1],
      }}
      className="cc-display inline-block origin-bottom"
      style={{
        color,
        lineHeight: 0.9,
        letterSpacing: "0.01em",
        textShadow: `0 0 60px ${accent}`,
      }}
    >
      {word}
    </motion.span>
  );
}

function FaceoffTeam({
  team,
  accent,
  fromSide,
  delay,
}: {
  team: TeamWithPlayers;
  accent: string;
  fromSide: "left" | "right";
  delay: number;
}) {
  const off = fromSide === "left" ? "-60vw" : "60vw";
  return (
    <motion.div
      initial={{ x: off, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{
        delay,
        duration: 0.7,
        ease: [0.22, 0.9, 0.34, 1],
      }}
      className={`flex flex-col items-${
        fromSide === "left" ? "start" : "end"
      } gap-4 md:gap-5 min-w-0`}
    >
      <div
        className="flex"
        style={{ gap: "calc(clamp(140px, 18vw, 320px) * -0.14)" }}
      >
        {[team.player1, team.player2].map((p) => (
          <div
            key={p.id}
            className="rounded-full overflow-hidden bg-paper/10 relative"
            style={{
              width: "clamp(140px, 18vw, 320px)",
              height: "clamp(140px, 18vw, 320px)",
              boxShadow: `0 0 0 5px ${accent}, 0 0 60px -8px ${accent}`,
            }}
          >
            {p.fotoUrl ? (
              <Image
                src={p.fotoUrl}
                alt={`${p.nome} ${p.cognome}`}
                fill
                sizes="(max-width: 768px) 200px, 360px"
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center cc-display text-paper/85 text-5xl md:text-7xl">
                {p.nome[0]}
                {p.cognome[0]}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className={fromSide === "left" ? "text-left" : "text-right"}>
        <div
          className="cc-display text-paper"
          style={{
            fontSize: "clamp(40px, 6vw, 110px)",
            lineHeight: 0.9,
          }}
        >
          {team.player1.cognome}
        </div>
        <div
          className="cc-display"
          style={{
            color: accent,
            fontSize: "clamp(28px, 4.4vw, 78px)",
            lineHeight: 1,
          }}
        >
          / {team.player2.cognome}
        </div>
      </div>
    </motion.div>
  );
}
