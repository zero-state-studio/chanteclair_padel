export type Genere = "MASCHILE" | "FEMMINILE" | "MISTO";
export type StatoTorneo = "BOZZA" | "ATTIVO" | "CONCLUSO";
export type StatoPartita = "ATTESA" | "IN_CORSO" | "COMPLETATA";
export type FaseTorneo = "BOZZA" | "GIRONI_1" | "GIRONI_2" | "FINALI" | "COMPLETATO";
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

export interface SponsorLite {
  id: string;
  nome: string | null;
  logoUrl: string | null;
}

export interface FieldLite {
  id: string;
  nome: string;
  descrizione: string | null;
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
  sponsorId: string | null;
  sponsor: SponsorLite | null;
  fieldId: string | null;
  field: FieldLite | null;
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
  fase: number;
  bracketTipo: BracketTipo | null;
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

export interface MatchLiveEvent {
  tipo: "PARTITA_INIZIATA" | "PARTITA_FINITA" | "PARTITA_PARZIALE";
  matchId: string;
  team1: TeamWithPlayers;
  team2: TeamWithPlayers;
  punteggio?: string;
  winner?: TeamWithPlayers;
  genere: Genere;
  sponsor?: SponsorLite | null;
  field?: FieldLite | null;
  bracket?: BracketTipo | null;
  isFinal?: boolean;
}

export interface SponsorShowcaseEvent {
  tipo: "SPONSOR_SHOWCASE";
  sponsors: SponsorLite[];
}

export interface GironiAnimationEvent {
  tipo: "GIRONI_ANIMATION";
  genere: Genere;
  tournamentId: string;
}

export interface TorneoInizatoEvent {
  tipo: "TORNEO_INIZIATO";
  genere: Genere;
  tournamentId: string;
}

export interface FinaliAnimationEvent {
  tipo: "FINALI_ANIMATION";
  genere: Genere;
  tournamentId: string;
}

export type LiveEvent =
  | MatchLiveEvent
  | SponsorShowcaseEvent
  | GironiAnimationEvent
  | TorneoInizatoEvent
  | FinaliAnimationEvent;
