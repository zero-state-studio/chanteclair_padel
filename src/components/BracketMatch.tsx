import { cn } from "@/lib/utils";
import type { MatchWithPlayers, PlayerWithMatches } from "@/types";

interface BracketMatchProps {
  match: MatchWithPlayers;
}

function PlayerRow({
  player,
  isWinner,
  punteggio,
}: {
  player: PlayerWithMatches | null;
  isWinner: boolean;
  punteggio?: string;
}) {
  if (!player) {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-2 text-slate-500 italic">
        <span className="text-sm">BYE</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 px-3 py-2",
        isWinner && "bg-green-950/40 border-l-2 border-green-500"
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {player.fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.fotoUrl}
            alt={`${player.nome} ${player.cognome}`}
            className="h-8 w-8 rounded-full object-cover bg-slate-700 shrink-0"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-sm shrink-0">
            👤
          </div>
        )}
        <div className="min-w-0">
          <p
            className={cn(
              "text-sm leading-tight truncate",
              isWinner ? "font-bold text-white" : "text-slate-200"
            )}
          >
            {player.nome}
          </p>
          <p
            className={cn(
              "text-xs leading-tight truncate",
              isWinner ? "font-semibold text-white" : "text-slate-300"
            )}
          >
            {player.cognome}
          </p>
        </div>
      </div>
      {punteggio && (
        <span className="text-xs font-mono text-slate-300 shrink-0">{punteggio}</span>
      )}
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

  const punteggio = match.punteggio ?? undefined;

  return (
    <div
      className={cn(
        "w-[220px] rounded-md border border-slate-700 bg-slate-800 overflow-hidden shadow-sm",
        isInCorso && "border-green-500 bg-green-950/30 shadow-green-500/30 shadow-md"
      )}
    >
      <div className="flex items-center justify-between px-3 py-1 border-b border-slate-700/60 bg-slate-900/40">
        {isInCorso && (
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-green-400 font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Live
          </span>
        )}
        {isCompletata && (
          <span className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold">
            Conclusa
          </span>
        )}
        {match.stato === "ATTESA" && (
          <span className="text-[10px] uppercase tracking-wider text-slate-500">
            In attesa
          </span>
        )}
      </div>
      <PlayerRow player={match.player1} isWinner={player1Won} punteggio={player1Won ? punteggio : undefined} />
      <div className="border-t border-slate-700/60" />
      <PlayerRow player={match.player2} isWinner={player2Won} punteggio={player2Won ? punteggio : undefined} />
    </div>
  );
}
