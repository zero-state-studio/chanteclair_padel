import type { Team } from "@prisma/client";

export type GroupDraft = {
  nome: string;
  posizione: number;
  teams: { teamId: string; seed: number | null }[];
};

export type GroupMatchDraft = {
  groupPosizione: number;
  posizione: number;
  team1Id: string;
  team2Id: string;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function nomeGirone(posizione: number): string {
  if (posizione < 26) return ALPHABET[posizione];
  return `${ALPHABET[Math.floor(posizione / 26) - 1]}${ALPHABET[posizione % 26]}`;
}

/**
 * Pianifica composizione gironi.
 * Regola: gironi da 3 fissi. Se N % 3 != 0:
 *   - r=2 → +1 girone da 2
 *   - r=1 → -1 girone da 3, +2 gironi da 2
 *   - N<2  → errore
 *   - N=2  → 1 girone da 2
 */
export function calcolaSizesGironi(numTeams: number): number[] {
  if (numTeams < 2) {
    throw new Error("Servono almeno 2 squadre");
  }
  if (numTeams === 2) return [2];
  const a = Math.floor(numTeams / 3);
  const r = numTeams - 3 * a;
  if (r === 0) return Array(a).fill(3);
  if (r === 2) return [...Array(a).fill(3), 2];
  // r === 1
  return [...Array(a - 1).fill(3), 2, 2];
}

/**
 * Distribuisci squadre nei gironi con seeding "snake".
 * Teste di serie ordinate per livello asc (1=top) prendono 1 slot per girone in snake.
 * Resto distribuito casuale a riempire i gironi.
 */
export function distribuisciGironi(squadre: Team[]): GroupDraft[] {
  const sizes = calcolaSizesGironi(squadre.length);
  const numGroups = sizes.length;

  const teste = squadre
    .filter((s) => s.livello > 0)
    .sort((a, b) => a.livello - b.livello);
  const altri = shuffle(squadre.filter((s) => s.livello === 0));

  const gironi: GroupDraft[] = sizes.map((_, i) => ({
    nome: nomeGirone(i),
    posizione: i,
    teams: [],
  }));

  // Snake distribution teste di serie
  let idx = 0;
  let direction = 1;
  let cursor = 0;
  for (const t of teste) {
    if (gironi[cursor].teams.length < sizes[cursor]) {
      gironi[cursor].teams.push({ teamId: t.id, seed: idx + 1 });
    }
    idx++;
    if (numGroups === 1) {
      cursor = 0;
    } else {
      cursor += direction;
      if (cursor === numGroups) {
        cursor = numGroups - 1;
        direction = -1;
      } else if (cursor < 0) {
        cursor = 0;
        direction = 1;
      }
    }
  }

  // Riempi con non-teste random rispettando size girone
  let altriIdx = 0;
  for (let g = 0; g < numGroups; g++) {
    while (gironi[g].teams.length < sizes[g] && altriIdx < altri.length) {
      gironi[g].teams.push({ teamId: altri[altriIdx].id, seed: null });
      altriIdx++;
    }
  }

  return gironi;
}

/**
 * Round-robin match per ogni girone.
 * Girone da 3: 3 match (1v2, 1v3, 2v3)
 * Girone da 2: 1 match (1v2)
 */
export function generaMatchGironi(gironi: GroupDraft[]): GroupMatchDraft[] {
  const matches: GroupMatchDraft[] = [];
  for (const g of gironi) {
    const teams = g.teams;
    let pos = 0;
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({
          groupPosizione: g.posizione,
          posizione: pos++,
          team1Id: teams[i].teamId,
          team2Id: teams[j].teamId,
        });
      }
    }
  }
  return matches;
}

// =========================================================
// CLASSIFICA GIRONE
// =========================================================

export type StandingEntry = {
  groupTeamId: string;
  teamId: string;
  punti: number;
  gameVinti: number;
  gamePersi: number;
  matchGiocate: number;
  posizione: number; // 1, 2, 3
};

type StandingInput = {
  groupTeamId: string;
  teamId: string;
  punti: number;
  gameVinti: number;
  gamePersi: number;
  matchGiocate: number;
};

type DirectMatchResult = {
  team1Id: string;
  team2Id: string;
  winnerId: string | null;
};

/**
 * Calcola classifica girone.
 * Tie-break: punti → scontro diretto → diff game → game vinti.
 */
export function computeStandings(
  entries: StandingInput[],
  matches: DirectMatchResult[]
): StandingEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (b.punti !== a.punti) return b.punti - a.punti;
    // Scontro diretto (solo se 2 squadre a parità sui punti)
    const tied = entries.filter((e) => e.punti === a.punti);
    if (tied.length === 2) {
      const direct = matches.find(
        (m) =>
          (m.team1Id === a.teamId && m.team2Id === b.teamId) ||
          (m.team1Id === b.teamId && m.team2Id === a.teamId)
      );
      if (direct?.winnerId === a.teamId) return -1;
      if (direct?.winnerId === b.teamId) return 1;
    }
    const diffA = a.gameVinti - a.gamePersi;
    const diffB = b.gameVinti - b.gamePersi;
    if (diffB !== diffA) return diffB - diffA;
    return b.gameVinti - a.gameVinti;
  });

  return sorted.map((e, i) => ({ ...e, posizione: i + 1 }));
}
