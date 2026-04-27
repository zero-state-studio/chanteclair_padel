"use client";

import { computeStandings } from "@/lib/gironi";
import type { GroupWithTeams, MatchWithTeams } from "@/types";

interface GironiViewProps {
  groups: GroupWithTeams[];
  matches: MatchWithTeams[];
  accent?: string;
}

export function GironiView({
  groups,
  matches,
  accent = "var(--color-yellow)",
}: GironiViewProps) {
  if (groups.length === 0) {
    return (
      <section className="relative z-[2] flex flex-1 items-center justify-center px-6">
        <div className="text-center">
          <div
            className="cc-display"
            style={{ fontSize: 60, color: "oklch(0.55 0.02 255)" }}
          >
            Gironi non ancora sorteggiati
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative z-[2] flex-1 px-3 md:px-8 py-3 overflow-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((g) => {
          const groupMatches = matches.filter((m) => m.groupId === g.id);
          const standings = computeStandings(
            g.groupTeams.map((gt) => ({
              groupTeamId: gt.id,
              teamId: gt.teamId,
              punti: gt.punti,
              gameVinti: gt.gameVinti,
              gamePersi: gt.gamePersi,
              matchGiocate: gt.matchGiocate,
            })),
            groupMatches.map((m) => ({
              team1Id: m.team1?.id ?? "",
              team2Id: m.team2?.id ?? "",
              winnerId: m.winner?.id ?? null,
            }))
          );

          return (
            <div
              key={g.id}
              className="rounded-md border bg-court-deep/60 p-3 md:p-4"
              style={{ borderColor: "oklch(0.32 0.05 255)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="cc-display text-xl text-paper">Girone {g.nome}</h3>
                <span
                  className="cc-mono text-[10px]"
                  style={{ color: "oklch(0.7 0.02 255)" }}
                >
                  {g.groupTeams.length} squadre
                </span>
              </div>

              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr
                    className="cc-mono"
                    style={{
                      fontSize: 10,
                      color: "oklch(0.7 0.02 255)",
                      borderBottom: "1px solid oklch(0.32 0.05 255)",
                    }}
                  >
                    <th className="text-left py-1.5">#</th>
                    <th className="text-left">Squadra</th>
                    <th className="text-center w-8">PG</th>
                    <th className="text-center w-8">PT</th>
                    <th className="text-center w-12">Game</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s) => {
                    const gt = g.groupTeams.find((x) => x.id === s.groupTeamId)!;
                    const medalColor =
                      s.posizione === 1
                        ? "var(--color-yellow)"
                        : s.posizione === 2
                        ? "oklch(0.85 0.02 255)"
                        : "oklch(0.65 0.08 30)";
                    return (
                      <tr
                        key={gt.id}
                        style={{
                          borderBottom: "1px solid oklch(0.25 0.04 255)",
                        }}
                      >
                        <td
                          className="py-1.5 cc-mono font-semibold"
                          style={{ color: medalColor }}
                        >
                          {s.posizione}
                        </td>
                        <td className="text-paper">
                          {gt.team.nome}
                          {gt.seed != null && (
                            <span
                              className="ml-1.5 cc-mono"
                              style={{
                                fontSize: 9,
                                color: accent,
                              }}
                            >
                              [{gt.seed}]
                            </span>
                          )}
                        </td>
                        <td className="text-center text-paper/80 cc-mono text-xs">
                          {s.matchGiocate}
                        </td>
                        <td className="text-center text-paper cc-mono font-semibold">
                          {s.punti}
                        </td>
                        <td className="text-center text-paper/70 cc-mono text-xs">
                          {s.gameVinti}-{s.gamePersi}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {groupMatches.length > 0 && (
                <div className="mt-4 pt-3 border-t border-cream/10 space-y-1.5">
                  {groupMatches
                    .sort((a, b) => a.posizione - b.posizione)
                    .map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between text-xs gap-2"
                      >
                        <span className="text-paper/70 truncate flex-1">
                          {m.team1?.nome ?? "—"} vs {m.team2?.nome ?? "—"}
                        </span>
                        {m.stato === "COMPLETATA" && m.punteggio ? (
                          <span className="cc-mono text-paper">{m.punteggio}</span>
                        ) : m.stato === "IN_CORSO" ? (
                          <span
                            className="cc-mono text-[10px]"
                            style={{ color: accent }}
                          >
                            LIVE
                          </span>
                        ) : (
                          <span className="cc-mono text-paper/40 text-[10px]">
                            ATTESA
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
