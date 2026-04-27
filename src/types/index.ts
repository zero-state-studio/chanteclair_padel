export type Genere = "MASCHILE" | "FEMMINILE" | "MISTO";
export type StatoTorneo = "BOZZA" | "ATTIVO" | "CONCLUSO";
export type StatoPartita = "ATTESA" | "IN_CORSO" | "COMPLETATA";
export type FaseTorneo = "GIRONI" | "BRACKET";
export type BracketTipo = "GOLD" | "SILVER" | "BRONZE";

export interface PlayerWithMatches {
  id: string;
  nome: string;
  cognome: string;
  email?: string | null;
  telefono?: string | null;
  fotoUrl?: string | null;
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
  groupId: string | null;
  bracketTipo: BracketTipo | null;
  round: number;
  posizione: number;
  team1: TeamWithPlayers | null;
  team2: TeamWithPlayers | null;
  winner: TeamWithPlayers | null;
  punteggio: string | null;
  set1Team1: number | null;
  set1Team2: number | null;
  tieBreakTeam1: number | null;
  tieBreakTeam2: number | null;
  stato: StatoPartita;
  iniziataAt: string | null;
  finitaAt: string | null;
}

export interface GroupTeamWithStats {
  id: string;
  groupId: string;
  teamId: string;
  team: TeamWithPlayers;
  seed: number | null;
  punti: number;
  gameVinti: number;
  gamePersi: number;
  matchGiocate: number;
  posizioneFinale: number | null;
}

export interface GroupWithTeams {
  id: string;
  tournamentId: string;
  nome: string;
  posizione: number;
  groupTeams: GroupTeamWithStats[];
}

export interface TournamentWithMatches {
  id: string;
  nome: string;
  genere: Genere;
  stato: StatoTorneo;
  fase: FaseTorneo;
  anno: number;
  matches: MatchWithTeams[];
  groups: GroupWithTeams[];
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
