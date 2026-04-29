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

const PLAYER_DURATION_MS = 2000;
const GRID_HOLD_MS = 2500;
const MERGE_DURATION_MS = 4500;
const GROUPS_REVEAL_MS = 900;
const TEAMS_FLY_TOTAL_MS = 4200;
const FINAL_HOLD_MS = 10000;
const FADE_OUT_MS = 3000;
const SKIP_FADE_MS = 350;

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
  if (n <= 16) return 4;
  if (n <= 20) return 5;
  if (n <= 25) return 5;
  return 6;
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
  const [slowFade, setSlowFade] = useState(false);

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
    setSlowFade(false);
    setPhase("done");
  }, []);

  useEffect(() => {
    if (phase !== "done") return;
    const dur = slowFade ? FADE_OUT_MS : SKIP_FADE_MS;
    const t = setTimeout(onClose, dur);
    return () => clearTimeout(t);
  }, [phase, onClose, slowFade]);

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
    const t = setTimeout(() => {
      setSlowFade(true);
      setPhase("done");
    }, GROUPS_REVEAL_MS + TEAMS_FLY_TOTAL_MS + FINAL_HOLD_MS);
    return () => clearTimeout(t);
  }, [phase]);

  const currentPlayer =
    orderedPlayers[Math.min(playerIdx, orderedPlayers.length - 1)] ?? null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: phase === "done" ? 0 : 1 }}
      transition={{
        duration:
          phase === "done"
            ? (slowFade ? FADE_OUT_MS : SKIP_FADE_MS) / 1000
            : 0.35,
        ease: phase === "done" && slowFade ? "easeInOut" : "easeOut",
      }}
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
          {phase === "groups" ? (
            <GroupsRevealPhase
              key="groups"
              torneo={torneo}
              orderedTeams={orderedTeams}
              accent={accent}
            />
          ) : (
            <ScatterStage
              key="scatter"
              phase={phase}
              playerIdx={playerIdx}
              orderedPlayers={orderedPlayers}
              orderedTeams={orderedTeams}
              currentPlayer={currentPlayer}
              highlightedTeams={highlightedTeams}
              mergingTeams={mergingTeams}
              accent={accent}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

type ScatterPos = { x: number; y: number; rotate: number };
type TeamLayout = {
  cx: number;
  cy: number;
  frameW: number;
  frameH: number;
  slot0: { x: number; y: number };
  slot1: { x: number; y: number };
};

function computeScatterPositions(
  orderedPlayers: { player: PlayerWithMatches; team: OrderedTeam }[]
): ScatterPos[] {
  return orderedPlayers.map((entry, i) => {
    let seed =
      ((entry.player.id.charCodeAt(0) || 1) +
        (entry.player.id.charCodeAt(1) || 0) * 31) *
        (i + 1) +
      (entry.player.cognome.charCodeAt(0) || 1) * 13;
    const rng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    return {
      x: 8 + rng() * 84,
      y: 22 + rng() * 62,
      rotate: -10 + rng() * 20,
    };
  });
}

function computeTeamLayouts(orderedTeams: OrderedTeam[]): TeamLayout[] {
  const cols = colsForTeams(orderedTeams.length);
  const rows = Math.max(1, Math.ceil(orderedTeams.length / cols));
  const padX = 6;
  const padTop = 14;
  const padBottom = 8;
  const totalW = 100 - padX * 2;
  const totalH = 100 - padTop - padBottom;
  const frameW = totalW / cols;
  const frameH = totalH / rows;
  return orderedTeams.map((_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = padX + col * frameW + frameW / 2;
    const cy = padTop + row * frameH + frameH / 2;
    const innerOffsetX = frameW * 0.22;
    return {
      cx,
      cy,
      frameW,
      frameH,
      slot0: { x: cx - innerOffsetX, y: cy },
      slot1: { x: cx + innerOffsetX, y: cy },
    };
  });
}

function ScatterStage({
  phase,
  playerIdx,
  orderedPlayers,
  orderedTeams,
  currentPlayer,
  highlightedTeams,
  mergingTeams,
  accent,
}: {
  phase: Phase;
  playerIdx: number;
  orderedPlayers: { player: PlayerWithMatches; team: OrderedTeam }[];
  orderedTeams: OrderedTeam[];
  currentPlayer: { player: PlayerWithMatches; team: OrderedTeam } | null;
  highlightedTeams: Set<string>;
  mergingTeams: Set<string>;
  accent: string;
}) {
  const scatterPositions = useMemo(
    () => computeScatterPositions(orderedPlayers),
    [orderedPlayers]
  );
  const teamLayouts = useMemo(
    () => computeTeamLayouts(orderedTeams),
    [orderedTeams]
  );

  const playerLayout = useMemo(() => {
    const teamIdxMap = new Map<string, number>();
    orderedTeams.forEach((t, i) => teamIdxMap.set(t.team.id, i));
    return orderedPlayers.map((entry, i) => {
      const teamIdx = teamIdxMap.get(entry.team.team.id) ?? 0;
      const prev = orderedPlayers[i - 1];
      const slotInTeam: 0 | 1 =
        prev && prev.team.team.id === entry.team.team.id ? 1 : 0;
      return { teamIdx, slotInTeam };
    });
  }, [orderedPlayers, orderedTeams]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0"
    >
      {orderedPlayers.map((entry, i) => (
        <PlayerNode
          key={entry.player.id + "-" + i}
          entry={entry}
          globalIdx={i}
          phase={phase}
          playerIdx={playerIdx}
          scatter={scatterPositions[i]}
          team={teamLayouts[playerLayout[i].teamIdx]}
          slotInTeam={playerLayout[i].slotInTeam}
          highlighted={highlightedTeams.has(entry.team.team.id)}
          merged={mergingTeams.has(entry.team.team.id)}
        />
      ))}

      {orderedTeams.map((t, i) => (
        <TeamMergeCard
          key={t.team.id}
          team={t}
          layout={teamLayouts[i]}
          visible={mergingTeams.has(t.team.id)}
        />
      ))}

      <AnimatePresence>
        {phase === "players" && currentPlayer && (
          <ShowcaseLabel
            key={currentPlayer.player.id + "-" + playerIdx}
            entry={currentPlayer}
            accent={accent}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PlayerNode({
  entry,
  globalIdx,
  phase,
  playerIdx,
  scatter,
  team,
  slotInTeam,
  highlighted,
  merged,
}: {
  entry: { player: PlayerWithMatches; team: OrderedTeam };
  globalIdx: number;
  phase: Phase;
  playerIdx: number;
  scatter: ScatterPos;
  team: TeamLayout;
  slotInTeam: 0 | 1;
  highlighted: boolean;
  merged: boolean;
}) {
  const isShowcase = phase === "players" && globalIdx === playerIdx;
  const isPre = phase === "players" && globalIdx > playerIdx;
  const isMergedHidden = phase === "merge" && merged;

  let target: {
    left: string;
    top: string;
    scale: number;
    opacity: number;
    rotate: number;
  };

  if (isShowcase) {
    target = { left: "50%", top: "42%", scale: 1.4, opacity: 1, rotate: 0 };
  } else if (phase === "merge" && !merged) {
    const slot = slotInTeam === 0 ? team.slot0 : team.slot1;
    const fitScale = Math.min(team.frameW / 24, team.frameH / 32);
    target = {
      left: `${slot.x}%`,
      top: `${slot.y}%`,
      scale: Math.max(0.28, Math.min(0.55, fitScale)),
      opacity: 1,
      rotate: 0,
    };
  } else if (isPre) {
    target = {
      left: `${scatter.x}%`,
      top: `${scatter.y}%`,
      scale: 0.32,
      opacity: 0,
      rotate: scatter.rotate,
    };
  } else if (isMergedHidden) {
    target = {
      left: `${scatter.x}%`,
      top: `${scatter.y}%`,
      scale: 0.4,
      opacity: 0,
      rotate: scatter.rotate,
    };
  } else {
    target = {
      left: `${scatter.x}%`,
      top: `${scatter.y}%`,
      scale: 0.42,
      opacity: 1,
      rotate: scatter.rotate,
    };
  }

  return (
    <motion.div
      style={{ position: "absolute", x: "-50%", y: "-50%" }}
      initial={false}
      animate={target}
      transition={{ duration: 0.65, ease: [0.22, 0.9, 0.34, 1] }}
    >
      <CompactPlayerCard
        player={entry.player}
        color={entry.team.color}
        highlighted={highlighted || isShowcase}
        showLabel={!isShowcase}
      />
    </motion.div>
  );
}

function CompactPlayerCard({
  player,
  color,
  highlighted,
  showLabel,
}: {
  player: PlayerWithMatches;
  color: string;
  highlighted: boolean;
  showLabel: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="rounded-full overflow-hidden border-[3px] bg-paper/10"
        style={{
          width: 200,
          height: 200,
          borderColor: highlighted
            ? color
            : "color-mix(in oklch, var(--color-paper) 22%, transparent)",
          boxShadow: highlighted
            ? `0 0 30px -4px ${color}`
            : "0 0 18px -8px oklch(0 0 0 / 0.55)",
          transition: "border-color 0.45s ease, box-shadow 0.45s ease",
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
          <div
            className="h-full w-full flex items-center justify-center cc-display text-paper/85"
            style={{ fontSize: 92, lineHeight: 1 }}
          >
            {player.nome[0]}
            {player.cognome[0]}
          </div>
        )}
      </div>
      {showLabel && (
        <div className="text-center max-w-[220px]">
          <div
            className="text-paper font-semibold leading-tight truncate"
            style={{ fontSize: 22 }}
          >
            {player.cognome}
          </div>
          <div
            className="text-paper/65 leading-tight truncate"
            style={{ fontSize: 14 }}
          >
            {player.nome}
          </div>
        </div>
      )}
    </div>
  );
}

function TeamMergeCard({
  team,
  layout,
  visible,
}: {
  team: OrderedTeam;
  layout: TeamLayout;
  visible: boolean;
}) {
  return (
    <motion.div
      initial={false}
      animate={{
        opacity: visible ? 1 : 0,
        scale: visible ? 1 : 0.6,
      }}
      transition={{ duration: 0.55, ease: [0.22, 0.9, 0.34, 1] }}
      style={{
        position: "absolute",
        left: `${layout.cx}%`,
        top: `${layout.cy}%`,
        x: "-50%",
        y: "-50%",
        width: `${layout.frameW * 0.92}%`,
        height: `${layout.frameH * 0.86}%`,
        pointerEvents: "none",
      }}
    >
      <div
        className="w-full h-full rounded-md flex flex-col items-center justify-center text-center gap-2 px-3 py-2"
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
                width={64}
                height={64}
                className="rounded-full object-cover bg-paper/10"
                style={{
                  width: "clamp(36px, 4.5vw, 56px)",
                  height: "clamp(36px, 4.5vw, 56px)",
                  boxShadow: `0 0 0 2px ${team.color}`,
                }}
              />
            ) : (
              <span
                key={p.id}
                className="rounded-full bg-paper/10 flex items-center justify-center cc-mono text-paper text-xs"
                style={{
                  width: "clamp(36px, 4.5vw, 56px)",
                  height: "clamp(36px, 4.5vw, 56px)",
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
        <div className="cc-mono text-[10px] text-paper/70 leading-tight truncate max-w-full">
          {team.team.player1.cognome} / {team.team.player2.cognome}
        </div>
      </div>
    </motion.div>
  );
}

function ShowcaseLabel({
  entry,
  accent,
}: {
  entry: { player: PlayerWithMatches; team: OrderedTeam };
  accent: string;
}) {
  const { player, team } = entry;
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35, ease: [0.22, 0.9, 0.34, 1] }}
      className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none"
      style={{ top: "70%", width: "min(90vw, 1100px)" }}
    >
      <div
        className="cc-display leading-[0.9] text-paper"
        style={{
          fontSize: "clamp(2.4rem, 7vw, 5rem)",
          letterSpacing: "0.01em",
        }}
      >
        {player.nome}
      </div>
      <div
        className="cc-display leading-[0.9]"
        style={{
          color: accent,
          fontSize: "clamp(2.6rem, 8vw, 6rem)",
          letterSpacing: "0.02em",
        }}
      >
        {player.cognome}
      </div>
      <div
        className="cc-mono mt-3 text-[11px] tracking-[0.3em] uppercase"
        style={{ color: team.color }}
      >
        {team.team.nome}
      </div>
    </motion.div>
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
