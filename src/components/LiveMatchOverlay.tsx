"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import type { MatchLiveEvent, TeamWithPlayers, PlayerWithMatches } from "@/types";

interface LiveMatchOverlayProps {
  event: MatchLiveEvent | null;
  onClose: () => void;
}

type Phase = "intro" | "reveal";

const INTRO_DURATION_MS = 3500; // when reveal kicks in (FINITA only)
const TOTAL_DURATION_FINITA_MS = 11000;
const TOTAL_DURATION_INIZIATA_MS = 8000;

function MiniAvatar({
  player,
  size,
}: {
  player: PlayerWithMatches;
  size: string;
}) {
  return player.fotoUrl ? (
    <div
      className="rounded-full overflow-hidden bg-paper/10 relative"
      style={{
        width: size,
        height: size,
        boxShadow: "0 0 0 1px rgba(251, 250, 246, 0.2)",
      }}
    >
      <Image
        src={player.fotoUrl}
        alt={`${player.nome} ${player.cognome}`}
        fill
        sizes="(max-width: 768px) 100px, 220px"
        className="object-cover"
      />
    </div>
  ) : (
    <div
      className="rounded-full bg-paper/10 flex items-center justify-center"
      style={{
        width: size,
        height: size,
        boxShadow: "0 0 0 1px rgba(251, 250, 246, 0.2)",
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

function IntroTeamColumn({
  team,
  isWinner,
  isLoser,
  side,
  delay,
}: {
  team: TeamWithPlayers;
  isWinner: boolean;
  isLoser: boolean;
  side: "left" | "right";
  delay: number;
}) {
  return (
    <motion.div
      initial={{
        x: side === "left" ? -120 : 120,
        opacity: 0,
        filter: "blur(12px)",
      }}
      animate={{ x: 0, opacity: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.5 } }}
      transition={{ delay, type: "spring", stiffness: 70, damping: 14 }}
      className={`flex flex-col items-${side === "left" ? "start" : "end"} gap-3 md:gap-4 ${
        isLoser ? "opacity-50" : ""
      }`}
    >
      <div className="text-eyebrow text-paper/50">
        {side === "left" ? "Team A" : "Team B"}
      </div>

      <div className="relative">
        {isWinner && (
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: delay + 0.4, type: "spring", stiffness: 200 }}
            className="absolute -top-3 -right-3 z-10 px-3 py-1 cc-mono"
            style={{
              background: "var(--color-yellow)",
              color: "var(--color-night-deep)",
              fontSize: 11,
              borderRadius: "999px",
            }}
          >
            vincitore
          </motion.div>
        )}
        <div
          className="flex"
          style={{ gap: "calc(clamp(72px, 10vw, 160px) * -0.18)" }}
        >
          <MiniAvatar
            player={team.player1}
            size="clamp(72px, 10vw, 160px)"
          />
          <MiniAvatar
            player={team.player2}
            size="clamp(72px, 10vw, 160px)"
          />
        </div>
      </div>

      <div className={side === "left" ? "text-left" : "text-right"}>
        <div className="text-eyebrow text-paper/50 mb-1">
          {team.livello > 0 ? `Testa di serie #${team.livello}` : "—"}
        </div>
        <div
          className="cc-display text-paper"
          style={{ fontSize: "clamp(36px, 5.4vw, 96px)", lineHeight: 0.9 }}
        >
          {team.player1.cognome}
        </div>
        <div
          className="cc-display text-paper/70"
          style={{
            fontSize: "clamp(24px, 3.8vw, 66px)",
            lineHeight: 1,
            letterSpacing: "0.01em",
          }}
        >
          / {team.player2.cognome}
        </div>
      </div>
    </motion.div>
  );
}

function WinnerCelebration({
  winner,
  punteggio,
}: {
  winner: TeamWithPlayers;
  punteggio?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 0.9, 0.34, 1] }}
      className="flex flex-col items-center gap-5 md:gap-7 text-center"
    >
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="cc-mono"
        style={{
          fontSize: "clamp(14px, 1.4vw, 22px)",
          color: "var(--color-yellow)",
          letterSpacing: "0.4em",
        }}
      >
        ★ vincitore ★
      </motion.div>

      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          delay: 0.1,
          type: "spring",
          stiffness: 90,
          damping: 14,
        }}
        className="relative"
      >
        <div
          className="absolute inset-0 -m-8 pointer-events-none"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 50%, var(--color-yellow) 0%, transparent 65%)",
            opacity: 0.25,
            filter: "blur(40px)",
          }}
        />
        <div
          className="relative flex"
          style={{ gap: "calc(clamp(130px, 17vw, 260px) * -0.18)" }}
        >
          <div
            className="rounded-full"
            style={{
              boxShadow:
                "0 0 0 5px var(--color-yellow), 0 0 48px rgba(236, 210, 74, 0.45)",
            }}
          >
            <MiniAvatar
              player={winner.player1}
              size="clamp(130px, 17vw, 260px)"
            />
          </div>
          <div
            className="rounded-full"
            style={{
              boxShadow:
                "0 0 0 5px var(--color-yellow), 0 0 48px rgba(236, 210, 74, 0.45)",
            }}
          >
            <MiniAvatar
              player={winner.player2}
              size="clamp(130px, 17vw, 260px)"
            />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.5 }}
      >
        {winner.livello > 0 && (
          <div className="text-eyebrow text-paper/50 mb-2">
            Testa di serie #{winner.livello}
          </div>
        )}
        <div
          className="cc-display text-paper"
          style={{
            fontSize: "clamp(54px, 9vw, 160px)",
            lineHeight: 0.9,
            letterSpacing: "-0.005em",
          }}
        >
          {winner.player1.cognome}
        </div>
        <div
          className="cc-display"
          style={{
            fontSize: "clamp(36px, 6.5vw, 115px)",
            lineHeight: 0.95,
            color: "var(--color-yellow)",
          }}
        >
          / {winner.player2.cognome}
        </div>
      </motion.div>

      {punteggio && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="flex flex-col items-center"
        >
          <div className="text-eyebrow text-paper/40 mb-1">Punteggio finale</div>
          <div
            className="text-stat tabular-nums"
            style={{
              fontSize: "clamp(28px, 4.2vw, 78px)",
              color: "var(--color-yellow)",
              lineHeight: 1,
            }}
          >
            {punteggio}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export function LiveMatchOverlay({ event, onClose }: LiveMatchOverlayProps) {
  const eventKey = event ? `${event.matchId}-${event.tipo}` : null;
  const [phase, setPhase] = useState<Phase>("intro");
  const [phaseKey, setPhaseKey] = useState<string | null>(null);

  // Reset phase synchronously when event changes (React-recommended pattern
  // for "adjusting state during render" instead of using useEffect).
  if (eventKey !== phaseKey) {
    setPhaseKey(eventKey);
    setPhase("intro");
  }

  // Schedule reveal + auto-close timers for the active event.
  useEffect(() => {
    if (!event) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    if (event.tipo === "PARTITA_FINITA") {
      timers.push(
        setTimeout(() => setPhase("reveal"), INTRO_DURATION_MS),
        setTimeout(onClose, TOTAL_DURATION_FINITA_MS)
      );
    } else {
      timers.push(setTimeout(onClose, TOTAL_DURATION_INIZIATA_MS));
    }

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [event, onClose]);

  const winner =
    event?.tipo === "PARTITA_FINITA" ? event.winner : undefined;

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          key={event.matchId + event.tipo}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-50 cursor-pointer overflow-hidden"
          onClick={onClose}
          style={{
            background:
              event.tipo === "PARTITA_INIZIATA"
                ? "radial-gradient(ellipse at 50% 30%, oklch(0.22 0.04 255) 0%, oklch(0.10 0.03 255) 70%)"
                : "radial-gradient(ellipse at 50% 30%, oklch(0.26 0.05 255) 0%, oklch(0.10 0.03 255) 70%)",
          }}
        >
          {/* Diagonal stripes background */}
          <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 0.4, scale: 1 }}
            transition={{ duration: 1.2 }}
            className="absolute inset-0 cc-stripes pointer-events-none"
          />

          {/* Top + bottom yellow accent bars */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.1, duration: 0.6, ease: [0.85, 0, 0.15, 1] }}
            className="absolute top-0 left-0 right-0 h-[3px] origin-left"
            style={{ background: "var(--color-yellow)" }}
          />
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.85, 0, 0.15, 1] }}
            className="absolute bottom-0 left-0 right-0 h-[3px] origin-right"
            style={{ background: "var(--color-yellow)" }}
          />

          <div className="relative h-full flex flex-col justify-between max-w-[1600px] mx-auto px-6 md:px-12 py-8 md:py-12">
            {/* Top chrome */}
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-between"
            >
              <div className="text-eyebrow text-paper/60 flex items-center gap-3 flex-wrap">
                <span>Chanteclair · {event.genere}</span>
              </div>
              <div className="flex items-center gap-3">
                {event.tipo === "PARTITA_INIZIATA" && (
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
                  style={{
                    color:
                      event.tipo === "PARTITA_INIZIATA"
                        ? "var(--color-yellow)"
                        : "var(--color-red)",
                  }}
                >
                  {event.tipo === "PARTITA_INIZIATA" ? "in campo" : "concluso"}
                </span>
              </div>
              <div className="text-eyebrow text-paper/60 hidden md:block">
                {new Date().toLocaleTimeString("it-IT", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </motion.div>

            {/* Center content (intro vs reveal) */}
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center w-full overflow-hidden py-2">
              <AnimatePresence mode="wait">
                {phase === "intro" || event.tipo === "PARTITA_INIZIATA" ? (
                  <motion.div
                    key="intro"
                    exit={{ opacity: 0, transition: { duration: 0.5 } }}
                    className="w-full"
                  >
                    {event.tipo === "PARTITA_INIZIATA" && event.field && (
                      <motion.div
                        initial={{ y: -20, opacity: 0, scale: 0.92 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        transition={{
                          delay: 0.25,
                          type: "spring",
                          stiffness: 90,
                          damping: 14,
                        }}
                        className="flex flex-col items-center mb-3 md:mb-5"
                      >
                        <div
                          className="text-eyebrow text-paper/50 mb-1 md:mb-2"
                          style={{ letterSpacing: "0.5em" }}
                        >
                          ◆ campo
                        </div>
                        <div
                          className="cc-display"
                          style={{
                            fontSize: "clamp(44px, 7vw, 120px)",
                            lineHeight: 0.9,
                            letterSpacing: "0.005em",
                            color: "var(--color-yellow)",
                            textShadow: "0 0 60px rgba(236, 210, 74, 0.35)",
                          }}
                        >
                          {event.field.nome}
                        </div>
                      </motion.div>
                    )}

                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-eyebrow mb-4 md:mb-6"
                      style={{ color: "var(--color-yellow)" }}
                    >
                      {event.tipo === "PARTITA_INIZIATA"
                        ? "— Inizia il match —"
                        : "— Match concluso —"}
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-12 items-center w-full">
                      <IntroTeamColumn
                        team={event.team1}
                        isWinner={winner?.id === event.team1.id}
                        isLoser={
                          event.tipo === "PARTITA_FINITA" &&
                          winner !== undefined &&
                          winner.id !== event.team1.id
                        }
                        side="left"
                        delay={0.5}
                      />

                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          delay: 0.7,
                          type: "spring",
                          stiffness: 120,
                        }}
                        className="flex flex-col items-center gap-2"
                      >
                        {event.tipo === "PARTITA_INIZIATA" ? (
                          <>
                            <div className="text-eyebrow text-paper/40">vs</div>
                            <div
                              className="cc-display"
                              style={{
                                fontSize: "clamp(56px, 8vw, 140px)",
                                lineHeight: 1,
                                color: "var(--color-yellow)",
                              }}
                            >
                              ×
                            </div>
                            <div className="text-eyebrow text-paper/40">
                              match
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-eyebrow text-paper/40">
                              Risultato
                            </div>
                            <div
                              className="text-stat tabular-nums"
                              style={{
                                fontSize: "clamp(48px, 7vw, 130px)",
                                color: "var(--color-yellow)",
                                lineHeight: 1,
                              }}
                            >
                              {event.punteggio}
                            </div>
                            <div className="text-eyebrow text-paper/40">
                              finale
                            </div>
                          </>
                        )}
                      </motion.div>

                      <IntroTeamColumn
                        team={event.team2}
                        isWinner={winner?.id === event.team2.id}
                        isLoser={
                          event.tipo === "PARTITA_FINITA" &&
                          winner !== undefined &&
                          winner.id !== event.team2.id
                        }
                        side="right"
                        delay={0.5}
                      />
                    </div>
                  </motion.div>
                ) : (
                  winner && (
                    <WinnerCelebration
                      key="reveal"
                      winner={winner}
                      punteggio={event.punteggio}
                    />
                  )
                )}
              </AnimatePresence>
            </div>

            {/* Bottom chrome */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="flex items-center justify-between text-eyebrow text-paper/40"
            >
              <span>tocca per chiudere</span>
              <span className="hidden md:inline">
                chiusura automatica ·{" "}
                {event.tipo === "PARTITA_FINITA"
                  ? `${TOTAL_DURATION_FINITA_MS / 1000}s`
                  : `${TOTAL_DURATION_INIZIATA_MS / 1000}s`}
              </span>
              <span>match #{event.matchId.slice(-6)}</span>
            </motion.div>
          </div>

          {/* Sponsor strip — centered during intro, bottom-right during winner reveal */}
          {event.sponsor && (
            <AnimatePresence mode="wait">
              {(() => {
                const isCorner =
                  event.tipo === "PARTITA_FINITA" && phase === "reveal";
                return (
                  <motion.div
                    key={isCorner ? "corner" : "center"}
                    initial={{ opacity: 0, y: 18, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.92 }}
                    transition={{
                      duration: 0.5,
                      ease: [0.22, 0.9, 0.34, 1],
                      delay: isCorner ? 0 : 1.2,
                    }}
                    className={
                      isCorner
                        ? "absolute z-20 bottom-16 right-6 md:right-10 flex items-center gap-2 py-1.5 px-2.5 rounded-sm border border-paper/15 bg-paper/[0.05] backdrop-blur-sm"
                        : "absolute z-20 left-1/2 -translate-x-1/2 bottom-20 md:bottom-24 flex items-center gap-2.5 md:gap-3 py-2 px-3.5 rounded-sm border border-paper/15 bg-paper/[0.04] backdrop-blur-sm"
                    }
                    style={{ maxWidth: "min(560px, 90%)" }}
                  >
                    <span
                      className="cc-mono uppercase tracking-[0.28em] text-paper/55 shrink-0"
                      style={{
                        fontSize: isCorner
                          ? "clamp(8px, 0.65vw, 10px)"
                          : "clamp(9px, 0.75vw, 11px)",
                      }}
                    >
                      Partita offerta da
                    </span>
                    {event.sponsor!.logoUrl && (
                      <Image
                        src={event.sponsor!.logoUrl}
                        alt={event.sponsor!.nome}
                        width={256}
                        height={256}
                        className="object-contain bg-paper/10 rounded-sm p-0.5 shrink-0"
                        style={{
                          height: isCorner
                            ? "clamp(20px, 2vw, 26px)"
                            : "clamp(26px, 2.6vw, 34px)",
                          width: "auto",
                        }}
                      />
                    )}
                    <span
                      className="cc-display text-paper truncate"
                      style={{
                        fontSize: isCorner
                          ? "clamp(13px, 1.1vw, 18px)"
                          : "clamp(16px, 1.6vw, 24px)",
                        lineHeight: 1,
                        letterSpacing: "0.02em",
                      }}
                    >
                      {event.sponsor!.nome}
                    </span>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
