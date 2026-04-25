import { cn } from "@/lib/utils";
import type { MatchWithPlayers, PlayerWithMatches } from "@/types";

interface BracketMatchProps {
  match: MatchWithPlayers;
}

function PlayerRow({
  player,
  isWinner,
  isLoser,
  scoreCell,
}: {
  player: PlayerWithMatches | null;
  isWinner: boolean;
  isLoser: boolean;
  scoreCell?: string;
}) {
  if (!player) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 text-cream/30">
        <span className="font-mono text-[10px] tracking-widest uppercase">— bye</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-2.5 transition-colors",
        isLoser && "opacity-40"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {player.fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.fotoUrl}
            alt=""
            className="h-7 w-7 rounded-full object-cover bg-cream/10 shrink-0 ring-1 ring-cream/15"
          />
        ) : (
          <div className="h-7 w-7 rounded-full bg-cream/10 ring-1 ring-cream/15 flex items-center justify-center text-[10px] font-mono text-cream/60 shrink-0">
            {player.nome[0]}
            {player.cognome[0]}
          </div>
        )}
        <div className="min-w-0 flex items-baseline gap-2">
          <span
            className={cn(
              "font-body text-sm leading-tight truncate",
              isWinner ? "font-semibold text-cream" : "text-cream/85"
            )}
          >
            {player.cognome}
          </span>
          <span className="text-[11px] text-cream/45 truncate">
            {player.nome}
          </span>
          {player.livello > 0 && (
            <span className="text-[9px] font-mono text-court-line/80 shrink-0">
              [{player.livello}]
            </span>
          )}
        </div>
      </div>
      <span
        className={cn(
          "text-stat text-xs shrink-0 tabular-nums",
          isWinner ? "text-court-line" : "text-cream/45"
        )}
      >
        {scoreCell ?? ""}
      </span>
    </div>
  );
}

export function BracketMatch({ match }: BracketMatchProps) {
  const isInCorso = match.stato === "IN_CORSO";
  const isCompletata = match.stato === "COMPLETATA";

  const player1Won =
    isCompletata && match.winner !== null && match.player1?.id === match.winner.id;
  const player2Won =
    isCompletata && match.winner !== null && match.player2?.id === match.winner.id;

  const punteggio = match.punteggio;
  const sets = punteggio ? punteggio.split(",").map((s) => s.trim()) : [];
  const set1Win = sets[0]?.split("-")[0];
  const set1Loss = sets[0]?.split("-")[1];

  return (
    <div
      className={cn(
        "relative w-[252px] rounded-sm bg-court border transition-all",
        isInCorso
          ? "border-court-line glow-line"
          : isCompletata
          ? "border-cream/15"
          : "border-cream/10"
      )}
    >
      {/* Status strip */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-cream/10">
        <span className="font-mono text-[9px] tracking-[0.32em] uppercase text-cream/40">
          {isInCorso ? "Live" : isCompletata ? "Final" : "—"}
        </span>
        {isInCorso && (
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-court-line opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-court-line" />
          </span>
        )}
        {isCompletata && (
          <span className="text-[9px] font-mono text-cream/40 tabular-nums">
            {match.finitaAt
              ? new Date(match.finitaAt).toLocaleDateString("it-IT", {
                  day: "2-digit",
                  month: "short",
                })
              : ""}
          </span>
        )}
      </div>

      <PlayerRow
        player={match.player1}
        isWinner={player1Won}
        isLoser={isCompletata && !player1Won}
        scoreCell={
          isCompletata ? (player1Won ? set1Win : set1Loss) : undefined
        }
      />
      <div className="border-t border-cream/8" />
      <PlayerRow
        player={match.player2}
        isWinner={player2Won}
        isLoser={isCompletata && !player2Won}
        scoreCell={
          isCompletata ? (player2Won ? set1Win : set1Loss) : undefined
        }
      />

      {isCompletata && punteggio && sets.length > 1 && (
        <div className="px-4 py-1.5 border-t border-cream/10 text-stat text-[10px] text-cream/55 text-right">
          {punteggio}
        </div>
      )}
    </div>
  );
}
