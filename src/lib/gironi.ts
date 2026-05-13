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
