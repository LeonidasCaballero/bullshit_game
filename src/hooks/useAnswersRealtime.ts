import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase'; // Adjust path
import { fetchWithRetry } from '../lib/fetchWithRetry'; // Adjust path
import type { Answer } from '../lib/types'; // Adjust path

export interface UseAnswersRealtimeReturn {
  answers: Answer[];
  hasPlayerAnswered: boolean;
  answersError: string | null;
  submitAnswer: (answerContent: string) => Promise<void>;
}

export const useAnswersRealtime = (
  roundId: string | undefined,
  currentPlayerId: string | undefined,
  initialAnswersData: Answer[] = [], // Allow passing initial answers from useGameInitialization
  initialHasAnsweredData: boolean = false
): UseAnswersRealtimeReturn => {
  const [answers, setAnswers] = useState<Answer[]>(initialAnswersData);
  const [hasPlayerAnswered, setHasPlayerAnswered] = useState<boolean>(initialHasAnsweredData);
  const [answersError, setAnswersError] = useState<string | null>(null);
  
  const answersChannelRef = useRef<any>(null);

  // Update state if initialData props change (e.g., after useGameInitialization completes)
  useEffect(() => {
    setAnswers(initialAnswersData);
  }, [initialAnswersData]);

  useEffect(() => {
    setHasPlayerAnswered(initialHasAnsweredData);
  }, [initialHasAnsweredData]);


  const handleIncomingAnswers = useCallback((newAnswersPayload: Answer[] | Answer) => {
    // This function needs to handle both full arrays (from initial fetch or broadcast of all answers)
    // and single new answers (from postgres_changes 'INSERT').
    // The original `subscribeToAnswers` directly passed `handleAnswersUpdate` which received the payload.
    // The payload from 'postgres_changes' INSERT is an object with `new`.
    // A broadcast event might send a full list or a specific new answer.
    // For simplicity, this hook's internal handler will re-fetch all answers on any change to ensure consistency,
    // or intelligently merge if the payload structure is predictable.
    // Let's try re-fetching on any relevant event for robustness first.

    if (!roundId) return;

    const fetchCurrentAnswers = async () => {
        console.log(`useAnswersRealtime: Fetching answers for round ${roundId} due to update.`);
        try {
            const currentAnswersData = await fetchWithRetry<Answer[]>(() => 
                supabase.from('answers').select('*').eq('round_id', roundId)
            );
            setAnswers(currentAnswersData || []);
            if (currentPlayerId) {
                setHasPlayerAnswered((currentAnswersData || []).some(a => a.player_id === currentPlayerId));
            }
            setAnswersError(null);
        } catch (err: any) {
            console.error('useAnswersRealtime: Error fetching answers after update:', err);
            setAnswersError('Error al actualizar la lista de respuestas.');
        }
    };

    fetchCurrentAnswers();

  }, [roundId, currentPlayerId]);


  useEffect(() => {
    if (!roundId) {
      if (answersChannelRef.current) {
        answersChannelRef.current.unsubscribe();
        answersChannelRef.current = null;
      }
      return;
    }

    // Initial fetch of answers for the round when roundId becomes available
    // This is now covered by useGameInitialization passing initialAnswersData
    // However, if this hook is used independently or if roundId changes, it might need its own initial fetch.
    // For now, relies on initialAnswersData.

    console.log(`useAnswersRealtime: Setting up subscription for answers, round ID: ${roundId}`);
    if (answersChannelRef.current) {
      answersChannelRef.current.unsubscribe();
      answersChannelRef.current = null; // Ensure ref is cleared before reassigning
    }

    answersChannelRef.current = supabase
      .channel(`answers-round-${roundId}`) // Custom channel name
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'answers',
          filter: `round_id=eq.${roundId}`,
        },
        (payload) => {
          console.log('useAnswersRealtime: Received answers DB change:', payload);
          // Instead of trying to intelligently merge, we call handleIncomingAnswers
          // which currently re-fetches all answers for the round.
          // This ensures data consistency especially if multiple changes happen quickly.
          // More sophisticated merging can be done if payload.new is reliable and complete.
          handleIncomingAnswers(payload.new as Answer); 
        }
      )
      .on('broadcast', { event: 'new-answer' }, (payload) => {
        // Assuming 'new-answer' broadcast might signify a new answer was added.
        // The payload might contain the roundId to check if it's for the current round.
        console.log('useAnswersRealtime: Received "new-answer" broadcast:', payload);
        if (payload.payload?.roundId === roundId) {
            handleIncomingAnswers([]); // Trigger re-fetch
        }
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`useAnswersRealtime: Successfully subscribed to answers for round ${roundId}.`);
          setAnswersError(null); // Clear error on successful subscription
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || err) {
          console.error(`useAnswersRealtime: Subscription error/timeout for answers, round ${roundId}:`, status, err);
          setAnswersError(`Error de conexión en tiempo real para las respuestas.`);
        }
      });

    return () => {
      console.log(`useAnswersRealtime: Cleaning up subscription for answers, round ${roundId}.`);
      if (answersChannelRef.current) {
        answersChannelRef.current.unsubscribe();
        answersChannelRef.current = null;
      }
    };
  }, [roundId, handleIncomingAnswers]); // Rerun if roundId changes or handleIncomingAnswers changes (it shouldn't due to useCallback)

  const submitAnswer = useCallback(async (answerContent: string) => {
    if (!answerContent.trim() || !roundId || !currentPlayerId || hasPlayerAnswered) {
        console.warn('useAnswersRealtime: Submit answer conditions not met.', { roundId, currentPlayerId, hasPlayerAnswered, answerContent });
        // Optionally set an error or just return
        if (!answerContent.trim()) setAnswersError("La respuesta no puede estar vacía.");
        else if (hasPlayerAnswered) setAnswersError("Ya has enviado una respuesta para esta ronda.");
        else setAnswersError("No se puede enviar la respuesta en este momento.");
        return;
    }
    
    setAnswersError(null); // Clear previous errors
    try {
      console.log('useAnswersRealtime: Submitting answer...');
      const { error: submitError } = await supabase
        .from('answers')
        .insert([{
          round_id: roundId,
          player_id: currentPlayerId,
          content: answerContent.trim()
        }]);

      if (submitError) {
        if (submitError.code === '23505') { // Duplicate violation
          console.log('useAnswersRealtime: Player has already submitted an answer for this round.');
          setHasPlayerAnswered(true); // Ensure state is correct
          setAnswersError("Ya has enviado una respuesta anteriormente.");
        } else {
          throw submitError;
        }
      } else {
        console.log('useAnswersRealtime: Answer submitted successfully.');
        // After successful submission, hasPlayerAnswered will be true.
        // The subscription should pick up the new answer and update the list,
        // which in turn updates hasPlayerAnswered via handleIncomingAnswers.
        // For immediate feedback:
        setHasPlayerAnswered(true);

        // Optionally, broadcast that a new answer was made if other clients need to react,
        // though the direct DB subscription should handle list updates.
        // supabase.channel(`answers-broadcast-${roundId}`).send({ type: 'broadcast', event: 'new-answer', payload: { roundId } });
      }
    } catch (err: any) {
      console.error('useAnswersRealtime: Error submitting answer:', err);
      setAnswersError('Error al enviar la respuesta: ' + err.message);
      // Do not automatically set hasPlayerAnswered to false here, as an error might be temporary
      // or due to other reasons than "answer not submitted".
    }
  }, [roundId, currentPlayerId, hasPlayerAnswered]); // Removed supabase from dependencies as it's stable

  return { answers, hasPlayerAnswered, answersError, submitAnswer };
};
