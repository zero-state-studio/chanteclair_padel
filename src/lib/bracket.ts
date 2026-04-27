import type { Team } from "@prisma/client";

export type BracketTipo = "GOLD" | "SILVER" | "BRONZE";

export type BracketMatchInput = {
  tournamentId: string;
  bracketTipo: BracketTipo | null;
  round: number;
  posizione: number;
  team1Id: string | null;
  team2Id: string | null;
  winnerId: null;
  punteggio: null;
  stato: "ATTESA";
  iniziataAt: null;
  finitaAt: null;
};

export function calcolaNumeroDiRound(numTeams: number): number {
  if (numTeams < 2) return 0;
  return Math.ceil(Math.log2(numTeams));
}

export function prossimaPotenzaDi2(n: number): number {
  if (n < 1) return 1;
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getSeedPositions(size: number): number[] {
  if (size <= 1) return [0];
  const prev = getSeedPositions(size / 2);
  const result: number[] = [];
  for (const p of prev) {
    result.push(p);
    result.push(size - 1 - p);
  }
  return result;
}

export function generaBracket(
  squadre: Team[],
  torneoId: string,
  bracketTipo: BracketTipo | null = null
): BracketMatchInput[] {
  if (squadre.length < 2) {
    throw new Error("Servono almeno 2 squadre per generare un bracket");
  }

  const totale = prossimaPotenzaDi2(squadre.length);
  const numRound = calcolaNumeroDiRound(totale);

  const testeDiSerie = squadre
    .filter((s) => s.livello > 0)
    .sort((a, b) => a.livello - b.livello);
  const altri = squadre.filter((s) => s.livello === 0);
  const altriMescolati = shuffle(altri);

  const slots: (Team | null)[] = new Array(totale).fill(null);

  const seedPositions = getSeedPositions(totale);
  testeDiSerie.forEach((tds, i) => {
    if (i < seedPositions.length) {
      slots[seedPositions[i]] = tds;
    }
  });

  let idx = 0;
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] === null && idx < altriMescolati.length) {
      slots[i] = altriMescolati[idx++];
    }
  }

  const matches: BracketMatchInput[] = [];
  const firstRoundSize = totale / 2;

  for (let i = 0; i < firstRoundSize; i++) {
    matches.push({
      tournamentId: torneoId,
      bracketTipo,
      round: numRound,
      posizione: i,
      team1Id: slots[i * 2]?.id ?? null,
      team2Id: slots[i * 2 + 1]?.id ?? null,
      winnerId: null,
      punteggio: null,
      stato: "ATTESA",
      iniziataAt: null,
      finitaAt: null,
    });
  }

  for (let r = numRound - 1; r >= 1; r--) {
    const numPartite = Math.pow(2, r - 1);
    for (let i = 0; i < numPartite; i++) {
      matches.push({
        tournamentId: torneoId,
        bracketTipo,
        round: r,
        posizione: i,
        team1Id: null,
        team2Id: null,
        winnerId: null,
        punteggio: null,
        stato: "ATTESA",
        iniziataAt: null,
        finitaAt: null,
      });
    }
  }

  return matches;
}
