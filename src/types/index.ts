export type Genere = "MASCHILE" | "FEMMINILE";
export type StatoTorneo = "BOZZA" | "ATTIVO" | "CONCLUSO";
export type StatoPartita = "ATTESA" | "IN_CORSO" | "COMPLETATA";

export interface PlayerWithMatches {
  id: string;
  nome: string;
  cognome: string;
  email?: string | null;
  telefono?: string | null;
  fotoUrl?: string | null;
  genere: Genere;
  livello: number;
}

export interface MatchWithPlayers {
  id: string;
  tournamentId: string;
  round: number;
  posizione: number;
  player1: PlayerWithMatches | null;
  player2: PlayerWithMatches | null;
  winner: PlayerWithMatches | null;
  punteggio: string | null;
  stato: StatoPartita;
  iniziataAt: string | null;
  finitaAt: string | null;
}

export interface TournamentWithMatches {
  id: string;
  nome: string;
  genere: Genere;
  stato: StatoTorneo;
  anno: number;
  matches: MatchWithPlayers[];
}

export interface LiveEvent {
  tipo: "PARTITA_INIZIATA" | "PARTITA_FINITA";
  matchId: string;
  player1: PlayerWithMatches;
  player2: PlayerWithMatches;
  punteggio?: string;
  winner?: PlayerWithMatches;
  genere: Genere;
}
