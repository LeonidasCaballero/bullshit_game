import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase'; // Adjust path if needed
import { fetchWithRetry } from '../lib/fetchWithRetry'; // Adjust path
import type { Round, Player, Question, Answer } from '../lib/types'; // Adjust path

export interface UseGameInitializationReturn {
  round: Round | null;
  moderator: Player | null;
  currentPlayer: Player | null;
  players: Player[];
  question: Question | null;
  initialAnswers: Answer[]; // Renamed from 'answers' to avoid confusion with realtime answers later
  isModerator: boolean;
  initialHasAnswered: boolean; // Renamed
  isLoading: boolean;
  error: string | null;
  retryInitialization: () => void;
}

export const useGameInitialization = (
  gameId: string | undefined,
  playerNameFromState: string | undefined
  // Note: roundId should be passed here from GameRound.tsx (from location.state) in a future step.
  // For now, fetching latest round as a placeholder.
): UseGameInitializationReturn => {
  const [round, setRound] = useState<Round | null>(null);
  const [moderator, setModerator] = useState<Player | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [initialAnswers, setInitialAnswers] = useState<Answer[]>([]);
  const [isModerator, setIsModerator] = useState<boolean>(false);
  const [initialHasAnswered, setInitialHasAnswered] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  const initialSetupDone = useRef(false); // To prevent re-fetching on fast refresh

  const maxRetries = 5; // Or from a config

  const retryInitialization = useCallback(() => {
    setError(null); // Clear previous error
    setIsLoading(true);
    setRetryCount(prev => prev + 1);
    initialSetupDone.current = false; // Allow re-fetch
  }, []);

  useEffect(() => {
    if (initialSetupDone.current || !gameId || !playerNameFromState) {
      if (!gameId || !playerNameFromState && !isLoading && !error) {
        // setIsLoading(false); // Avoid setting loading to false if props are just not ready yet
      }
      return;
    }

    const setupGame = async () => {
      setIsLoading(true);
      setError(null);
      console.log('🎮 useGameInitialization: Configurando juego inicial...');

      try {
        // Placeholder: Fetch the latest round for the game.
        // This needs to be adapted to use a specific roundId passed from GameRound.tsx.
        const { data: fetchedRoundData, error: roundError } = await supabase
          .from('rounds')
          .select('*')
          .eq('game_id', gameId)
          .order('created_at', { ascending: false }) 
          .limit(1)
          .single();

        if (roundError || !fetchedRoundData) {
          throw roundError || new Error('No active round found for this game.');
        }
        setRound(fetchedRoundData);
        const actualRoundId = fetchedRoundData.id;

        const [playersData, questionData, answersData] = await Promise.all([
          fetchWithRetry<Player[]>(() => supabase.from('players').select('*').eq('game_id', gameId)),
          fetchedRoundData.question_id
            ? fetchWithRetry<Question>(() =>
                supabase.from('questions').select('*').eq('id', fetchedRoundData.question_id).single()
              )
            : Promise.resolve(null),
          fetchWithRetry<Answer[]>(() => supabase.from('answers').select('*').eq('round_id', actualRoundId)),
        ]);

        if (!playersData || playersData.length === 0) throw new Error('No players found for this game.');
        setPlayers(playersData);

        const foundCurrentPlayer = playersData.find(p => p.name === playerNameFromState);
        if (!foundCurrentPlayer) throw new Error('Current player not found in game.');
        setCurrentPlayer(foundCurrentPlayer);

        const foundModerator = playersData.find(p => p.id === fetchedRoundData.moderator_id);
        if (!foundModerator) throw new Error('Moderator not found for this round.');
        setModerator(foundModerator);

        setIsModerator(foundCurrentPlayer.id === foundModerator.id);
        
        if(questionData) setQuestion(questionData);
        
        setInitialAnswers(answersData || []);
        setInitialHasAnswered((answersData || []).some(a => a.player_id === foundCurrentPlayer.id));
        
        initialSetupDone.current = true;
      } catch (err: any) {
        console.error('Error in useGameInitialization setup:', err);
        setError(err.message || 'Error al cargar datos iniciales del juego.');
        if (retryCount >= maxRetries) {
          setError(`Failed to load game data after ${maxRetries} retries. ${err.message}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (retryCount < maxRetries) {
      setupGame();
    } else if (!error) { // Ensure error is set if maxRetries is reached without one
      setError(`Failed to load game data after ${maxRetries} retries.`);
      setIsLoading(false);
    }
  }, [gameId, playerNameFromState, retryCount]); // Effect dependencies

  return {
    round,
    moderator,
    currentPlayer,
    players,
    question,
    initialAnswers,
    isModerator,
    initialHasAnswered,
    isLoading,
    error,
    retryInitialization,
  };
};
