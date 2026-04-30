"use client";

import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion, type TargetAndTransition, type Easing } from "framer-motion";
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

type Phase = "showdown" | "charge" | "destroy" | "champion" | "done";

const TIMING = {
  SHOWDOWN_MS: 2600,
  CHARGE_MS: 1300,
  DESTROY_MS: 2000,
  CHAMPION_MS: 6500,
  FADE_MS: 600,
  SKIP_FADE_MS: 350,
};

interface Props {
  team1: TeamWithPlayers;
  team2: TeamWithPlayers;
  winner: TeamWithPlayers;
  punteggio?: string;
  bracket: BracketTipo;
  onClose: () => void;
}

export function FinalVictory({
  team1,
  team2,
  winner,
  punteggio,
  bracket,
  onClose,
}: Props) {
  const [phase, setPhase] = useState<Phase>("showdown");
  const [slowFade, setSlowFade] = useState(false);
  const accent = BRACKET_ACCENT[bracket];
  const isTeam1Winner = winner.id === team1.id;
  const winnerSide: "left" | "right" = isTeam1Winner ? "left" : "right";
  const loserSide: "left" | "right" = isTeam1Winner ? "right" : "left";
  const loser = isTeam1Winner ? team2 : team1;

  const skip = useCallback(() => {
    setSlowFade(false);
    setPhase("done");
  }, []);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(
      setTimeout(() => setPhase("charge"), TIMING.SHOWDOWN_MS)
    );
    timers.push(
      setTimeout(
        () => setPhase("destroy"),
        TIMING.SHOWDOWN_MS + TIMING.CHARGE_MS
      )
    );
    timers.push(
      setTimeout(
        () => setPhase("champion"),
        TIMING.SHOWDOWN_MS + TIMING.CHARGE_MS + TIMING.DESTROY_MS
      )
    );
    timers.push(
      setTimeout(() => {
        setSlowFade(true);
        setPhase("done");
      }, TIMING.SHOWDOWN_MS + TIMING.CHARGE_MS + TIMING.DESTROY_MS + TIMING.CHAMPION_MS)
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
          "radial-gradient(ellipse at 50% 30%, oklch(0.20 0.04 255) 0%, oklch(0.06 0.02 255) 80%)",
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
          {(phase === "showdown" ||
            phase === "charge" ||
            phase === "destroy") && (
            <ShowdownStage
              key="showdown"
              team1={team1}
              team2={team2}
              winnerSide={winnerSide}
              loserSide={loserSide}
              loserId={loser.id}
              accent={accent}
              bracket={bracket}
              phase={phase}
              punteggio={punteggio}
            />
          )}
          {phase === "champion" && (
            <ChampionStage
              key="champion"
              winner={winner}
              accent={accent}
              bracket={bracket}
              punteggio={punteggio}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function ShowdownStage({
  team1,
  team2,
  winnerSide,
  loserSide,
  loserId,
  accent,
  bracket,
  phase,
  punteggio,
}: {
  team1: TeamWithPlayers;
  team2: TeamWithPlayers;
  winnerSide: "left" | "right";
  loserSide: "left" | "right";
  loserId: string;
  accent: string;
  bracket: BracketTipo;
  phase: Phase;
  punteggio?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 flex flex-col px-6 md:px-12 py-8 md:py-12"
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-center mb-3 md:mb-4 shrink-0"
      >
        <div
          className="cc-mono uppercase"
          style={{
            color: accent,
            fontSize: "clamp(11px, 1vw, 16px)",
            letterSpacing: "0.5em",
          }}
        >
          ◆ Verdetto {BRACKET_LABEL[bracket]} ◆
        </div>
      </motion.div>

      <CenterScore
        punteggio={punteggio}
        accent={accent}
        phase={phase}
      />

      <div className="flex-1 grid grid-cols-[1fr_auto_1fr] gap-4 md:gap-10 items-center min-h-0 relative">
        <ShowdownTeam
          team={team1}
          accent={accent}
          fromSide="left"
          delay={0.3}
          isWinner={winnerSide === "left"}
          isLoser={loserSide === "left"}
          loserId={loserId}
          phase={phase}
        />

        <motion.div
          initial={{ scale: 0.4, opacity: 0, rotate: -90 }}
          animate={{
            scale: phase === "showdown" ? 1 : 0,
            opacity: phase === "showdown" ? 1 : 0,
            rotate: 0,
          }}
          transition={{
            delay: phase === "showdown" ? 0.55 : 0,
            duration: phase === "showdown" ? 0.5 : 0.25,
            type: phase === "showdown" ? "spring" : undefined,
            stiffness: 100,
            damping: 12,
          }}
          className="cc-display"
          style={{
            color: accent,
            fontSize: "clamp(60px, 10vw, 160px)",
            lineHeight: 1,
            textShadow: `0 0 60px ${accent}`,
          }}
        >
          ×
        </motion.div>

        <ShowdownTeam
          team={team2}
          accent={accent}
          fromSide="right"
          delay={0.3}
          isWinner={winnerSide === "right"}
          isLoser={loserSide === "right"}
          loserId={loserId}
          phase={phase}
        />

        {phase === "destroy" && <ScreenFlash accent={accent} />}
      </div>
    </motion.div>
  );
}

function CenterScore({
  punteggio,
  accent,
  phase,
}: {
  punteggio?: string;
  accent: string;
  phase: Phase;
}) {
  if (!punteggio) return null;
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0, y: -10 }}
      animate={{
        scale: phase === "destroy" ? [1, 1.12, 1] : 1,
        opacity: 1,
        y: 0,
      }}
      transition={{
        delay: 0.4,
        duration: phase === "destroy" ? 0.4 : 0.5,
        type: phase === "destroy" ? undefined : "spring",
        stiffness: 100,
        damping: 12,
      }}
      className="flex flex-col items-center mb-2 md:mb-4 shrink-0"
    >
      <div
        className="cc-mono uppercase mb-1"
        style={{
          color: accent,
          fontSize: "clamp(10px, 0.85vw, 14px)",
          letterSpacing: "0.4em",
          opacity: 0.7,
        }}
      >
        Risultato finale
      </div>
      <div
        className="text-stat tabular-nums"
        style={{
          color: accent,
          fontSize: "clamp(36px, 5.5vw, 96px)",
          lineHeight: 1,
          textShadow: `0 0 50px ${accent}`,
        }}
      >
        {punteggio}
      </div>
    </motion.div>
  );
}

function ShowdownTeam({
  team,
  accent,
  fromSide,
  delay,
  isWinner,
  isLoser,
  loserId,
  phase,
}: {
  team: TeamWithPlayers;
  accent: string;
  fromSide: "left" | "right";
  delay: number;
  isWinner: boolean;
  isLoser: boolean;
  loserId: string;
  phase: Phase;
}) {
  const off = fromSide === "left" ? "-60vw" : "60vw";
  const offsetSign = fromSide === "left" ? -1 : 1;
  // forward = direction toward opponent
  const fwd = -offsetSign;

  let animateProps: TargetAndTransition;
  let duration = 0.7;
  let ease: Easing = [0.22, 0.9, 0.34, 1];
  let dlay = delay;

  if (isLoser && phase === "destroy") {
    // loser slammed away — starts from contact position
    animateProps = {
      x: [`${offsetSign * 8}vw`, `${offsetSign * 95}vw`],
      opacity: [1, 0],
      rotate: [0, offsetSign * 30],
      scale: [1, 0.5],
      filter: ["grayscale(0)", "grayscale(1)"],
    };
    duration = TIMING.DESTROY_MS / 1000;
    ease = [0.5, 0, 0.75, 0];
    dlay = 0;
  } else if (isWinner && phase === "charge") {
    // winner: pull back, then thrust across to ram loser
    animateProps = {
      x: [`0vw`, `${fwd * -6}vw`, `${fwd * 50}vw`],
      opacity: 1,
      scale: [1, 0.94, 1.12],
      rotate: 0,
    };
    duration = TIMING.CHARGE_MS / 1000;
    dlay = 0;
  } else if (isWinner && phase === "destroy") {
    // winner: post-impact recoil then settle at impact point
    animateProps = {
      x: [`${fwd * 50}vw`, `${fwd * 38}vw`, `${fwd * 44}vw`],
      opacity: 1,
      scale: [1.12, 1.02, 1.05],
      rotate: 0,
    };
    duration = TIMING.DESTROY_MS / 1000;
    dlay = 0;
  } else if (isLoser && phase === "charge") {
    // loser: brace, then shoved on impact
    animateProps = {
      x: [`0vw`, `${offsetSign * -2}vw`, `${offsetSign * 8}vw`],
      opacity: 1,
      scale: [1, 1.02, 0.96],
      rotate: 0,
    };
    duration = TIMING.CHARGE_MS / 1000;
    dlay = 0;
  } else {
    animateProps = { x: 0, opacity: 1, scale: 1, rotate: 0 };
  }

  return (
    <motion.div
      initial={{ x: off, opacity: 0 }}
      animate={animateProps}
      transition={{
        delay: dlay,
        duration,
        ease,
      }}
      className={`flex flex-col items-${
        fromSide === "left" ? "start" : "end"
      } gap-4 md:gap-5 min-w-0 relative`}
    >
      {isWinner && phase !== "destroy" && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.5, scale: 1.1 }}
          transition={{
            delay: delay + 0.4,
            duration: 0.6,
          }}
          className="absolute inset-0 pointer-events-none rounded-full"
          style={{
            background: `radial-gradient(circle, ${accent} 0%, transparent 65%)`,
            filter: "blur(40px)",
            zIndex: -1,
          }}
        />
      )}

      <div
        className="flex"
        style={{ gap: "calc(clamp(140px, 18vw, 320px) * -0.14)" }}
      >
        {[team.player1, team.player2].map((p, i) => (
          <ShakingAvatar
            key={p.id}
            player={p}
            accent={accent}
            shake={isLoser && phase === "charge"}
            shakeIntensity={i + 1}
          />
        ))}
      </div>
      <div className={fromSide === "left" ? "text-left" : "text-right"}>
        <div
          className="cc-display text-paper"
          style={{
            fontSize: "clamp(40px, 6vw, 110px)",
            lineHeight: 0.9,
            opacity: isLoser && phase === "destroy" ? 0.4 : 1,
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
            opacity: isLoser && phase === "destroy" ? 0.4 : 1,
          }}
        >
          / {team.player2.cognome}
        </div>
      </div>

      {/* shards burst on destroy */}
      {isLoser && phase === "destroy" && (
        <ShardBurst accent={accent} fromSide={fromSide} />
      )}

      {/* winner crown badge in charge phase */}
      {isWinner && (phase === "charge" || phase === "destroy") && (
        <motion.div
          initial={{ scale: 0, rotate: -90, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{
            delay: 0.05,
            type: "spring",
            stiffness: 180,
            damping: 12,
          }}
          className="absolute -top-3 -right-3 cc-mono uppercase px-3 py-1 rounded-full"
          style={{
            background: accent,
            color: "var(--color-night-deep)",
            fontSize: "clamp(10px, 0.9vw, 13px)",
            letterSpacing: "0.2em",
          }}
        >
          ★ Vincitore
        </motion.div>
      )}
    </motion.div>
  );
}

function ShakingAvatar({
  player,
  accent,
  shake,
  shakeIntensity,
}: {
  player: PlayerWithMatches;
  accent: string;
  shake: boolean;
  shakeIntensity: number;
}) {
  const amp = 8 * shakeIntensity;
  return (
    <motion.div
      animate={
        shake
          ? {
              x: [0, -amp, amp, -amp, amp, 0],
              y: [0, amp, -amp, amp, -amp, 0],
              rotate: [0, -3, 3, -2, 2, 0],
            }
          : { x: 0, y: 0, rotate: 0 }
      }
      transition={{
        duration: shake ? 0.4 : 0.2,
        repeat: shake ? Infinity : 0,
        ease: "easeInOut",
      }}
      className="rounded-full overflow-hidden bg-paper/10 relative"
      style={{
        width: "clamp(140px, 18vw, 320px)",
        height: "clamp(140px, 18vw, 320px)",
        boxShadow: `0 0 0 5px ${accent}, 0 0 60px -8px ${accent}`,
      }}
    >
      {player.fotoUrl ? (
        <Image
          src={player.fotoUrl}
          alt={`${player.nome} ${player.cognome}`}
          fill
          sizes="(max-width: 768px) 200px, 360px"
          className="object-cover"
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center cc-display text-paper/85 text-5xl md:text-7xl">
          {player.nome[0]}
          {player.cognome[0]}
        </div>
      )}
    </motion.div>
  );
}

function ShardBurst({
  accent,
  fromSide,
}: {
  accent: string;
  fromSide: "left" | "right";
}) {
  const sign = fromSide === "left" ? -1 : 1;
  return (
    <>
      {[...Array(20)].map((_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        const dist = 30 + (i % 4) * 12;
        const sz = 8 + (i % 3) * 6;
        return (
          <motion.span
            key={i}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
            animate={{
              x: `${(Math.cos(angle) * dist + sign * 20)}vmin`,
              y: `${Math.sin(angle) * dist}vmin`,
              opacity: 0,
              scale: 0.2,
              rotate: sign * 360,
            }}
            transition={{
              duration: TIMING.DESTROY_MS / 1000,
              ease: [0.22, 0.9, 0.34, 1],
            }}
            className="absolute pointer-events-none"
            style={{
              left: "50%",
              top: "40%",
              width: sz,
              height: sz,
              background: i % 2 === 0 ? accent : "var(--color-paper)",
              boxShadow: `0 0 16px ${accent}`,
            }}
          />
        );
      })}
    </>
  );
}

function ScreenFlash({ accent }: { accent: string }) {
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.7, 0] }}
      transition={{ duration: 0.4, times: [0, 0.15, 1] }}
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `radial-gradient(ellipse at center, var(--color-paper) 0%, ${accent} 30%, transparent 70%)`,
      }}
    />
  );
}

function ChampionStage({
  winner,
  accent,
  bracket,
  punteggio,
}: {
  winner: TeamWithPlayers;
  accent: string;
  bracket: BracketTipo;
  punteggio?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="absolute inset-0 px-6"
    >
      {/* glow background — soft, behind all */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.45, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 55% 55% at 50% 55%, ${accent} 0%, transparent 65%)`,
          filter: "blur(70px)",
        }}
      />

      <Confetti accent={accent} />

      <div className="relative z-10 h-full flex flex-col items-center justify-between py-[6vh] md:py-[8vh]">
        {/* Top: CAMPIONI title + bracket label */}
        <div className="flex flex-col items-center shrink-0">
          <div
            className="relative flex items-baseline"
            style={{ fontSize: "clamp(48px, 8.5vw, 150px)" }}
          >
            <DropWord
              word="CAMPIONI"
              delay={1.2}
              color={accent}
              accent={accent}
            />
          </div>
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.1, duration: 0.5 }}
            className="cc-mono uppercase mt-2"
            style={{
              color: accent,
              fontSize: "clamp(11px, 1.1vw, 16px)",
              letterSpacing: "0.5em",
            }}
          >
            ◆ {BRACKET_LABEL[bracket]} ◆
          </motion.div>
        </div>

        {/* Middle: avatars */}
        <div className="relative flex items-center justify-center shrink-0">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: 0.3,
              type: "spring",
              stiffness: 90,
              damping: 14,
            }}
            className="relative flex"
            style={{ gap: "calc(clamp(140px, 18vw, 280px) * -0.14)" }}
          >
            {[winner.player1, winner.player2].map((p) => (
              <div
                key={p.id}
                className="rounded-full overflow-hidden bg-paper/10 relative"
                style={{
                  width: "clamp(140px, 18vw, 280px)",
                  height: "clamp(140px, 18vw, 280px)",
                  boxShadow: `0 0 0 5px ${accent}, 0 0 60px ${accent}`,
                }}
              >
                {p.fotoUrl ? (
                  <Image
                    src={p.fotoUrl}
                    alt={`${p.nome} ${p.cognome}`}
                    fill
                    sizes="(max-width: 768px) 200px, 320px"
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
          </motion.div>
        </div>

        {/* Bottom: cognomi + punteggio */}
        <div className="flex flex-col items-center gap-3 md:gap-4 shrink-0 text-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <div
              className="cc-display text-paper"
              style={{
                fontSize: "clamp(36px, 5.5vw, 96px)",
                lineHeight: 0.9,
              }}
            >
              {winner.player1.cognome}
            </div>
            <div
              className="cc-display"
              style={{
                color: accent,
                fontSize: "clamp(26px, 4vw, 70px)",
                lineHeight: 1,
              }}
            >
              / {winner.player2.cognome}
            </div>
          </motion.div>

          {punteggio && (
            <motion.div
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="text-stat tabular-nums"
              style={{
                color: accent,
                fontSize: "clamp(22px, 3vw, 56px)",
                lineHeight: 1,
                textShadow: `0 0 30px ${accent}`,
              }}
            >
              {punteggio}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
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

function Confetti({ accent }: { accent: string }) {
  return (
    <>
      {[...Array(40)].map((_, i) => {
        const startX = (i / 40) * 100;
        const drift = (i % 5) - 2;
        const dur = 4 + (i % 4) * 0.6;
        const delay = (i % 10) * 0.15;
        const size = 6 + (i % 3) * 4;
        const isYellow = i % 3 === 0;
        return (
          <motion.span
            key={i}
            initial={{ y: "-10vh", opacity: 0, rotate: 0 }}
            animate={{
              y: "110vh",
              opacity: [0, 1, 1, 0],
              rotate: 360 * (i % 2 === 0 ? 1 : -1),
              x: `${drift * 4}vw`,
            }}
            transition={{
              delay,
              duration: dur,
              ease: "linear",
              repeat: Infinity,
              repeatDelay: (i % 5) * 0.4,
              times: [0, 0.05, 0.85, 1],
            }}
            className="absolute pointer-events-none"
            style={{
              left: `${startX}%`,
              width: size,
              height: size * 1.6,
              background: isYellow ? accent : "var(--color-paper)",
              boxShadow: `0 0 8px ${accent}`,
            }}
          />
        );
      })}
    </>
  );
}
