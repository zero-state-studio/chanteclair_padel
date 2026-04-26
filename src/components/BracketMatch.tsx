"use client";

import { cn } from "@/lib/utils";
import type { MatchWithTeams, TeamWithPlayers, PlayerWithMatches } from "@/types";

type Visual = "live" | "done" | "next" | "pending";

export type MatchSize = "xs" | "sm" | "md" | "lg" | "xl";

interface SizeSpec {
  font: number;
  avatar: number;
  padX: number;
  padY: number;
  divider: number;
  scoreFont: number;
  metaFont: number;
  gap: number;
}

const SIZE_MAP: Record<MatchSize, SizeSpec> = {
  xs: { font: 11, avatar: 14, padX: 8, padY: 5, divider: 3, scoreFont: 10, metaFont: 9, gap: 6 },
  sm: { font: 14, avatar: 18, padX: 10, padY: 7, divider: 5, scoreFont: 11, metaFont: 9, gap: 7 },
  md: { font: 20, avatar: 24, padX: 14, padY: 11, divider: 8, scoreFont: 13, metaFont: 10, gap: 9 },
  lg: { font: 28, avatar: 32, padX: 20, padY: 16, divider: 11, scoreFont: 16, metaFont: 10, gap: 11 },
  xl: { font: 40, avatar: 44, padX: 28, padY: 22, divider: 14, scoreFont: 22, metaFont: 11, gap: 14 },
};

interface BracketMatchProps {
  match: MatchWithTeams;
  size?: MatchSize;
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
  size = "sm",
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
  const spec = SIZE_MAP[size];

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
        padding: `${spec.padY}px ${spec.padX}px`,
        opacity: isDone ? 0.65 : 1,
        boxShadow: isLive
          ? `0 0 0 4px oklch(0.30 0.05 255), 0 0 24px ${accent}55`
          : "none",
        position: "relative",
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: Math.max(2, Math.round(spec.padY * 0.3)) }}
      >
        <span
          className="cc-mono"
          style={{ fontSize: spec.metaFont, color: "oklch(0.7 0.02 255)" }}
        >
          {code}
          {match.team1 || match.team2 ? "" : " · —"}
        </span>
        {isLive && (
          <span
            className="cc-mono inline-flex items-center gap-1"
            style={{ fontSize: spec.metaFont, color: "var(--color-yellow)" }}
          >
            <span
              className="inline-block"
              style={{
                width: Math.max(5, Math.round(spec.metaFont * 0.7)),
                height: Math.max(5, Math.round(spec.metaFont * 0.7)),
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
            style={{ fontSize: spec.metaFont, color: "oklch(0.7 0.18 140)" }}
          >
            ✓
          </span>
        )}
        {isNext && orario && (
          <span
            className="cc-mono"
            style={{ fontSize: spec.metaFont, color: "oklch(0.6 0.02 255)" }}
          >
            {orario}
          </span>
        )}
      </div>

      <TeamRow
        team={match.team1}
        spec={spec}
        isWinner={team1Won}
        isDimmed={isDone && !team1Won}
      />
      <div
        style={{
          height: 1,
          background: "oklch(0.32 0.05 255)",
          margin: `${spec.divider}px 0`,
        }}
      />
      <TeamRow
        team={match.team2}
        spec={spec}
        isWinner={team2Won}
        isDimmed={isDone && !team2Won}
      />

      {(isLive || isDone) && match.punteggio && (
        <div
          className="cc-mono cc-num"
          style={{
            marginTop: Math.max(3, Math.round(spec.padY * 0.35)),
            fontSize: spec.scoreFont,
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
  spec,
  isWinner,
  isDimmed,
}: {
  team: TeamWithPlayers | null;
  spec: SizeSpec;
  isWinner: boolean;
  isDimmed: boolean;
}) {
  if (!team) {
    return (
      <div
        className="cc-display truncate flex items-center"
        style={{
          gap: spec.gap,
          fontSize: spec.font,
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
      className={cn("flex items-center min-w-0")}
      style={{
        gap: spec.gap,
        color: isDimmed ? "oklch(0.55 0.02 255)" : "var(--color-paper)",
      }}
    >
      <span className="flex -space-x-1.5 shrink-0">
        <MiniAvatar player={team.player1} size={spec.avatar} />
        <MiniAvatar player={team.player2} size={spec.avatar} />
      </span>
      <span
        className="cc-display truncate min-w-0"
        style={{
          fontSize: spec.font,
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
