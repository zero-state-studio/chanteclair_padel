"use client";

import { cn } from "@/lib/utils";
import type { MatchWithTeams, TeamWithPlayers, PlayerWithMatches } from "@/types";

type Visual = "live" | "done" | "next" | "pending";

interface BracketMatchProps {
  match: MatchWithTeams;
  big?: boolean;
  accent: string;
  focused: boolean;
  onFocus: (code: string | null) => void;
  code: string;
}

function MiniAvatar({
  player,
  size = 18,
}: {
  player: PlayerWithMatches;
  size?: number;
}) {
  const initials = `${player.nome[0] ?? ""}${player.cognome[0] ?? ""}`.toUpperCase();
  return player.fotoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={player.fotoUrl}
      alt=""
      className="rounded-full object-cover shrink-0"
      style={{
        width: size,
        height: size,
        background: "oklch(0.4 0.04 255)",
        boxShadow: "0 0 0 1px oklch(0.32 0.05 255)",
      }}
    />
  ) : (
    <span
      className="rounded-full inline-flex items-center justify-center shrink-0 cc-mono"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.45),
        letterSpacing: 0,
        background: "oklch(0.4 0.04 255)",
        color: "oklch(0.85 0.02 255)",
        boxShadow: "0 0 0 1px oklch(0.32 0.05 255)",
      }}
    >
      {initials}
    </span>
  );
}

export function BracketMatch({
  match,
  big = false,
  accent,
  focused,
  onFocus,
  code,
}: BracketMatchProps) {
  const visual = computeVisual(match);
  const isLive = visual === "live";
  const isDone = visual === "done";
  const isNext = visual === "next";
  const isPending = visual === "pending";

  const team1Won =
    isDone && match.winner !== null && match.team1?.id === match.winner?.id;
  const team2Won =
    isDone && match.winner !== null && match.team2?.id === match.winner?.id;

  const score = match.punteggio ?? (isPending ? "—" : "—");
  const orario = formatOrario(match.iniziataAt);

  return (
    <div
      onMouseEnter={() => onFocus(code)}
      onMouseLeave={() => onFocus(null)}
      onClick={() => onFocus(focused ? null : code)}
      className="cursor-pointer transition-all"
      style={{
        background: isLive
          ? "oklch(0.30 0.05 255)"
          : focused
          ? "oklch(0.32 0.05 255)"
          : "oklch(0.24 0.05 255)",
        border:
          isLive || focused
            ? `1.5px solid ${accent}`
            : "1px solid oklch(0.32 0.05 255)",
        padding: big ? "20px 28px" : "5px 10px",
        opacity: isDone ? 0.65 : 1,
        boxShadow: isLive
          ? `0 0 0 4px oklch(0.30 0.05 255), 0 0 24px ${accent}55`
          : "none",
        position: "relative",
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-1">
        <span
          className="cc-mono"
          style={{ fontSize: 9, color: "oklch(0.7 0.02 255)" }}
        >
          {code}
          {match.team1 || match.team2 ? "" : " · —"}
        </span>
        {isLive && (
          <span
            className="cc-mono inline-flex items-center gap-1"
            style={{ fontSize: 9, color: "var(--color-yellow)" }}
          >
            <span
              className="inline-block"
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--color-yellow)",
                animation: "cc-live-pulse 1.4s ease-in-out infinite",
              }}
            />
            LIVE
          </span>
        )}
        {isDone && (
          <span
            className="cc-mono"
            style={{ fontSize: 9, color: "oklch(0.7 0.18 140)" }}
          >
            ✓
          </span>
        )}
        {isNext && orario && (
          <span
            className="cc-mono"
            style={{ fontSize: 9, color: "oklch(0.6 0.02 255)" }}
          >
            {orario}
          </span>
        )}
      </div>

      <TeamRow
        team={match.team1}
        big={big}
        isWinner={team1Won}
        isDimmed={isDone && !team1Won}
      />
      <div
        style={{
          height: 1,
          background: "oklch(0.32 0.05 255)",
          margin: big ? "14px 0" : "4px 0",
        }}
      />
      <TeamRow
        team={match.team2}
        big={big}
        isWinner={team2Won}
        isDimmed={isDone && !team2Won}
      />

      {(isLive || isDone) && match.punteggio && (
        <div
          className="cc-mono cc-num mt-1.5"
          style={{
            fontSize: 10,
            color: isLive ? "var(--color-yellow)" : "oklch(0.7 0.02 255)",
            letterSpacing: "0.06em",
          }}
        >
          {score}
        </div>
      )}
    </div>
  );
}

function TeamRow({
  team,
  big,
  isWinner,
  isDimmed,
}: {
  team: TeamWithPlayers | null;
  big: boolean;
  isWinner: boolean;
  isDimmed: boolean;
}) {
  if (!team) {
    return (
      <div
        className="cc-display truncate flex items-center gap-2"
        style={{
          fontSize: big ? 36 : 13,
          color: "oklch(0.55 0.02 255)",
          lineHeight: 1.05,
          letterSpacing: "0.01em",
        }}
      >
        <span style={{ opacity: 0.6 }}>—</span>
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-center gap-2 min-w-0")}
      style={{
        color: isDimmed ? "oklch(0.55 0.02 255)" : "var(--color-paper)",
      }}
    >
      <span className="flex -space-x-1.5 shrink-0">
        <MiniAvatar player={team.player1} size={big ? 36 : 18} />
        <MiniAvatar player={team.player2} size={big ? 36 : 18} />
      </span>
      <span
        className="cc-display truncate min-w-0"
        style={{
          fontSize: big ? 36 : 13,
          lineHeight: 1.05,
          letterSpacing: "0.01em",
          fontWeight: isWinner ? 500 : 400,
        }}
      >
        {team.player1.cognome} / {team.player2.cognome}
      </span>
    </div>
  );
}

function computeVisual(match: MatchWithTeams): Visual {
  if (match.stato === "IN_CORSO") return "live";
  if (match.stato === "COMPLETATA") return "done";
  if (!match.team1 || !match.team2) return "pending";
  return "next";
}

function formatOrario(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}
