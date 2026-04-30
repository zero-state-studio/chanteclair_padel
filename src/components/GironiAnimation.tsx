"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import type {
  GroupTeamWithStats,
  GroupWithTeams,
  PlayerWithMatches,
  TournamentWithMatches,
} from "@/types";

type Phase = "players" | "grid" | "merge" | "groups" | "done";

const PLAYER_DURATION_MS = 3300; // durata animazione singolo giocatore
const GRID_HOLD_MS = 2500;
const MERGE_DURATION_MS = 5000;
const GROUPS_REVEAL_MS = 900;
const TEAMS_FLY_TOTAL_MS = 9000;
const TEAMS_FLY_CARD_DURATION_S = 1.2;
const FINAL_HOLD_MS = 7000;
const GATHER_MS = 2400;
const FADE_OUT_MS = 3000;
const SKIP_FADE_MS = 350;
const TEAMS_HOLD_MS = 4000;
const MERGE_STAGGER_MS = 320;
const TEAM_CARD_FADE_MS = 1100;
const PLAYER_EXIT_MS = 700;

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

const TEAM_COLOR = "var(--color-yellow)";

function colsForPlayers(n: number): number {
  if (n <= 2) return 2;
  if (n <= 4) return 2;
  if (n <= 8) return 4;
  if (n <= 12) return 4;
  if (n <= 18) return 6;
  if (n <= 24) return 6;
  if (n <= 32) return 8;
  if (n <= 40) return 8;
  return 10;
}

function shuffleSeeded<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed || 1;
  const rng = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
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
    return arr.map((t) => ({ ...t, color: TEAM_COLOR }));
  }, [torneo.groups]);

  const orderedPlayers = useMemo(() => {
    const arr: { player: PlayerWithMatches; team: OrderedTeam }[] = [];
    for (const t of orderedTeams) {
      arr.push({ player: t.team.player1, team: t });
      arr.push({ player: t.team.player2, team: t });
    }
    return arr;
  }, [orderedTeams]);

  const shuffledPlayers = useMemo(() => {
    const seed = orderedPlayers.reduce(
      (acc, e, i) => acc + (e.player.id.charCodeAt(0) || 1) * (i + 3),
      11
    );
    return shuffleSeeded(orderedPlayers, seed);
  }, [orderedPlayers]);

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
    if (shuffledPlayers.length === 0) {
      const t = setTimeout(() => setPhase("groups"), 0);
      return () => clearTimeout(t);
    }
    if (playerIdx >= shuffledPlayers.length) {
      const t = setTimeout(() => setPhase("grid"), 250);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPlayerIdx((i) => i + 1), PLAYER_DURATION_MS);
    return () => clearTimeout(t);
  }, [phase, playerIdx, shuffledPlayers.length]);

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
    const gatherDelay = GATHER_MS;
    const highlightStagger = Math.min(
      240,
      Math.max(120, MERGE_DURATION_MS / (teamsArr.length * 3))
    );
    const mergeStart =
      gatherDelay + highlightStagger * teamsArr.length + 350;
    const mergeStagger = MERGE_STAGGER_MS;

    const timers: ReturnType<typeof setTimeout>[] = [];

    teamsArr.forEach((t, i) => {
      timers.push(
        setTimeout(() => {
          setHighlightedTeams((prev) => {
            const next = new Set(prev);
            next.add(t.team.id);
            return next;
          });
        }, gatherDelay + i * highlightStagger)
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

    const lastMergeAt =
      mergeStart + teamsArr.length * mergeStagger + TEAM_CARD_FADE_MS;
    const finishAt = Math.max(
      MERGE_DURATION_MS,
      lastMergeAt + TEAMS_HOLD_MS
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
    shuffledPlayers[Math.min(playerIdx, shuffledPlayers.length - 1)] ?? null;

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
        aria-label="Chiudi animazione"
        className="absolute inset-0 z-40 cursor-pointer bg-transparent"
      />

      <div className="relative z-10 h-full w-full pointer-events-none">
        <AnimatePresence mode="wait">
          {phase === "players" && currentPlayer && (
            <PlayersScrollPhase
              key="players"
              entry={currentPlayer}
              idx={playerIdx}
              accent={accent}
            />
          )}
          {(phase === "grid" || phase === "merge") && (
            <FlatGridPhase
              key="flatgrid"
              phase={phase}
              shuffledPlayers={shuffledPlayers}
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
}: {
  entry: { player: PlayerWithMatches; team: OrderedTeam };
  idx: number;
  accent: string;
}) {
  const { player } = entry;
  const yellow = "var(--color-yellow)";
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 flex items-center justify-center px-6"
    >
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
              borderColor: yellow,
              boxShadow: `0 0 60px -10px ${yellow}`,
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
              color: yellow,
              fontSize: "clamp(2.4rem, 8vw, 6rem)",
              letterSpacing: "0.02em",
            }}
          >
            {player.cognome}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

function FlatGridPhase({
  phase,
  shuffledPlayers,
  orderedTeams,
  highlightedTeams,
  mergingTeams,
}: {
  phase: Phase;
  shuffledPlayers: { player: PlayerWithMatches; team: OrderedTeam }[];
  orderedTeams: OrderedTeam[];
  highlightedTeams: Set<string>;
  mergingTeams: Set<string>;
}) {
  const cols = colsForPlayers(shuffledPlayers.length);

  const playerItems = useMemo(() => {
    if (phase === "grid") {
      return shuffledPlayers.map((entry) => ({
        key: entry.player.id,
        entry,
        teamId: entry.team.team.id,
      }));
    }
    const playerById = new Map<
      string,
      { player: PlayerWithMatches; team: OrderedTeam }
    >();
    for (const e of shuffledPlayers) playerById.set(e.player.id, e);
    const list: { key: string; entry: typeof shuffledPlayers[number]; teamId: string }[] = [];
    for (const t of orderedTeams) {
      const e1 = playerById.get(t.team.player1.id);
      const e2 = playerById.get(t.team.player2.id);
      if (e1) list.push({ key: e1.player.id, entry: e1, teamId: t.team.id });
      if (e2) list.push({ key: e2.player.id, entry: e2, teamId: t.team.id });
    }
    return list;
  }, [phase, shuffledPlayers, orderedTeams]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 flex flex-col p-4 md:p-8 pt-6 md:pt-10"
    >
      <div className="relative flex-1 min-h-0">
        <div
          className="absolute inset-0 grid gap-2 md:gap-3"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridAutoRows: "1fr",
          }}
        >
          {playerItems.map((item) => {
            const highlighted = highlightedTeams.has(item.teamId);
            const merged = mergingTeams.has(item.teamId);
            return (
              <motion.div
                key={item.key}
                layout
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{
                  opacity: merged ? 0 : 1,
                  scale: merged ? 0.7 : 1,
                }}
                transition={{
                  duration: PLAYER_EXIT_MS / 1000,
                  layout: {
                    duration: GATHER_MS / 1000,
                    ease: [0.22, 0.9, 0.34, 1],
                  },
                }}
                className="min-h-0 relative"
              >
                <PlayerCell
                  player={item.entry.player}
                  color={item.entry.team.color}
                  highlighted={highlighted}
                />
              </motion.div>
            );
          })}
        </div>

        {phase === "merge" && (
          <div
            className="absolute inset-0 grid gap-2 md:gap-3 pointer-events-none"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gridAutoRows: "1fr",
            }}
          >
            {orderedTeams.map((t, i) => {
              const merged = mergingTeams.has(t.team.id);
              const colStart = ((i * 2) % cols) + 1;
              const rowStart = Math.floor((i * 2) / cols) + 1;
              return (
                <motion.div
                  key={`team-${t.team.id}`}
                  initial={false}
                  animate={{
                    opacity: merged ? 1 : 0,
                    scale: merged ? 1 : 0.6,
                  }}
                  transition={{
                    duration: TEAM_CARD_FADE_MS / 1000,
                    ease: [0.22, 0.9, 0.34, 1],
                  }}
                  className="min-h-0"
                  style={{
                    gridColumn: `${colStart} / span 2`,
                    gridRow: rowStart,
                  }}
                >
                  <TeamMergedCell team={t} />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function PlayerCell({
  player,
  color,
  highlighted,
}: {
  player: PlayerWithMatches;
  color: string;
  highlighted: boolean;
}) {
  return (
    <div
      className="w-full h-full rounded-md flex flex-col items-center justify-center text-center gap-1 p-2"
      style={{
        background: highlighted
          ? `color-mix(in oklch, ${color} 14%, transparent)`
          : "color-mix(in oklch, var(--color-night-deep) 60%, transparent)",
        border: highlighted
          ? `1px solid ${color}`
          : "1px solid color-mix(in oklch, var(--color-paper) 10%, transparent)",
        boxShadow: highlighted ? `0 0 30px -8px ${color}` : "none",
        transition:
          "background 0.45s ease, border-color 0.45s ease, box-shadow 0.45s ease",
      }}
    >
      <div
        className="rounded-full overflow-hidden border-2 bg-paper/10"
        style={{
          width: "clamp(36px, 5vw, 76px)",
          height: "clamp(36px, 5vw, 76px)",
          borderColor: highlighted
            ? color
            : "color-mix(in oklch, var(--color-paper) 18%, transparent)",
          transition: "border-color 0.45s ease",
        }}
      >
        {player.fotoUrl ? (
          <Image
            src={player.fotoUrl}
            alt=""
            width={120}
            height={120}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center cc-mono text-paper/85 text-sm">
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
    </div>
  );
}

function TeamMergedCell({ team }: { team: OrderedTeam }) {
  return (
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
      0.6,
      Math.max(0.22, TEAMS_FLY_TOTAL_MS / 1000 / Math.max(1, teamFlyOrder.length))
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
        duration: TEAMS_FLY_CARD_DURATION_S,
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
