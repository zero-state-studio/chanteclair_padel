"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { X } from "lucide-react";
import type {
  GroupTeamWithStats,
  GroupWithTeams,
  PlayerWithMatches,
  TournamentWithMatches,
} from "@/types";

type Phase = "players" | "grid" | "merge" | "groups" | "done";

const PLAYER_DURATION_MS = 700;
const GRID_HOLD_MS = 700;
const MERGE_DURATION_MS = 4500;
const GROUPS_REVEAL_MS = 900;
const TEAMS_FLY_TOTAL_MS = 4200;

interface OrderedTeam {
  team: GroupTeamWithStats["team"];
  groupId: string;
  groupName: string;
  groupPosition: number;
  slotPos: number;
  color: string;
}

interface GironiAnimationProps {
  torneo: TournamentWithMatches;
  accent?: string;
  onClose: () => void;
}

function teamColor(idx: number, total: number): string {
  const hue = (idx * (360 / Math.max(total, 1))) % 360;
  return `oklch(0.72 0.2 ${hue})`;
}

function colsForTeams(n: number): number {
  if (n <= 2) return 2;
  if (n <= 4) return 2;
  if (n <= 6) return 3;
  if (n <= 9) return 3;
  if (n <= 12) return 4;
  return 4;
}

function colsForGroups(n: number): number {
  if (n <= 1) return 1;
  if (n <= 4) return 2;
  if (n <= 6) return 3;
  if (n <= 12) return 4;
  return 5;
}

const FLY_DIRS = ["left", "right", "top", "bottom"] as const;
type FlyDir = (typeof FLY_DIRS)[number];

function offscreenInit(dir: FlyDir) {
  switch (dir) {
    case "left":
      return { x: "-120vw", y: 0, rotate: -8, opacity: 0 };
    case "right":
      return { x: "120vw", y: 0, rotate: 8, opacity: 0 };
    case "top":
      return { x: 0, y: "-120vh", rotate: -4, opacity: 0 };
    case "bottom":
      return { x: 0, y: "120vh", rotate: 4, opacity: 0 };
  }
}

export function GironiAnimation({
  torneo,
  accent = "var(--color-yellow)",
  onClose,
}: GironiAnimationProps) {
  const [phase, setPhase] = useState<Phase>("players");
  const [playerIdx, setPlayerIdx] = useState(0);
  const [highlightedTeams, setHighlightedTeams] = useState<Set<string>>(
    new Set()
  );
  const [mergingTeams, setMergingTeams] = useState<Set<string>>(new Set());

  const orderedTeams = useMemo<OrderedTeam[]>(() => {
    const sortedGroups = [...torneo.groups].sort(
      (a, b) => a.posizione - b.posizione
    );
    const arr: Omit<OrderedTeam, "color">[] = [];
    for (const g of sortedGroups) {
      const sortedGT = [...g.groupTeams].sort((a, b) => {
        if (a.seed === null && b.seed === null) return 0;
        if (a.seed === null) return 1;
        if (b.seed === null) return -1;
        return a.seed - b.seed;
      });
      sortedGT.forEach((gt, slotPos) => {
        arr.push({
          team: gt.team,
          groupId: g.id,
          groupName: g.nome,
          groupPosition: g.posizione,
          slotPos,
        });
      });
    }
    const total = arr.length;
    return arr.map((t, i) => ({ ...t, color: teamColor(i, total) }));
  }, [torneo.groups]);

  const orderedPlayers = useMemo(() => {
    const arr: { player: PlayerWithMatches; team: OrderedTeam }[] = [];
    for (const t of orderedTeams) {
      arr.push({ player: t.team.player1, team: t });
      arr.push({ player: t.team.player2, team: t });
    }
    return arr;
  }, [orderedTeams]);

  const skip = useCallback(() => {
    setPhase("done");
  }, []);

  useEffect(() => {
    if (phase !== "done") return;
    const t = setTimeout(onClose, 350);
    return () => clearTimeout(t);
  }, [phase, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [skip]);

  useEffect(() => {
    if (phase !== "players") return;
    if (orderedPlayers.length === 0) {
      const t = setTimeout(() => setPhase("groups"), 0);
      return () => clearTimeout(t);
    }
    if (playerIdx >= orderedPlayers.length) {
      const t = setTimeout(() => setPhase("grid"), 250);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPlayerIdx((i) => i + 1), PLAYER_DURATION_MS);
    return () => clearTimeout(t);
  }, [phase, playerIdx, orderedPlayers.length]);

  useEffect(() => {
    if (phase !== "grid") return;
    const t = setTimeout(() => setPhase("merge"), GRID_HOLD_MS);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "merge") return;
    const teamsArr = orderedTeams;
    if (teamsArr.length === 0) {
      const t = setTimeout(() => setPhase("groups"), 0);
      return () => clearTimeout(t);
    }
    const highlightStagger = Math.min(
      240,
      Math.max(120, MERGE_DURATION_MS / (teamsArr.length * 3))
    );
    const mergeStart = highlightStagger * teamsArr.length + 350;
    const mergeStagger = 90;

    const timers: ReturnType<typeof setTimeout>[] = [];

    teamsArr.forEach((t, i) => {
      timers.push(
        setTimeout(() => {
          setHighlightedTeams((prev) => {
            const next = new Set(prev);
            next.add(t.team.id);
            return next;
          });
        }, i * highlightStagger)
      );
    });

    teamsArr.forEach((t, i) => {
      timers.push(
        setTimeout(() => {
          setMergingTeams((prev) => {
            const next = new Set(prev);
            next.add(t.team.id);
            return next;
          });
        }, mergeStart + i * mergeStagger)
      );
    });

    const finishAt = Math.max(
      MERGE_DURATION_MS,
      mergeStart + teamsArr.length * mergeStagger + 700
    );
    timers.push(setTimeout(() => setPhase("groups"), finishAt));

    return () => timers.forEach(clearTimeout);
  }, [phase, orderedTeams]);

  useEffect(() => {
    if (phase !== "groups") return;
    const t = setTimeout(
      () => setPhase("done"),
      GROUPS_REVEAL_MS + TEAMS_FLY_TOTAL_MS + 600
    );
    return () => clearTimeout(t);
  }, [phase]);

  const currentPlayer =
    orderedPlayers[Math.min(playerIdx, orderedPlayers.length - 1)] ?? null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: phase === "done" ? 0 : 1 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-[100] bg-court-deep overflow-hidden"
    >
      <div className="cc-stripes absolute inset-0 pointer-events-none opacity-30" />

      <button
        type="button"
        onClick={skip}
        className="absolute top-4 right-4 z-50 cc-mono text-paper/70 hover:text-paper bg-court-deep/70 border border-paper/15 rounded-md px-3 py-1.5 flex items-center gap-2 text-[11px] uppercase tracking-wider"
      >
        <X className="h-3.5 w-3.5" /> Salta
      </button>

      <div className="absolute top-4 left-4 z-50 cc-mono text-[11px] text-paper/50 uppercase tracking-wider">
        Sorteggio · {torneo.nome}
      </div>

      <div className="relative z-10 h-full w-full">
        <AnimatePresence mode="wait">
          {phase === "players" && currentPlayer && (
            <PlayersScrollPhase
              key="players"
              entry={currentPlayer}
              idx={playerIdx}
              total={orderedPlayers.length}
              accent={accent}
            />
          )}
          {(phase === "grid" || phase === "merge") && (
            <GridMergePhase
              key="gridmerge"
              orderedTeams={orderedTeams}
              highlightedTeams={highlightedTeams}
              mergingTeams={mergingTeams}
            />
          )}
          {phase === "groups" && (
            <GroupsRevealPhase
              key="groups"
              torneo={torneo}
              orderedTeams={orderedTeams}
              accent={accent}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function PlayersScrollPhase({
  entry,
  idx,
  total,
  accent,
}: {
  entry: { player: PlayerWithMatches; team: OrderedTeam };
  idx: number;
  total: number;
  accent: string;
}) {
  const { player, team } = entry;
  const safeIdx = Math.min(idx, total - 1);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 flex items-center justify-center px-6"
    >
      <div className="absolute top-20 left-1/2 -translate-x-1/2 cc-mono text-[10px] tracking-[0.4em] uppercase text-paper/40">
        Partecipanti · {safeIdx + 1} / {total}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={player.id + "-" + idx}
          initial={{ opacity: 0, x: 80, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -80, scale: 0.9 }}
          transition={{ duration: 0.35, ease: [0.22, 0.9, 0.34, 1] }}
          className="flex flex-col items-center text-center"
        >
          <div
            className="rounded-full overflow-hidden border-4 mb-6 bg-paper/5"
            style={{
              borderColor: team.color,
              boxShadow: `0 0 60px -10px ${team.color}`,
              width: "min(38vw, 360px)",
              height: "min(38vw, 360px)",
            }}
          >
            {player.fotoUrl ? (
              <Image
                src={player.fotoUrl}
                alt={`${player.nome} ${player.cognome}`}
                width={400}
                height={400}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center cc-display text-paper/80 text-[28vw] sm:text-[16vw] md:text-[12rem] leading-none">
                {player.nome[0]}
                {player.cognome[0]}
              </div>
            )}
          </div>
          <div
            className="cc-display leading-[0.9] text-paper text-[10vw] sm:text-[7vw] md:text-[5.5rem]"
            style={{ letterSpacing: "0.01em" }}
          >
            {player.nome}
          </div>
          <div
            className="cc-display leading-[0.9]"
            style={{
              color: accent,
              fontSize: "clamp(2.4rem, 8vw, 6rem)",
              letterSpacing: "0.02em",
            }}
          >
            {player.cognome}
          </div>
          <div
            className="cc-mono mt-4 text-[11px] tracking-[0.3em] uppercase"
            style={{ color: team.color }}
          >
            {team.team.nome}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

function GridMergePhase({
  orderedTeams,
  highlightedTeams,
  mergingTeams,
}: {
  orderedTeams: OrderedTeam[];
  highlightedTeams: Set<string>;
  mergingTeams: Set<string>;
}) {
  const cols = colsForTeams(orderedTeams.length);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 flex items-center justify-center p-6 md:p-12"
    >
      <div className="w-full max-w-[1500px]">
        <div className="cc-mono text-[10px] tracking-[0.4em] uppercase text-paper/40 mb-4 md:mb-6 text-center">
          — squadre formate
        </div>
        <div
          className="grid gap-3 md:gap-5"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {orderedTeams.map((t, i) => (
            <TeamFrame
              key={t.team.id}
              team={t}
              index={i}
              highlighted={highlightedTeams.has(t.team.id)}
              merged={mergingTeams.has(t.team.id)}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function TeamFrame({
  team,
  index,
  highlighted,
  merged,
}: {
  team: OrderedTeam;
  index: number;
  highlighted: boolean;
  merged: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      className="relative rounded-md border border-paper/10 overflow-hidden"
      style={{
        height: "clamp(160px, 22vh, 220px)",
        background: highlighted
          ? `color-mix(in oklch, ${team.color} 14%, transparent)`
          : "color-mix(in oklch, var(--color-night-deep) 60%, transparent)",
        boxShadow: highlighted
          ? `inset 0 0 0 1px ${team.color}, 0 0 30px -8px ${team.color}`
          : "none",
        transition: "background 0.45s ease, box-shadow 0.45s ease",
      }}
    >
      <AnimatePresence mode="wait">
        {!merged ? (
          <motion.div
            key="pair"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.45 }}
            className="absolute inset-0 grid grid-cols-2 gap-2 p-3"
          >
            <PlayerMini
              player={team.team.player1}
              color={team.color}
              align="right"
              merging={merged}
            />
            <PlayerMini
              player={team.team.player2}
              color={team.color}
              align="left"
              merging={merged}
            />
          </motion.div>
        ) : (
          <motion.div
            key="team"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.55,
              ease: [0.22, 0.9, 0.34, 1],
            }}
            className="absolute inset-0 flex items-center justify-center p-3"
          >
            <TeamCardCompact team={team} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PlayerMini({
  player,
  color,
  align,
  merging,
}: {
  player: PlayerWithMatches;
  color: string;
  align: "left" | "right";
  merging: boolean;
}) {
  return (
    <motion.div
      animate={
        merging
          ? { x: align === "right" ? "20%" : "-20%", opacity: 0, scale: 0.8 }
          : { x: 0, opacity: 1, scale: 1 }
      }
      transition={{ duration: 0.45 }}
      className="flex flex-col items-center justify-center text-center gap-2 min-w-0"
    >
      <div
        className="rounded-full overflow-hidden border-2 bg-paper/10"
        style={{
          width: "clamp(48px, 6vw, 72px)",
          height: "clamp(48px, 6vw, 72px)",
          borderColor: color,
        }}
      >
        {player.fotoUrl ? (
          <Image
            src={player.fotoUrl}
            alt=""
            width={96}
            height={96}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center cc-mono text-paper/80 text-sm">
            {player.nome[0]}
            {player.cognome[0]}
          </div>
        )}
      </div>
      <div className="text-paper text-xs md:text-sm font-semibold leading-tight truncate w-full px-1">
        {player.cognome}
      </div>
      <div className="text-paper/60 text-[10px] truncate w-full px-1">
        {player.nome}
      </div>
    </motion.div>
  );
}

function TeamCardCompact({ team }: { team: OrderedTeam }) {
  return (
    <div
      className="w-full h-full rounded-sm flex flex-col items-center justify-center text-center gap-2 px-3 py-2"
      style={{
        background: `linear-gradient(135deg, color-mix(in oklch, ${team.color} 22%, var(--color-night-deep)) 0%, var(--color-night-deep) 100%)`,
        border: `1px solid ${team.color}`,
        boxShadow: `0 0 20px -6px ${team.color}`,
      }}
    >
      <div className="flex -space-x-2">
        {[team.team.player1, team.team.player2].map((p) =>
          p.fotoUrl ? (
            <Image
              key={p.id}
              src={p.fotoUrl}
              alt=""
              width={56}
              height={56}
              className="rounded-full object-cover ring-2 bg-paper/10"
              style={{
                width: "clamp(40px, 5vw, 56px)",
                height: "clamp(40px, 5vw, 56px)",
                borderColor: team.color,
                boxShadow: `0 0 0 2px ${team.color}`,
              }}
            />
          ) : (
            <span
              key={p.id}
              className="rounded-full ring-2 bg-paper/10 flex items-center justify-center cc-mono text-paper text-xs"
              style={{
                width: "clamp(40px, 5vw, 56px)",
                height: "clamp(40px, 5vw, 56px)",
                boxShadow: `0 0 0 2px ${team.color}`,
              }}
            >
              {p.nome[0]}
              {p.cognome[0]}
            </span>
          )
        )}
      </div>
      <div
        className="cc-display text-paper leading-tight"
        style={{ fontSize: "clamp(0.9rem, 1.6vw, 1.3rem)" }}
      >
        {team.team.nome}
      </div>
      <div className="cc-mono text-[10px] text-paper/70 leading-tight">
        {team.team.player1.cognome} / {team.team.player2.cognome}
      </div>
    </div>
  );
}

function GroupsRevealPhase({
  torneo,
  orderedTeams,
  accent,
}: {
  torneo: TournamentWithMatches;
  orderedTeams: OrderedTeam[];
  accent: string;
}) {
  const sortedGroups = useMemo(
    () => [...torneo.groups].sort((a, b) => a.posizione - b.posizione),
    [torneo.groups]
  );
  const cols = colsForGroups(sortedGroups.length);

  const teamFlyOrder = useMemo(() => {
    const arr = orderedTeams.map((t, i) => ({ team: t, idx: i }));
    let seed = arr.reduce(
      (acc, e) => acc + e.team.team.id.charCodeAt(0) * (e.idx + 1),
      7
    );
    const rng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [orderedTeams]);

  const flyDelayByTeamId = useMemo(() => {
    const map = new Map<string, number>();
    const baseDelay = GROUPS_REVEAL_MS / 1000;
    const stagger = Math.min(
      0.35,
      Math.max(0.12, TEAMS_FLY_TOTAL_MS / 1000 / Math.max(1, teamFlyOrder.length))
    );
    teamFlyOrder.forEach((entry, i) => {
      map.set(entry.team.team.id, baseDelay + i * stagger);
    });
    return map;
  }, [teamFlyOrder]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 p-4 md:p-8 flex flex-col"
    >
      <div className="cc-mono text-[10px] tracking-[0.4em] uppercase text-paper/50 mb-3 text-center">
        — gironi
      </div>
      <div
        className="grid gap-3 md:gap-5 flex-1 min-h-0"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {sortedGroups.map((g, gi) => (
          <GroupSlot
            key={g.id}
            group={g}
            groupIndex={gi}
            orderedTeams={orderedTeams}
            flyDelayByTeamId={flyDelayByTeamId}
            accent={accent}
          />
        ))}
      </div>
    </motion.div>
  );
}

function GroupSlot({
  group,
  groupIndex,
  orderedTeams,
  flyDelayByTeamId,
  accent,
}: {
  group: GroupWithTeams;
  groupIndex: number;
  orderedTeams: OrderedTeam[];
  flyDelayByTeamId: Map<string, number>;
  accent: string;
}) {
  const teamsForGroup = useMemo(
    () =>
      orderedTeams
        .filter((t) => t.groupId === group.id)
        .sort((a, b) => a.slotPos - b.slotPos),
    [orderedTeams, group.id]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05 + groupIndex * 0.06 }}
      className="rounded-md border border-paper/10 bg-court-deep/60 p-3 md:p-4 flex flex-col gap-2 min-h-0"
    >
      <div className="flex items-center justify-between">
        <h3
          className="cc-display text-paper leading-none"
          style={{ fontSize: "clamp(1.4rem, 2.2vw, 2rem)" }}
        >
          Girone {group.nome}
        </h3>
        <span
          className="cc-mono text-[10px] uppercase"
          style={{ color: accent }}
        >
          {teamsForGroup.length} sq
        </span>
      </div>
      <div className="flex flex-col gap-2 flex-1 min-h-0">
        {teamsForGroup.map((t, i) => (
          <TeamFlyCard
            key={t.team.id}
            team={t}
            slotIndex={i}
            delay={flyDelayByTeamId.get(t.team.id) ?? 0}
          />
        ))}
      </div>
    </motion.div>
  );
}

function TeamFlyCard({
  team,
  slotIndex,
  delay,
}: {
  team: OrderedTeam;
  slotIndex: number;
  delay: number;
}) {
  const dir = FLY_DIRS[(slotIndex + Math.round(delay * 7)) % FLY_DIRS.length];
  return (
    <motion.div
      initial={offscreenInit(dir)}
      animate={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.22, 0.9, 0.34, 1],
      }}
      className="rounded-sm border flex items-center gap-2 p-2"
      style={{
        borderColor: team.color,
        background: `linear-gradient(135deg, color-mix(in oklch, ${team.color} 22%, var(--color-night-deep)) 0%, var(--color-night-deep) 100%)`,
        boxShadow: `0 0 18px -8px ${team.color}`,
      }}
    >
      <div className="flex -space-x-2 shrink-0">
        {[team.team.player1, team.team.player2].map((p) =>
          p.fotoUrl ? (
            <Image
              key={p.id}
              src={p.fotoUrl}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover ring-2 ring-court-deep bg-paper/10"
            />
          ) : (
            <span
              key={p.id}
              className="h-8 w-8 rounded-full ring-2 ring-court-deep bg-paper/10 flex items-center justify-center cc-mono text-[10px] text-paper/85"
            >
              {p.nome[0]}
              {p.cognome[0]}
            </span>
          )
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-paper text-xs md:text-sm font-semibold truncate">
          {team.team.nome}
        </div>
        <div className="text-paper/60 text-[10px] truncate">
          {team.team.player1.cognome} / {team.team.player2.cognome}
        </div>
      </div>
    </motion.div>
  );
}
