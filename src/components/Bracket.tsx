import { BracketMatch } from "@/components/BracketMatch";
import type { MatchWithPlayers, TournamentWithMatches } from "@/types";

function getRoundLabel(round: number, maxRound: number): string {
  if (round === 1) return "🏆 Finale";
  if (round === 2) return "Semifinali";
  if (round === 3) return "Quarti di Finale";
  if (round === 4) return "Ottavi di Finale";
  return `Turno ${maxRound - round + 1}`;
}

interface BracketProps {
  torneo: TournamentWithMatches;
}

export function Bracket({ torneo }: BracketProps) {
  if (!torneo.matches.length) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-slate-400">Bracket non ancora generato.</p>
      </div>
    );
  }

  const matchesByRound = torneo.matches.reduce<Record<number, MatchWithPlayers[]>>(
    (acc, match) => {
      (acc[match.round] ??= []).push(match);
      return acc;
    },
    {}
  );

  const rounds = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => b - a);

  const maxRound = rounds[0];

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-10 px-6 py-8 min-w-full">
        {rounds.map((round) => (
          <div
            key={round}
            className="flex flex-col justify-around gap-4"
            style={{ minWidth: 220 }}
          >
            <div className="text-center text-xs uppercase tracking-widest text-slate-400 mb-2">
              {getRoundLabel(round, maxRound)}
            </div>
            <div
              className="flex flex-col"
              style={{
                gap: `${Math.pow(2, maxRound - round) * 0.75}rem`,
              }}
            >
              {matchesByRound[round]
                .sort((a, b) => a.posizione - b.posizione)
                .map((match) => (
                  <BracketMatch key={match.id} match={match} />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
