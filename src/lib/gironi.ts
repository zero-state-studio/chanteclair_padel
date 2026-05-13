import type { Team } from "@prisma/client";

export type GroupDraft = {
  nome: string;
  posizione: number;
  fase: number;
  bracketTipo: "GOLD" | "SILVER" | "BRONZE" | null;
  teams: { teamId: string | null; seed: number | null }[];
};

export type GroupMatchDraft = {
  groupPosizione: number;
  posizione: number;
  team1Id: string | null;
  team2Id: string | null;
  walkover: boolean;
  winnerTeamId: string | null;
  set1Team1: number | null;
  set1Team2: number | null;
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

const NUM_GIRONI_FASE_1 = 12;
const SIZE_GIRONE = 3;
const CAPACITA_TOTALE = NUM_GIRONI_FASE_1 * SIZE_GIRONE; // 36

export function distribuisciGironi1(squadre: Team[]): GroupDraft[] {
  if (squadre.length < 2) {
    throw new Error("Servono almeno 2 squadre");
  }
  if (squadre.length > CAPACITA_TOTALE) {
    throw new Error(`Massimo ${CAPACITA_TOTALE} squadre supportate in fase 1`);
  }

  const mescolate = shuffle(squadre);
  const slots: (Team | null)[] = new Array(CAPACITA_TOTALE).fill(null);
  mescolate.forEach((t, i) => {
    slots[i] = t;
  });

  const gironi: GroupDraft[] = [];
  for (let g = 0; g < NUM_GIRONI_FASE_1; g++) {
    const teamSlots: { teamId: string | null; seed: number | null }[] = [];
    for (let s = 0; s < SIZE_GIRONE; s++) {
      const team = slots[g * SIZE_GIRONE + s];
      teamSlots.push({ teamId: team?.id ?? null, seed: null });
    }
    gironi.push({
      nome: nomeGirone(g),
      posizione: g,
      fase: 1,
      bracketTipo: null,
      teams: teamSlots,
    });
  }
  return gironi;
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
    fase: 1,
    bracketTipo: null,
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
          team1Id: teams[i].teamId as string,
          team2Id: teams[j].teamId as string,
          walkover: false,
          winnerTeamId: null,
          set1Team1: null,
          set1Team2: null,
        });
      }
    }
  }
  return matches;
}

export function generaMatchGironi1(gironi: GroupDraft[]): GroupMatchDraft[] {
  const matches: GroupMatchDraft[] = [];
  for (const g of gironi) {
    let pos = 0;
    for (let i = 0; i < g.teams.length; i++) {
      for (let j = i + 1; j < g.teams.length; j++) {
        const t1 = g.teams[i].teamId;
        const t2 = g.teams[j].teamId;
        if (t1 === null && t2 === null) continue; // skip ghost vs ghost

        let winner: string | null = null;
        let s1: number | null = null;
        let s2: number | null = null;
        let walkover = false;
        if (t1 !== null && t2 === null) {
          walkover = true;
          winner = t1;
          s1 = 6;
          s2 = 0;
        } else if (t2 !== null && t1 === null) {
          walkover = true;
          winner = t2;
          s1 = 0;
          s2 = 6;
        }

        matches.push({
          groupPosizione: g.posizione,
          posizione: pos++,
          team1Id: t1,
          team2Id: t2,
          walkover,
          winnerTeamId: winner,
          set1Team1: s1,
          set1Team2: s2,
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

const NUM_GIRONI_FASE_2_PER_CATEGORIA = 4;
const SIZE_GIRONE_FASE_2 = 3;
const CAPACITA_FASE_2 = NUM_GIRONI_FASE_2_PER_CATEGORIA * SIZE_GIRONE_FASE_2; // 12

export function distribuisciGironi2(
  squadre: Team[],
  bracketTipo: "GOLD" | "SILVER" | "BRONZE",
  posizioneOffset: number
): GroupDraft[] {
  if (squadre.length > CAPACITA_FASE_2) {
    throw new Error(`Massimo ${CAPACITA_FASE_2} squadre per categoria fase 2`);
  }

  const mescolate = shuffle(squadre);
  const slots: (Team | null)[] = new Array(CAPACITA_FASE_2).fill(null);
  mescolate.forEach((t, i) => {
    slots[i] = t;
  });

  const gironi: GroupDraft[] = [];
  for (let g = 0; g < NUM_GIRONI_FASE_2_PER_CATEGORIA; g++) {
    const teamSlots: { teamId: string | null; seed: number | null }[] = [];
    for (let s = 0; s < SIZE_GIRONE_FASE_2; s++) {
      const team = slots[g * SIZE_GIRONE_FASE_2 + s];
      teamSlots.push({ teamId: team?.id ?? null, seed: null });
    }
    gironi.push({
      nome: `${bracketTipo[0]}${g + 1}`,
      posizione: posizioneOffset + g,
      fase: 2,
      bracketTipo,
      teams: teamSlots,
    });
  }
  return gironi;
}

export type StandingForCategory = {
  groupPosizione: number;
  teamId: string;
  posizioneFinale: number;
};

export type CategorieAssignment = {
  GOLD: string[];
  SILVER: string[];
  BRONZE: string[];
};

export function assegnaCategorie(
  standings: StandingForCategory[]
): CategorieAssignment {
  const sorted = [...standings].sort(
    (a, b) => a.groupPosizione - b.groupPosizione
  );
  const result: CategorieAssignment = { GOLD: [], SILVER: [], BRONZE: [] };
  for (const s of sorted) {
    if (s.posizioneFinale === 1) result.GOLD.push(s.teamId);
    else if (s.posizioneFinale === 2) result.SILVER.push(s.teamId);
    else if (s.posizioneFinale === 3) result.BRONZE.push(s.teamId);
  }
  return result;
}
