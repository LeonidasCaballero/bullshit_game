export interface Game {
  id: string;
  name: string;
  created_at: string;
  started: boolean;
  current_round_id: string | null;
}

export interface Player {
  id: string;
  game_id: string;
  name: string;
  created_at: string;
  status: 'online' | 'offline';
  last_seen: string;
  avatar_color: string;
  avatar: string;
}

export interface Round {
  id: string;
  game_id: string;
  category: 'pelicula' | 'sigla' | 'personaje';
  moderator_id: string;
  created_at: string;
  active: boolean;
  number: number;
  question_id: string | null;
  voting_phase: boolean;
  reading_phase: boolean;
  results_phase: boolean;
  scoring_phase: boolean;
}

export interface Question {
  id: string;
  category: 'pelicula' | 'sigla' | 'personaje';
  type: 1 | 2;
  text: string;
  content: string;
  correct_answer: string;
}

export interface Answer {
  id: string;
  round_id: string;
  player_id: string;
  content: string;
  created_at: string;
}

export interface PlayerPresence {
  playerId: string;
  online: boolean;
  lastSeen: Date;
}

export type GameCategory = 'pelicula' | 'sigla' | 'personaje';

export interface Vote {
  id: string;
  round_id: string;
  player_id: string;
  selected_answer: string;
}

export interface AnswerOption {
  content: string;
  isCorrectAnswer?: boolean;
  playerId?: string;
  playerName?: string;
}

export interface ExitingCard {
  index: number;
  content: string;
}

export interface PlayerScoreData {
  playerId: string;
  points: number;
  details: string[];
  playerAnswer: string | null;
  // Add other fields from player object needed for display if not flattening
  name: string;
  avatar_color: string;
  isModerator: boolean;
  isCurrentPlayer: boolean;
  voteIsCorrect: boolean | null; // null if didn't vote
  votedAnswer: string | null; // null if didn't vote
}