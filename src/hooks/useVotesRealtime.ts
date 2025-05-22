import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase'; // Adjust path
import { fetchWithRetry } from '../lib/fetchWithRetry'; // Adjust path
import type { Vote, Player } from '../lib/types'; // Adjust path

export interface UseVotesRealtimeReturn {
  votes: Vote[];
  playerHasVoted: boolean;
  selectedVoteByPlayer: string | null; // Content of the answer the current player voted for
  votesError: string | null;
  submitVote: (selectedAnswerContent: string) => Promise<void>;
  fetchInitialVotes: () => Promise<void>; // Expose ability to fetch votes manually if needed
}

export const useVotesRealtime = (
  roundId: string | undefined,
  currentPlayerId: string | undefined
): UseVotesRealtimeReturn => {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [playerHasVoted, setPlayerHasVoted] = useState<boolean>(false);
  const [selectedVoteByPlayer, setSelectedVoteByPlayer] = useState<string | null>(null);
  const [votesError, setVotesError] = useState<string | null>(null);
  
  const votesChannelRef = useRef<any>(null);
  const lastProcessedVoteTimestamp = useRef<number>(0); // For handling potential immediate echo of own vote

  const processVotes = useCallback((currentVotes: Vote[]) => {
    setVotes(currentVotes);
    if (currentPlayerId) {
      const currentPlayerVote = currentVotes.find(v => v.player_id === currentPlayerId);
      if (currentPlayerVote) {
        setPlayerHasVoted(true);
        setSelectedVoteByPlayer(currentPlayerVote.selected_answer);
      } else {
        setPlayerHasVoted(false);
        setSelectedVoteByPlayer(null);
      }
    }
  }, [currentPlayerId]);

  const fetchInitialVotes = useCallback(async () => {
    if (!roundId) return;
    console.log(`useVotesRealtime: Fetching initial votes for round ${roundId}`);
    setVotesError(null);
    try {
      const votesData = await fetchWithRetry<Vote[]>(() => 
        supabase.from('votes').select('*').eq('round_id', roundId)
      );
      processVotes(votesData || []);
    } catch (err: any) {
      console.error('useVotesRealtime: Error fetching initial votes:', err);
      setVotesError('Error al cargar los votos iniciales.');
    }
  }, [roundId, processVotes]);

  useEffect(() => {
    // Fetch initial votes when roundId becomes available or changes
    fetchInitialVotes();
  }, [fetchInitialVotes]); // fetchInitialVotes is memoized and depends on roundId

  useEffect(() => {
    if (!roundId) {
      if (votesChannelRef.current) {
        votesChannelRef.current.unsubscribe();
        votesChannelRef.current = null;
      }
      return;
    }

    console.log(`useVotesRealtime: Setting up subscription for votes, round ID: ${roundId}`);
    if (votesChannelRef.current) {
        votesChannelRef.current.unsubscribe(); // Clean up previous if roundId changes
    }
    
    // The channel name should be unique per round, as in GameRound.tsx
    // GameRound.tsx used `votes-${round.id}` and also `votes-${round.id}-${Date.now()}` in another place.
    // Using a consistent one:
    const channelName = `votes-round-${roundId}`; 
    votesChannelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Only interested in new votes
          schema: 'public',
          table: 'votes',
          filter: `round_id=eq.${roundId}`,
        },
        (payload) => {
          console.log('useVotesRealtime: Received votes DB change (INSERT):', payload);
          const newVote = payload.new as Vote;
          
          // Basic echo suppression: if the vote is very recent and matches current player,
          // it might be an echo of what `submitVote` just did.
          // The original `_lastVoteTimestamp` was more robust.
          // This simple check might not be enough for all race conditions.
          const now = Date.now();
          if (newVote.player_id === currentPlayerId && (now - lastProcessedVoteTimestamp.current < 2000)) {
            console.log('useVotesRealtime: Potentially ignoring echo of own recent vote.');
            // Still, update the list to ensure consistency, processVotes will handle it.
          }

          // Re-fetch all votes to ensure consistency, or merge intelligently
          // For now, re-fetch as it's safer.
          fetchInitialVotes(); 
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`useVotesRealtime: Successfully subscribed to votes for round ${roundId}.`);
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || err) {
          console.error(`useVotesRealtime: Subscription error for votes, round ${roundId}:`, status, err);
          setVotesError(`Error de conexión en tiempo real para los votos.`);
        }
      });

    return () => {
      console.log(`useVotesRealtime: Cleaning up subscription for votes, round ${roundId}.`);
      if (votesChannelRef.current) {
        votesChannelRef.current.unsubscribe();
        votesChannelRef.current = null;
      }
    };
  }, [roundId, currentPlayerId, fetchInitialVotes]);

  const submitVote = useCallback(async (selectedAnswerContent: string) => {
    if (!roundId || !currentPlayerId || playerHasVoted) {
      console.warn('useVotesRealtime: Submit vote conditions not met.', { roundId, currentPlayerId, playerHasVoted });
      return;
    }
    setVotesError(null);
    try {
      console.log('useVotesRealtime: Submitting vote...');
      lastProcessedVoteTimestamp.current = Date.now(); // Record time before submission

      const { data, error: submitError } = await supabase
        .from('votes')
        .insert({
          round_id: roundId,
          player_id: currentPlayerId,
          selected_answer: selectedAnswerContent
        })
        .select(); // Important to get the inserted vote back if needed, or handle errors

      if (submitError) {
        if (submitError.code === '23505') { // Duplicate vote
          console.log('useVotesRealtime: Player has already voted.');
          // Ensure local state reflects this, even if subscription is slow
          setPlayerHasVoted(true);
          setSelectedVoteByPlayer(selectedAnswerContent); 
        } else {
          throw submitError;
        }
      } else {
        console.log('useVotesRealtime: Vote submitted successfully:', data);
        // For immediate UI update, set playerHasVoted and selectedVoteByPlayer
        setPlayerHasVoted(true);
        setSelectedVoteByPlayer(selectedAnswerContent);
        // The subscription should ideally handle updating the main 'votes' list.
        // If `data` contains the new vote, we could merge it: processVotes([...votes, data[0]]);
        // However, current subscription calls fetchInitialVotes which re-fetches all.
      }
    } catch (err: any) {
      console.error('useVotesRealtime: Error submitting vote:', err);
      setVotesError('Error al registrar el voto: ' + err.message);
    }
  }, [roundId, currentPlayerId, playerHasVoted, processVotes]); // Removed supabase, added processVotes

  return { votes, playerHasVoted, selectedVoteByPlayer, votesError, submitVote, fetchInitialVotes };
};
