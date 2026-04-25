import { BracketMatch } from "@/components/BracketMatch";
import type { MatchWithTeams, TournamentWithMatches } from "@/types";

function getRoundLabel(round: number, maxRound: number): {
  primary: string;
  secondary: string;
} {
  if (round === 1) return { primary: "Finale", secondary: "Round 01" };
  if (round === 2) return { primary: "Semifinali", secondary: "Round 02" };
  if (round === 3) return { primary: "Quarti", secondary: "Round 03" };
  if (round === 4) return { primary: "Ottavi", secondary: "Round 04" };
  return {
    primary: `Turno ${maxRound - round + 1}`,
    secondary: `Round 0${maxRound - round + 1}`,
  };
}

interface BracketProps {
  torneo: TournamentWithMatches;
}

export function Bracket({ torneo }: BracketProps) {
  if (!torneo.matches.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="font-display italic text-3xl text-cream/50">
          Bracket non ancora generato
        </p>
        <p className="text-eyebrow text-cream/40 mt-3">In attesa di sorteggio</p>
      </div>
    );
  }

  const matchesByRound = torneo.matches.reduce<Record<number, MatchWithTeams[]>>(
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
      <div className="inline-flex gap-12 px-6 md:px-12 py-12 min-w-full">
        {rounds.map((round, roundIdx) => {
          const label = getRoundLabel(round, maxRound);
          const matches = matchesByRound[round].sort(
            (a, b) => a.posizione - b.posizione
          );

          return (
            <div
              key={round}
              className="flex flex-col"
              style={{ minWidth: 252 }}
            >
              <div className="mb-8 flex items-baseline justify-between border-b border-cream/15 pb-3">
                <div>
                  <div className="text-eyebrow text-cream/40 mb-1">
                    {label.secondary}
                  </div>
                  <div className="font-display text-2xl text-cream leading-none">
                    {label.primary}
                  </div>
                </div>
                <span className="text-stat text-xs text-cream/40">
                  {matches.length}/
                  <span className="text-cream/20">
                    {Math.pow(2, maxRound - round)}
                  </span>
                </span>
              </div>
              <div
                className="flex flex-col"
                style={{
                  gap: `${Math.pow(2, maxRound - round) * 1.1}rem`,
                  paddingTop:
                    roundIdx === 0
                      ? 0
                      : `${(Math.pow(2, maxRound - round) - 1) * 0.55}rem`,
                }}
              >
                {matches.map((match) => (
                  <BracketMatch key={match.id} match={match} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
