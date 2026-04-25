"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LiveEvent, PlayerWithMatches } from "@/types";

interface LiveMatchOverlayProps {
  event: LiveEvent | null;
  onClose: () => void;
}

function PlayerAvatar({
  player,
  isWinner,
}: {
  player: PlayerWithMatches;
  isWinner: boolean;
}) {
  return (
    <div
      className={`relative rounded-full ${
        isWinner ? "ring-4 ring-yellow-400 shadow-yellow-400/50 shadow-2xl" : ""
      }`}
    >
      {player.fotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={player.fotoUrl}
          alt={`${player.nome} ${player.cognome}`}
          className="w-32 h-32 md:w-48 md:h-48 rounded-full object-cover bg-slate-700"
        />
      ) : (
        <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-slate-700 flex items-center justify-center text-6xl">
          👤
        </div>
      )}
      {isWinner && (
        <div className="absolute -top-4 -right-4 text-4xl drop-shadow-lg">🏆</div>
      )}
    </div>
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
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer"
          style={{
            background:
              event.tipo === "PARTITA_INIZIATA"
                ? "linear-gradient(135deg, #0f172a 0%, #14532d 100%)"
                : "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="mb-10"
          >
            {event.tipo === "PARTITA_INIZIATA" ? (
              <span className="bg-green-500 text-white text-xl md:text-2xl font-bold px-6 md:px-8 py-3 rounded-full uppercase tracking-widest shadow-lg shadow-green-500/40">
                🎾 Partita Iniziata!
              </span>
            ) : (
              <span className="bg-blue-500 text-white text-xl md:text-2xl font-bold px-6 md:px-8 py-3 rounded-full uppercase tracking-widest shadow-lg shadow-blue-500/40">
                🏆 Partita Terminata!
              </span>
            )}
          </motion.div>

          <div className="flex items-center gap-8 md:gap-24 px-4">
            <motion.div
              initial={{ x: -150, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
              className="flex flex-col items-center gap-4"
            >
              <PlayerAvatar
                player={event.player1}
                isWinner={event.winner?.id === event.player1.id}
              />
              <p className="text-white text-lg md:text-xl font-semibold text-center">
                {event.player1.nome}
                <br />
                {event.player1.cognome}
              </p>
              {event.tipo === "PARTITA_FINITA" && event.winner?.id === event.player1.id && (
                <span className="text-yellow-400 font-bold text-lg">🏆 Vincitore</span>
              )}
            </motion.div>

            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6, type: "spring" }}
              className="flex flex-col items-center"
            >
              {event.tipo === "PARTITA_INIZIATA" ? (
                <span className="text-white text-4xl md:text-6xl font-black tracking-wider">
                  VS
                </span>
              ) : (
                <>
                  <span className="text-white text-3xl md:text-5xl font-black font-mono">
                    {event.punteggio}
                  </span>
                  <span className="text-slate-400 text-sm md:text-lg mt-2 uppercase tracking-widest">
                    Risultato Finale
                  </span>
                </>
              )}
            </motion.div>

            <motion.div
              initial={{ x: 150, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
              className="flex flex-col items-center gap-4"
            >
              <PlayerAvatar
                player={event.player2}
                isWinner={event.winner?.id === event.player2.id}
              />
              <p className="text-white text-lg md:text-xl font-semibold text-center">
                {event.player2.nome}
                <br />
                {event.player2.cognome}
              </p>
              {event.tipo === "PARTITA_FINITA" && event.winner?.id === event.player2.id && (
                <span className="text-yellow-400 font-bold text-lg">🏆 Vincitore</span>
              )}
            </motion.div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="absolute bottom-8 text-slate-500 text-sm"
          >
            Tocca per chiudere · Chiusura automatica in 8 secondi
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
