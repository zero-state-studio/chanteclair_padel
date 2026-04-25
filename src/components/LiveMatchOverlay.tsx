"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LiveEvent, PlayerWithMatches } from "@/types";

interface LiveMatchOverlayProps {
  event: LiveEvent | null;
  onClose: () => void;
}

function PlayerColumn({
  player,
  isWinner,
  isLoser,
  side,
  delay,
}: {
  player: PlayerWithMatches;
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
      transition={{ delay, type: "spring", stiffness: 70, damping: 14 }}
      className={`flex flex-col items-${side === "left" ? "start" : "end"} gap-6 ${
        isLoser ? "opacity-40" : ""
      }`}
    >
      <div className="text-eyebrow text-cream/50">
        {side === "left" ? "Player A" : "Player B"}
      </div>

      <div className="relative">
        {isWinner && (
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: delay + 0.4, type: "spring", stiffness: 200 }}
            className="absolute -top-3 -right-3 z-10 px-3 py-1 bg-court-line text-court font-display italic text-sm rounded-full"
          >
            vincitore
          </motion.div>
        )}
        {player.fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.fotoUrl}
            alt={`${player.nome} ${player.cognome}`}
            className={`w-36 h-36 md:w-56 md:h-56 rounded-full object-cover bg-cream/10 ring-1 ${
              isWinner
                ? "ring-court-line ring-offset-8 ring-offset-court"
                : "ring-cream/20"
            }`}
          />
        ) : (
          <div
            className={`w-36 h-36 md:w-56 md:h-56 rounded-full bg-cream/10 ring-1 flex items-center justify-center ${
              isWinner
                ? "ring-court-line ring-offset-8 ring-offset-court"
                : "ring-cream/20"
            }`}
          >
            <span className="font-display text-6xl md:text-8xl text-cream/70">
              {player.nome[0]}
              {player.cognome[0]}
            </span>
          </div>
        )}
      </div>

      <div className={side === "left" ? "text-left" : "text-right"}>
        <div className="text-eyebrow text-cream/50 mb-1">
          {player.livello > 0 ? `Testa di serie #${player.livello}` : "—"}
        </div>
        <div className="font-display text-4xl md:text-6xl leading-[0.9] text-cream">
          {player.cognome}
        </div>
        <div className="font-display italic text-2xl md:text-3xl text-cream/70 leading-tight">
          {player.nome}
        </div>
      </div>
    </motion.div>
  );
}

export function LiveMatchOverlay({ event, onClose }: LiveMatchOverlayProps) {
  useEffect(() => {
    if (!event) return;
    const timer = setTimeout(onClose, 8000);
    return () => clearTimeout(timer);
  }, [event, onClose]);

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
                ? "radial-gradient(ellipse at 50% 30%, #1a3526 0%, #060c09 70%)"
                : "radial-gradient(ellipse at 50% 30%, #1f2c3a 0%, #060c09 70%)",
          }}
        >
          {/* Court grid backdrop */}
          <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 0.4, scale: 1 }}
            transition={{ duration: 1.2 }}
            className="absolute inset-0 court-grid pointer-events-none"
          />

          {/* Animated court line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.1, duration: 0.6, ease: [0.85, 0, 0.15, 1] }}
            className="absolute top-0 left-0 right-0 h-[3px] bg-court-line origin-left"
          />
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.85, 0, 0.15, 1] }}
            className="absolute bottom-0 left-0 right-0 h-[3px] bg-court-line origin-right"
          />

          <div className="relative h-full flex flex-col justify-between max-w-[1400px] mx-auto px-6 md:px-12 py-10 md:py-16">
            {/* Top bar */}
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-between"
            >
              <div className="text-eyebrow text-cream/60">
                Chanteclair · {event.genere}
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`relative flex h-2 w-2 ${
                    event.tipo === "PARTITA_INIZIATA" ? "" : "hidden"
                  }`}
                >
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-court-line opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-court-line" />
                </span>
                <span
                  className={`text-eyebrow ${
                    event.tipo === "PARTITA_INIZIATA"
                      ? "text-court-line"
                      : "text-clay"
                  }`}
                >
                  {event.tipo === "PARTITA_INIZIATA" ? "in campo" : "concluso"}
                </span>
              </div>
              <div className="text-eyebrow text-cream/60 hidden md:block">
                {new Date().toLocaleTimeString("it-IT", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </motion.div>

            {/* Headline */}
            <div className="flex flex-col items-center text-center">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-eyebrow text-court-line mb-6"
              >
                {event.tipo === "PARTITA_INIZIATA"
                  ? "— Inizia il match —"
                  : "— Match concluso —"}
              </motion.div>

              {/* Players */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-8 md:gap-16 items-center w-full">
                <PlayerColumn
                  player={event.player1}
                  isWinner={event.winner?.id === event.player1.id}
                  isLoser={
                    event.tipo === "PARTITA_FINITA" &&
                    event.winner !== undefined &&
                    event.winner?.id !== event.player1.id
                  }
                  side="left"
                  delay={0.5}
                />

                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.7, type: "spring", stiffness: 120 }}
                  className="flex flex-col items-center gap-2"
                >
                  {event.tipo === "PARTITA_INIZIATA" ? (
                    <>
                      <div className="text-eyebrow text-cream/40">vs</div>
                      <div className="font-display italic text-court-line text-7xl md:text-9xl leading-none">
                        ×
                      </div>
                      <div className="text-eyebrow text-cream/40">match 01</div>
                    </>
                  ) : (
                    <>
                      <div className="text-eyebrow text-cream/40">Risultato</div>
                      <div className="text-stat text-court-line text-3xl md:text-5xl tabular-nums leading-tight">
                        {event.punteggio}
                      </div>
                      <div className="text-eyebrow text-cream/40">finale</div>
                    </>
                  )}
                </motion.div>

                <PlayerColumn
                  player={event.player2}
                  isWinner={event.winner?.id === event.player2.id}
                  isLoser={
                    event.tipo === "PARTITA_FINITA" &&
                    event.winner !== undefined &&
                    event.winner?.id !== event.player2.id
                  }
                  side="right"
                  delay={0.5}
                />
              </div>
            </div>

            {/* Footer hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="flex items-center justify-between text-eyebrow text-cream/40"
            >
              <span>tocca per chiudere</span>
              <span className="hidden md:inline">
                chiusura automatica · 8s
              </span>
              <span>match #{event.matchId.slice(-6)}</span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
