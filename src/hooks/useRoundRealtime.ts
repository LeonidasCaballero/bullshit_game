import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase'; // Adjust path
import { fetchWithRetry } from '../lib/fetchWithRetry'; // Adjust path
import type { Round, Question } from '../lib/types'; // Adjust path

export interface UseRoundRealtimeReturn {
  currentRound: Round | null; // The real-time updated round
  currentQuestion: Question | null; // The question associated with the currentRound
  roundError: string | null;
}

export const useRoundRealtime = (
  initialRound: Round | null,
  initialQuestion: Question | null // Pass the initially fetched question
): UseRoundRealtimeReturn => {
  const [currentRound, setCurrentRound] = useState<Round | null>(initialRound);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(initialQuestion);
  const [roundError, setRoundError] = useState<string | null>(null);
  
  const roundChannelRef = useRef<any>(null);

  useEffect(() => {
    // Update state if initialRound or initialQuestion props change
    setCurrentRound(initialRound);
    setCurrentQuestion(initialQuestion);
  }, [initialRound, initialQuestion]);

  useEffect(() => {
    if (!initialRound || !initialRound.id) {
      // No initial round to subscribe to, or ID is missing
      if (roundChannelRef.current) {
          roundChannelRef.current.unsubscribe();
          roundChannelRef.current = null;
      }
      return;
    }

    const roundId = initialRound.id;
    console.log(`🔄 useRoundRealtime: Setting up subscription for round ID: ${roundId}`);

    // Clean up previous subscription if any
    if (roundChannelRef.current) {
      roundChannelRef.current.unsubscribe();
      roundChannelRef.current = null; // Ensure ref is cleared before reassigning
    }

    roundChannelRef.current = supabase
      .channel(`round-updates-${roundId}`) // Original GameRound used this name
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'rounds',
          filter: `id=eq.${roundId}`,
        },
        async (payload) => {
          console.log('useRoundRealtime: Received round DB change:', payload);
          if (payload.eventType === 'UPDATE') {
            const updatedRound = payload.new as Round;
            setCurrentRound(updatedRound);

            // If question_id changes, fetch the new question
            // Compare with the local currentRound's question_id, not the one from the hook's parameter
            if (updatedRound.question_id && updatedRound.question_id !== currentRound?.question_id) {
              console.log(`useRoundRealtime: Question ID changed to ${updatedRound.question_id}, fetching new question.`);
              try {
                const newQuestionData = await fetchWithRetry<Question>(() =>
                  supabase.from('questions').select('*').eq('id', updatedRound.question_id).single()
                );
                setCurrentQuestion(newQuestionData);
                setRoundError(null);
              } catch (err: any) {
                console.error('useRoundRealtime: Error fetching new question:', err);
                setRoundError('Error al cargar la nueva pregunta.');
              }
            }
          } else if (payload.eventType === 'DELETE') {
            // Handle if the round is deleted, though this might be an edge case
            console.warn(`useRoundRealtime: Round ${roundId} was deleted.`);
            setRoundError('La ronda actual ha sido eliminada.');
            setCurrentRound(null);
            setCurrentQuestion(null);
          }
        }
      )
      // Also listen to broadcast events for round updates, as used in GameRound.tsx
      .on('broadcast', { event: 'round-update' }, (broadcastPayload) => {
          console.log('useRoundRealtime: Received round broadcast update:', broadcastPayload);
          const updatedRoundFromBroadcast = broadcastPayload.payload.round as Round;
          if (updatedRoundFromBroadcast && updatedRoundFromBroadcast.id === roundId) {
            setCurrentRound(updatedRoundFromBroadcast);
            // Handle question update from broadcast if necessary, similar to DB change
            // Compare with the local currentRound's question_id
            if (updatedRoundFromBroadcast.question_id && updatedRoundFromBroadcast.question_id !== currentRound?.question_id) {
                console.log(`useRoundRealtime (Broadcast): Question ID changed to ${updatedRoundFromBroadcast.question_id}, fetching new question.`);
                fetchWithRetry<Question>(() =>
                  supabase.from('questions').select('*').eq('id', updatedRoundFromBroadcast.question_id).single()
                ).then(setCurrentQuestion).catch(err => {
                    console.error('useRoundRealtime (Broadcast): Error fetching new question:', err);
                    setRoundError('Error al cargar la nueva pregunta desde broadcast.');
                });
            }
          }
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`useRoundRealtime: Successfully subscribed to round ${roundId}.`);
          setRoundError(null); // Clear any previous error on successful subscription
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`useRoundRealtime: Subscription error for round ${roundId}:`, status, err);
          setRoundError(`Error de conexión en tiempo real para la ronda (Estado: ${status}).`);
        }
        if (err) { // This might catch other types of errors during subscription setup
            console.error(`useRoundRealtime: Subscription failure for round ${roundId}:`, err);
            setRoundError(`Error de conexión en tiempo real para la ronda.`);
        }
      });

    return () => {
      console.log(`useRoundRealtime: Cleaning up subscription for round ${roundId}.`);
      if (roundChannelRef.current) {
        roundChannelRef.current.unsubscribe();
        roundChannelRef.current = null; // Corrected typo and ensure ref is cleared
      }
    };
  }, [initialRound]); // Depend on initialRound to setup/reset subscription. currentRound is not needed here.

  return { currentRound, currentQuestion, roundError };
};
