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
}

export interface TeamWithPlayers {
  id: string;
  nome: string;
  genere: Genere;
  livello: number;
  player1: PlayerWithMatches;
  player2: PlayerWithMatches;
}

export interface MatchWithTeams {
  id: string;
  tournamentId: string;
  round: number;
  posizione: number;
  team1: TeamWithPlayers | null;
  team2: TeamWithPlayers | null;
  winner: TeamWithPlayers | null;
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
  matches: MatchWithTeams[];
}

export interface LiveEvent {
  tipo: "PARTITA_INIZIATA" | "PARTITA_FINITA";
  matchId: string;
  team1: TeamWithPlayers;
  team2: TeamWithPlayers;
  punteggio?: string;
  winner?: TeamWithPlayers;
  genere: Genere;
}
