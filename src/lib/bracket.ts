import type { Player } from "@prisma/client";

export type BracketMatchInput = {
  tournamentId: string;
  round: number;
  posizione: number;
  player1Id: string | null;
  player2Id: string | null;
  winnerId: null;
  punteggio: null;
  stato: "ATTESA";
  iniziataAt: null;
  finitaAt: null;
};

export function calcolaNumeroDiRound(numGiocatori: number): number {
  if (numGiocatori < 2) return 0;
  return Math.ceil(Math.log2(numGiocatori));
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
  giocatori: Player[],
  torneoId: string
): BracketMatchInput[] {
  if (giocatori.length < 2) {
    throw new Error("Servono almeno 2 giocatori per generare un bracket");
  }

  const totale = prossimaPotenzaDi2(giocatori.length);
  const numRound = calcolaNumeroDiRound(totale);

  const testeDiSerie = giocatori
    .filter((p) => p.livello > 0)
    .sort((a, b) => a.livello - b.livello);
  const altri = giocatori.filter((p) => p.livello === 0);
  const altriMescolati = shuffle(altri);

  const slots: (Player | null)[] = new Array(totale).fill(null);

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
      round: numRound,
      posizione: i,
      player1Id: slots[i * 2]?.id ?? null,
      player2Id: slots[i * 2 + 1]?.id ?? null,
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
        round: r,
        posizione: i,
        player1Id: null,
        player2Id: null,
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
