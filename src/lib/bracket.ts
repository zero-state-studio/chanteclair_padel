export type FinalMatchDraft = {
  tournamentId: string;
  bracketTipo: "GOLD" | "SILVER" | "BRONZE";
  groupId: null;
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

export function generaFinali(
  teamIds: string[],
  tournamentId: string,
  bracketTipo: "GOLD" | "SILVER" | "BRONZE"
): FinalMatchDraft[] {
  if (teamIds.length > 4) {
    throw new Error("Massimo 4 squadre per generare le finali");
  }

  const [t1 = null, t2 = null, t3 = null, t4 = null] = teamIds;

  const base = {
    tournamentId,
    bracketTipo,
    groupId: null as null,
    winnerId: null as null,
    punteggio: null as null,
    stato: "ATTESA" as const,
    iniziataAt: null as null,
    finitaAt: null as null,
  };

  return [
    // Semifinale 1: pos 0 — vincente promosso a finale (round 1 pos 0), perdente a 3°/4° (round 1 pos 1)
    { ...base, round: 2, posizione: 0, team1Id: t1, team2Id: t2 },
    // Semifinale 2: pos 1
    { ...base, round: 2, posizione: 1, team1Id: t3, team2Id: t4 },
    // Finale
    { ...base, round: 1, posizione: 0, team1Id: null, team2Id: null },
    // Playoff 3°/4°
    { ...base, round: 1, posizione: 1, team1Id: null, team2Id: null },
  ];
}
