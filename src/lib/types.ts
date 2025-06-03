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
  avatar_url?: string;
  avatar_color: string;
  created_at: string;
  last_seen: string;
  is_host?: boolean;
}

export interface Round {
  id: string;
  game_id: string;
  number: number;
  moderator_id: string;
  category_id: string;
  category_name?: string;
  active: boolean;
  question_id: string;
  voting_phase: boolean;
  reading_phase: boolean;
  results_phase: boolean;
  scoring_phase?: boolean;
  created_at?: string;
}

export interface Question {
  id: string;
  category_id: string;
  category_name?: string;
  type: number;
  text: string;
  content: string;
  correct_answer: string;
  created_at?: string;
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

export interface Category {
  id: string;
  name: string;
  created_at?: string;
}