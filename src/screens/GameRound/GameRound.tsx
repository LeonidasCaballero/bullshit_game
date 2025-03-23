import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase, subscribeToAnswers, subscribeToRound } from "../../lib/supabase";
import { ArrowLeft, Timer, ChevronLeft, Loader2 } from "lucide-react";
import type { Round, Player, Question, Answer, Vote } from "../../lib/types";

// Add this with other interfaces
type AnswerResponse = Pick<Answer, 'content' | 'player_id'> & {
  players: { name: string; avatar_color: string; }[];
};

interface AnswerOption {
  content: string;
  isCorrectAnswer?: boolean;
  playerId?: string;
  playerName?: string;
}

interface ExitingCard {
  index: number;
  content: string;
}

// Añadir este componente para el overlay
const ReadingOverlay = () => (
  <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-50">
    <Loader2 className="h-8 w-8 animate-spin text-white mb-4" />
    <p className="text-white text-lg text-center px-4">
      El moderador está leyendo vuestras burradas
    </p>
  </div>
);

export const GameRound = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameId } = useParams();
  const [round, setRound] = useState<Round | null>(null);
  const [moderator, setModerator] = useState<Player | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [isModerator, setIsModerator] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isReadingAnswers, setIsReadingAnswers] = useState(false);
  const [currentAnswerIndex, setCurrentAnswerIndex] = useState(0);
  const [shuffledAnswers, setShuffledAnswers] = useState<AnswerOption[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 5;
  const retryDelay = 1000;
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [allPlayersVoted, setAllPlayersVoted] = useState(false);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [resultsCountdown, setResultsCountdown] = useState<number>(20);
  
  const answersChannelRef = useRef<any>(null);
  const roundChannelRef = useRef<any>(null);

  const [slideDirection, setSlideDirection] = useState('right');
  const [exitingCards, setExitingCards] = useState<ExitingCard[]>([]);

  const fetchWithRetry = async <T,>(
    fetcher: () => Promise<{ data: T; error: any }>,
    maxAttempts = 3,
    delay = 1000
  ): Promise<T> => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const { data, error } = await fetcher();
        if (error) throw error;
        return data;
      } catch (err) {
        if (attempt === maxAttempts) throw err;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries reached');
  };

  useEffect(() => {
    if (round?.voting_phase && !isModerator) {
      const loadVotingPhase = async () => {
        try {
          // First load the answers and question with retry logic
          const [answersData, questionData, votesData] = await Promise.all([
            fetchWithRetry<AnswerResponse[]>(
              async () => {
                const response = await supabase
                  .from('answers')
                  .select(`
                    content,
                    player_id,
                    players (
                      name,
                      avatar_color
                    )
                  `)
                  .eq('round_id', round.id);
                return { data: response.data as AnswerResponse[], error: response.error };
              }
            ),
            fetchWithRetry<Question>(async () => 
              supabase.from('questions').select('*').eq('id', round.question_id).single()
                .then(response => ({ data: response.data as Question, error: response.error }))
            ),
            fetchWithRetry<Vote[]>(
              async () => await supabase
                .from('votes')
                .select('*')
                .eq('round_id', round.id)
                .then(response => ({ data: response.data as Vote[], error: response.error }))
            )
          ]);

          // Create the shuffled answers array
          const allAnswers: AnswerOption[] = [
            {
              content: questionData.correct_answer,
              isCorrectAnswer: true
            },
            ...(answersData || []).map((answer: any) => ({
              content: answer.content,
              playerId: answer.player_id,
              playerName: answer.players?.name
            }))
          ];

          // Keep the same order as when they were read
          setShuffledAnswers(allAnswers);

          // Check if player has already voted
          const playerVote = votesData?.find(v => v.player_id === currentPlayer?.id);
          if (playerVote) {
            setSelectedVote(playerVote.selected_answer);
            setHasVoted(true);
          }

          // Check if all non-moderator players have voted
          const nonModeratorPlayers = players.filter(p => p.id !== moderator?.id);
          const allVoted = nonModeratorPlayers.every(player => 
            votesData?.some(vote => vote.player_id === player.id)
          );
          setAllPlayersVoted(allVoted);

          // Set up subscription for votes with error handling
          const votesChannel = supabase.channel(`votes-${round.id}`, {
            config: {
              broadcast: { self: true },
              presence: { key: round.id }
            }
          });

          votesChannel
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'votes',
                filter: `round_id=eq.${round.id}`
              },
              async () => {
                try {
                  const { data: latestVotes } = await supabase
                    .from('votes')
                    .select('*')
                    .eq('round_id', round.id);
                  
                  if (latestVotes) {
                    const allVoted = nonModeratorPlayers.every(player => 
                      latestVotes.some(vote => vote.player_id === player.id)
                    );
                    setAllPlayersVoted(allVoted);
                  }
                } catch (err) {
                  console.error('Error in votes subscription handler:', err);
                }
              }
            )
            .subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                console.log(`Subscribed to votes for round ${round.id}`);
              } else if (status === 'CHANNEL_ERROR') {
                console.error(`Error subscribing to votes for round ${round.id}`);
              }
            });

          return () => {
            votesChannel.unsubscribe();
          };
        } catch (err) {
          console.error('Error loading voting phase:', err);
          setError('Error al cargar la fase de votación. Intentando reconectar...');
          
          // Retry the entire setup after a delay
          if (retryCount < maxRetries) {
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
              setError(null);
            }, retryDelay);
          } else {
            setError('No se pudo cargar la fase de votación. Por favor, recarga la página.');
          }
        }
      };

      loadVotingPhase();
    }
  }, [round?.voting_phase, round?.id, round?.question_id, isModerator, currentPlayer?.id, players, moderator?.id, retryCount]);

  const handleVote = async (selectedAnswer: string) => {
    if (!round || !currentPlayer || hasVoted) return;

    try {
      console.log('🎯 Enviando voto...');
      const { error: voteError } = await supabase
        .from('votes')
        .insert([{
          round_id: round.id,
          player_id: currentPlayer.id,
          selected_answer: selectedAnswer
        }]);

      if (voteError) {
        console.error('❌ Error al votar:', voteError);
        throw voteError;
      }

      console.log('✅ Voto registrado exitosamente');
      setHasVoted(true);
      setSelectedVote(selectedAnswer);

      // Forzar una actualización inmediata
      const { data: updatedVotes } = await supabase
        .from('votes')
        .select('*')
        .eq('round_id', round.id);
      
      setVotes(updatedVotes || []);
    } catch (err) {
      console.error('Error al votar:', err);
    }
  };

  const handleFinishReadingAnswers = async () => {
    if (!round) return;
    
    try {
      const { error: updateError } = await supabase
        .from('rounds')
        .update({ 
          reading_phase: false,
          voting_phase: true 
        })
        .eq('id', round.id);

      if (updateError) throw updateError;
    } catch (err) {
      console.error('Error transitioning to voting phase:', err);
      setError('Error al iniciar la fase de votación');
    }
  };

  const handleNextAnswer = () => {
    if (currentAnswerIndex < shuffledAnswers.length - 1) {
      setExitingCards(prev => [...prev, {
        index: currentAnswerIndex,
        content: shuffledAnswers[currentAnswerIndex].content
      }]);
      setSlideDirection('left');
      setTimeout(() => {
        setCurrentAnswerIndex(prev => prev + 1);
        setExitingCards([]);
      }, 400);
    } else {
      handleFinishReadingAnswers();
    }
  };

  const handlePrevAnswer = () => {
    if (currentAnswerIndex > 0) {
      setExitingCards(prev => [...prev, {
        index: currentAnswerIndex,
        content: shuffledAnswers[currentAnswerIndex].content
      }]);
      setSlideDirection('right');
      setTimeout(() => {
        setCurrentAnswerIndex(prev => prev - 1);
        setExitingCards([]);
      }, 400);
    }
  };

  const getPendingPlayers = useCallback(() => {
    if (!round?.moderator_id || !players.length || !answers) return [];
    
    const answeredPlayerIds = new Set(answers.map(a => a.player_id));
    return players.filter(player => 
      player.id !== round.moderator_id && 
      !answeredPlayerIds.has(player.id)
    );
  }, [round, players, answers]);

  const handleAnswersUpdate = useCallback((newAnswers: Answer[]) => {
    console.log('Received new answers:', newAnswers);
    setAnswers(newAnswers);
    
    if (currentPlayer) {
      setHasAnswered(newAnswers.some(a => a.player_id === currentPlayer.id));
    }
  }, [currentPlayer]);

  useEffect(() => {
    if (!gameId || !location.state?.playerName) {
      setError('Información de juego o jugador no válida');
      setIsLoading(false);
      return;
    }

    const setupGame = async () => {
      try {
        console.log('🚀 Iniciando setup del juego...');
        
        // 1. Obtener datos básicos en paralelo
        const [playersData, roundData] = await Promise.all([
          fetchWithRetry<Player[]>(async () => 
            supabase.from('players').select('*').eq('game_id', gameId)
              .then(response => ({ data: response.data as Player[], error: response.error }))
          ),
          fetchWithRetry<Round>(async () => 
            supabase.from('rounds').select('*').eq('id', location.state.roundId).single()
              .then(response => ({ data: response.data as Round, error: response.error }))
          )
        ]);

        if (!playersData || !roundData) {
          throw new Error('No se pudieron cargar los datos del juego');
        }

        // 2. Obtener la pregunta usando el ID correcto
        const questionData = roundData.question_id ? 
          await fetchWithRetry<Question>(async () => 
            supabase.from('questions')
              .select('*')
              .eq('id', roundData.question_id)
              .single()
              .then(response => ({ data: response.data as Question, error: response.error }))
          ) : null;

        // 3. Obtener respuestas
        const answersData = await fetchWithRetry<Answer[]>(async () => 
          supabase.from('answers').select('*').eq('round_id', roundData.id)
            .then(response => ({ data: response.data as Answer[], error: response.error }))
        );

        if (!playersData || playersData.length === 0) {
          throw new Error('No se encontraron jugadores');
        }
        setPlayers(playersData);

        // 2. Establecer jugador actual
        const currentPlayerData = playersData.find(p => p.name === location.state.playerName);
        if (!currentPlayerData) {
          throw new Error('Jugador actual no encontrado');
        }
        setCurrentPlayer(currentPlayerData);

        // 3. Obtener la ronda activa
        if (!roundData) {
          throw new Error('No se encontró la ronda');
        }
        setRound(roundData);
        setIsModerator(roundData.moderator_id === currentPlayerData.id);

        // 4. Establecer moderador
        const moderatorData = playersData.find(p => p.id === roundData.moderator_id);
        if (!moderatorData) {
          throw new Error('Moderador no encontrado');
        }
        setModerator(moderatorData);

        // 5. Obtener pregunta si existe
        if (questionData) {
          setQuestion(questionData);
          setCountdown(0);
        }

        const initialAnswers = answersData || [];
        setAnswers(initialAnswers);
        setHasAnswered(initialAnswers.some(a => a.player_id === currentPlayerData.id));

        if (answersChannelRef.current) {
          answersChannelRef.current.unsubscribe();
        }
        answersChannelRef.current = subscribeToAnswers(roundData.id, handleAnswersUpdate);

        if (roundChannelRef.current) {
          roundChannelRef.current.unsubscribe();
        }
        roundChannelRef.current = subscribeToRound(roundData.id, async (updatedRound) => {
          console.log('Received round update:', updatedRound);
          setRound(updatedRound);

          if (updatedRound.question_id && updatedRound.question_id !== roundData.question_id) {
            const questionData = await fetchWithRetry<Question>(
              async () => await supabase
                .from('questions')
                .select('*')
                .eq('id', updatedRound.question_id)
                .single()
                .then(response => ({ data: response.data as Question, error: response.error }))
            );

            if (questionData) {
              setQuestion(questionData);
              setCountdown(0);
            }
          }
        });

        setIsLoading(false);
      } catch (err) {
        console.error('Error in setupGame:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar la partida');
        setIsLoading(false);
      }
    };

    setupGame();

    return () => {
      console.log('Cleaning up subscriptions');
      if (answersChannelRef.current) {
        answersChannelRef.current.unsubscribe();
        answersChannelRef.current = null;
      }
      if (roundChannelRef.current) {
        roundChannelRef.current.unsubscribe();
        roundChannelRef.current = null;
      }
    };
  }, [gameId, location.state?.playerName, location.state?.roundId, handleAnswersUpdate, retryCount]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  const handleSubmitAnswer = async () => {
    if (!answer.trim() || !round || !currentPlayer || hasAnswered) return;
    
    try {
      const { error: submitError } = await supabase
        .from('answers')
        .insert([{
          round_id: round.id,
          player_id: currentPlayer.id,
          content: answer.trim()
        }]);

      if (submitError) throw submitError;
      setAnswer('');
      setHasAnswered(true);
    } catch (err) {
      console.error('Error submitting answer:', err);
      setError('Error al enviar la respuesta');
    }
  };

  const handleStartReadingAnswers = async () => {
    if (!question || !round) return;

    try {
      // Primero actualizar el estado de la ronda
      const { error: updateError } = await supabase
        .from('rounds')
        .update({ reading_phase: true })
        .eq('id', round.id);

      if (updateError) throw updateError;

      // Luego obtener las respuestas
      const { data: answersWithPlayers, error: answersError } = await supabase
        .from('answers')
        .select(`
          content,
          player_id,
          players (
            name,
            avatar_color
          )
        `)
        .eq('round_id', round.id);

      if (answersError) throw answersError;

      const allAnswers: AnswerOption[] = [
        {
          content: question.correct_answer,
          isCorrectAnswer: true
        },
        ...(answersWithPlayers || []).map((answer: any) => ({
          content: answer.content,
          isCorrectAnswer: false,
          playerName: answer.players?.name,
          playerId: answer.player_id
        }))
      ];

      const shuffled = allAnswers.sort(() => Math.random() - 0.5);
      setShuffledAnswers(shuffled);
      setIsReadingAnswers(true);
      setCurrentAnswerIndex(0);
    } catch (err) {
      console.error('Error preparing answers:', err);
      setError('Error al preparar las respuestas');
    }
  };

  const getCategoryIcon = () => {
    switch (round?.category) {
      case 'pelicula': return '🎬';
      case 'sigla': return 'ABC';
      case 'personaje': return '👤';
      default: return '';
    }
  };

  useEffect(() => {
    if (round?.voting_phase) {
      console.log('🔄 Iniciando fase de votación');
      
      // Función para obtener votos actuales
      const fetchVotes = async () => {
        console.log('📥 Fetching votos...');
        const { data, error } = await supabase
          .from('votes')
          .select('*')
          .eq('round_id', round.id);

        if (error) {
          console.error('❌ Error fetching votes:', error);
          return;
        }

        console.log('✅ Votos obtenidos:', data);
        setVotes(data || []);
        
        // Actualizar allPlayersVoted
        const nonModeratorPlayers = players.filter(p => p.id !== round.moderator_id);
        const votedPlayers = data?.filter(vote => 
          nonModeratorPlayers.some(p => p.id === vote.player_id)
        );
        setAllPlayersVoted(votedPlayers?.length === nonModeratorPlayers.length);
      };

      // Fetch inicial
      fetchVotes();

      // Suscripción a cambios en votos
      const votesChannel = supabase
        .channel(`votes-${round.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'votes',
            filter: `round_id=eq.${round.id}`
          },
          async (payload) => {
            console.log('🎯 Cambio detectado en votos:', payload);
            await fetchVotes(); // Refetch al detectar cambios
          }
        )
        .subscribe((status) => {
          console.log('📡 Estado de suscripción:', status);
        });

      // Cleanup
      return () => {
        console.log('♻️ Limpiando suscripción de votos');
        votesChannel.unsubscribe();
      };
    }
  }, [round?.id, round?.voting_phase, round?.moderator_id, players]);

  const handleRevealResults = async () => {
    if (!round || !question) return;
    
    try {
      // 1. Asignar puntos por votos correctos (2 puntos)
      const correctVoters = votes.filter(vote => vote.selected_answer === question.correct_answer);
      await Promise.all(correctVoters.map(vote => 
        supabase.from('scores').insert({
          game_id: gameId,
          round_id: round.id,
          player_id: vote.player_id,
          points: 2,
          reason: 'Voto correcto'
        })
      ));

      // 2. Asignar puntos por recibir votos (1 punto por voto)
      const playerAnswers = answers.reduce((acc, answer) => {
        acc[answer.content] = answer.player_id;
        return acc;
      }, {} as Record<string, string>);

      const votesByAnswer = votes.reduce((acc, vote) => {
        if (vote.selected_answer !== question.correct_answer) {
          acc[vote.selected_answer] = (acc[vote.selected_answer] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      await Promise.all(
        Object.entries(votesByAnswer).map(([answer, voteCount]) => {
          const authorId = playerAnswers[answer];
          if (authorId) {
            return supabase.from('scores').insert({
              game_id: gameId,
              round_id: round.id,
              player_id: authorId,
              points: voteCount,
              reason: 'Votos recibidos'
            });
          }
        })
      );

      // 3. Actualizar fase
      const { error: updateError } = await supabase
        .from('rounds')
        .update({ 
          voting_phase: false,
          reading_phase: false,
          results_phase: true
        })
        .eq('id', round.id);

      if (updateError) throw updateError;
    } catch (err) {
      console.error('Error transitioning to results phase:', err);
      setError('Error al mostrar los resultados');
    }
  };

  useEffect(() => {
    if (round?.results_phase && resultsCountdown > 0) {
      const timer = setInterval(() => {
        setResultsCountdown(prev => prev - 1);
      }, 1000);

      return () => clearInterval(timer);
    }

    if (round?.results_phase && resultsCountdown === 0) {
      navigate(`/game/${gameId}/scores`, { 
        state: { 
          playerName: currentPlayer?.name,
          roundNumber: round.number,
          roundId: round.id,
          moderatorId: round.moderator_id,
          usedQuestionIds: question?.id // Para no repetir preguntas
        } 
      });
    }
  }, [round?.results_phase, resultsCountdown, round?.id, gameId, navigate, currentPlayer?.name, round?.number]);

  useEffect(() => {
    if (!gameId || !round?.id) return;

    const roundChannel = supabase
      .channel(`round-${round.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rounds',
          filter: `id=eq.${round.id}`
        },
        (payload) => {
          const updatedRound = payload.new as Round;
          setRound(updatedRound);
          // Actualizar isReadingAnswers cuando el moderador inicia la lectura
          if (updatedRound.reading_phase) {
            setIsReadingAnswers(true);
          }
        }
      )
      .subscribe();

    return () => {
      roundChannel.unsubscribe();
    };
  }, [gameId, round?.id]);

  if (isLoading) {
    return (
      <div className="bg-[#E7E7E6] flex flex-col min-h-screen px-6">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#131309] text-lg">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#E7E7E6] flex flex-col min-h-screen px-6">
        <div className="mt-6">
          <Button
            variant="ghost"
            className="p-0 hover:bg-transparent"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-6 h-6 text-[#131309]" />
          </Button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <h1 className="[font-family:'Londrina_Solid'] text-[56px] text-[#131309] mb-16">
            BULLSHIT
          </h1>
          <div className="w-full max-w-[327px] bg-white rounded-[20px] p-5 space-y-5">
            <h2 className="font-bold text-xl text-[#131309]">Error</h2>
            <p className="text-base text-[#131309]">{error}</p>
            <Button
              className="w-full h-12 bg-[#CB1517] hover:bg-[#B31315] rounded-[10px] font-bold text-base"
              onClick={() => navigate('/')}
            >
              Volver al inicio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!round || !moderator || !currentPlayer || !question) {
    return (
      <div className="bg-[#E7E7E6] flex flex-col min-h-screen px-6">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#131309] text-lg">Cargando datos de la ronda...</p>
        </div>
      </div>
    );
  }

  const pendingPlayers = getPendingPlayers();

  if (round?.voting_phase) {
    if (isModerator) {
      const totalPlayers = players.filter(p => p.id !== round.moderator_id).length;
      const votedPlayers = votes.filter(vote => 
        players.some(p => p.id === vote.player_id && p.id !== round.moderator_id)
      ).length;
      
      const allVoted = votedPlayers === totalPlayers;
      const jugadoresText = totalPlayers === 1 ? "jugador" : "jugadores";

      return (
        <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center">
          <h1 className="[font-family:'Londrina_Solid'] text-[56px] text-[#131309] mt-12">
            BULLSHIT
          </h1>
          
          <p className="text-[#131309] text-xl mt-4">
            RONDA {round.number}
          </p>

          <div className="w-full max-w-[327px] bg-white rounded-[20px] mt-8 p-6">
            <p className="text-[#131309] text-xl text-center">
              {allVoted 
                ? "¡Ya han votado todos los jugadores!" 
                : `Han votado ${votedPlayers} de ${totalPlayers} ${jugadoresText}`}
            </p>

            {allVoted && (
              <button
                onClick={() => handleRevealResults()}
                className="w-full mt-6 p-4 bg-[#CB1517] hover:bg-[#B31315] text-white font-bold rounded-[10px] transition-colors"
              >
                Revelar resultados
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center">
        <h1 className="[font-family:'Londrina_Solid'] text-[56px] text-[#131309] mt-12">
          BULLSHIT
        </h1>
        
        <p className="text-[#131309] text-xl mt-4">
          RONDA {round.number}
        </p>

        <div className="w-full max-w-[327px] mt-8">
          {question && (
            <div className="space-y-4">
              <div className="bg-[#131309] rounded-[20px] p-6">
                <p className="text-white text-xl text-center">
                  {question.text}
                </p>
              </div>

              <div className="bg-white rounded-[20px] p-6">
                <p className="[font-family:'Londrina_Solid'] text-[40px] text-[#131309] text-center">
                  {question.content}
                </p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-[10px] p-6">
            <div className="space-y-4">
              {shuffledAnswers.map((answer, index) => {
                const isOwnAnswer = answer.playerId === currentPlayer?.id;
                const isDisabled = isOwnAnswer || hasVoted;
                const isSelected = selectedVote === answer.content;

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedVote(answer.content)}
                    className={`w-full p-4 rounded-[10px] text-left transition-colors ${
                      isDisabled && !isSelected
                        ? 'bg-[#E7E7E6] cursor-not-allowed opacity-50'
                        : isSelected
                        ? 'bg-[#131309] text-white'
                        : 'bg-white text-[#131309] hover:bg-gray-50 border border-[#E7E7E6]'
                    }`}
                    disabled={isDisabled}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold">
                        Opción {index + 1}
                      </span>
                      {isOwnAnswer && (
                        <span className="text-sm text-[#CB1517]">
                          Tu respuesta
                        </span>
                      )}
                    </div>
                    <p className="text-lg font-['Londrina_Solid']" style={{ fontFamily: 'cursive' }}>
                      {answer.content}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {!hasVoted && (
          <div className="fixed bottom-0 left-0 right-0">
            <div className="bg-white w-full px-6 pt-5 pb-8">
              <div className="max-w-[327px] mx-auto">
                {selectedVote ? (
                  <button
                    onClick={() => handleVote(selectedVote)}
                    className="w-full p-4 bg-[#CB1517] hover:bg-[#B31315] text-white font-bold rounded-[10px] transition-colors"
                  >
                    Confirmar voto
                  </button>
                ) : (
                  <p className="text-center text-[#131309] opacity-50">
                    Selecciona una respuesta para votar
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {hasVoted && (
          <div className="fixed bottom-0 left-0 right-0">
            <div className="bg-white w-full px-6 pt-5 pb-8">
              <div className="max-w-[327px] mx-auto">
                <p className="text-center text-[#131309] font-bold">
                  ¡Voto registrado!
                </p>
                <p className="text-center text-[#131309] mt-2">
                  {allPlayersVoted 
                    ? "¡Ya han votado todos los jugadores!" 
                    : "Esperando al resto de jugadores..."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (round?.results_phase) {
    return (
      <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center">
        <h1 className="[font-family:'Londrina_Solid'] text-[56px] text-[#131309] mt-12">
          BULLSHIT
        </h1>
        
        <p className="text-[#131309] text-xl mt-4">
          RONDA {round.number}
        </p>

        <div className="w-full max-w-[327px] mt-8">
          {question && (
            <div className="space-y-4">
              <div className="bg-[#131309] rounded-[20px] p-6">
                <p className="text-white text-xl text-center">
                  {question.text}
                </p>
              </div>

              <div className="bg-white rounded-[20px] p-6">
                <p className="[font-family:'Londrina_Solid'] text-[40px] text-[#131309] text-center">
                  {question.content}
                </p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-[10px] p-6">
            <p className="text-[#131309] text-xl font-bold text-center mb-6">
              Resultados de la votación
            </p>
            
            <div className="space-y-4">
              {shuffledAnswers.map((answer, index) => {
                const isCorrectAnswer = answer.isCorrectAnswer;
                const isOwnAnswer = answer.playerId === currentPlayer?.id;
                const votesForThisAnswer = votes.filter(
                  vote => vote.selected_answer === answer.content
                ).length;
                const answerPlayer = players.find(p => p.id === answer.playerId);

                return (
                  <div 
                    key={index}
                    className={`w-full p-4 rounded-[10px] border ${
                      isCorrectAnswer 
                        ? 'border-green-500 bg-green-50'
                        : 'border-[#E7E7E6]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">
                          Opción {index + 1}
                        </span>
                        {isCorrectAnswer && (
                          <span className="text-[#9FFF00] bg-[#131309] px-3 py-1 rounded-full text-sm font-bold">
                            Respuesta real
                          </span>
                        )}
                      </div>
                      {isOwnAnswer && (
                        <span className="text-sm text-[#CB1517]">
                          Tu respuesta
                        </span>
                      )}
                    </div>

                    <p className="text-lg font-['Londrina_Solid']" style={{ fontFamily: 'cursive' }}>
                      {answer.content}
                    </p>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {!isCorrectAnswer && answerPlayer && (
                          <>
                            <div 
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold"
                              style={{ backgroundColor: answerPlayer.avatar_color }}
                            >
                              {answerPlayer.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-gray-600">
                              {answerPlayer.name}
                            </span>
                          </>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {votesForThisAnswer} {votesForThisAnswer === 1 ? 'voto' : 'votos'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0">
          <div className="bg-white w-full px-6 pt-5 pb-8">
            <div className="max-w-[327px] mx-auto">
              <div className="flex flex-col items-center">
                <span className="text-xl font-bold mb-4">{resultsCountdown}s</span>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#CB1517] transition-all duration-1000 ease-linear"
                    style={{ width: `${(resultsCountdown / 20) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (round?.scoring_phase) {
    return (
      <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center justify-center">
        <h1 className="[font-family:'Londrina_Solid'] text-[56px] text-[#131309]">
          Puntuaciones
        </h1>
      </div>
    );
  }

  if (round?.reading_phase) {
    return (
      <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center">
        {/* Solo mostrar el overlay para los no moderadores */}
        {!isModerator && <ReadingOverlay />}

        <h1 className="[font-family:'Londrina_Solid'] text-[56px] text-[#131309] mt-12">
          BULLSHIT
        </h1>

        {/* Solo mostrar las cards si es moderador y está en fase de lectura */}
        {isModerator && isReadingAnswers && shuffledAnswers.length > 0 ? (
          <>
            <div className="w-full max-w-[327px] mt-8">
              <p className="text-[#131309] text-xl mb-6">
                {question?.text} {question?.content}
              </p>

              <div className="bg-[#131309] rounded-[20px] p-6 mb-6">
                <p className="text-white text-center">
                  Lee las respuestas al resto de jugadores.
                  Se han ordenado aleatoriamente junto a la respuesta real.
                </p>
              </div>

              <div className="relative h-[300px]">
                {exitingCards.map(card => (
                  <div
                    key={`exiting-${card.index}`}
                    className={`absolute top-0 left-0 right-0 w-full h-[300px] ${
                      slideDirection === 'left' ? 'animate-exitLeft' : 'animate-exitRight'
                    }`}
                    style={{
                      zIndex: 100 + card.index,
                      transform: `rotate(${(card.index % 3 - 1) * 2}deg)`,
                    }}
                  >
                    <div className="bg-white rounded-[20px] p-6 relative shadow-md h-[300px]">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[#131309] text-xl">
                          Opción {card.index + 1} de {shuffledAnswers.length}
                        </p>
                      </div>
                      <div className="bg-white rounded-[10px] p-4 h-[200px]">
                        <p 
                          className="text-[#131309] text-2xl"
                          style={{ fontFamily: 'Caveat, cursive' }}
                        >
                          {card.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Carta actual con animación */}
                <div 
                  className={`absolute top-0 left-0 right-0 w-full h-[300px] ${
                    slideDirection === 'left' 
                      ? 'animate-slideLeft' 
                      : 'animate-slideRight'
                  }`}
                  style={{
                    zIndex: currentAnswerIndex + 1,
                    transform: `rotate(${(currentAnswerIndex % 3 - 1) * 2}deg)`,
                  }}
                >
                  <div className="bg-white rounded-[20px] p-6 relative shadow-md h-[300px]">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[#131309] text-xl">
                        Opción {currentAnswerIndex + 1} de {shuffledAnswers.length}
                      </p>
                    </div>
                    <div className="bg-white rounded-[10px] p-4 h-[200px]">
                      <p 
                        className="text-[#131309] text-2xl"
                        style={{ fontFamily: 'Caveat, cursive' }}
                      >
                        {shuffledAnswers[currentAnswerIndex].content}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0">
              <div className="bg-white w-full px-6 pt-5 pb-8">
                <div className="max-w-[327px] mx-auto flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={handlePrevAnswer}
                    disabled={currentAnswerIndex === 0}
                    className="w-12 h-12 bg-[#E7E7E6] rounded-[10px] flex items-center justify-center"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </Button>
                  <Button
                    className="flex-1 h-12 bg-[#CB1517] hover:bg-[#B31315] rounded-[10px] font-bold text-base"
                    onClick={handleNextAnswer}
                  >
                    {currentAnswerIndex === shuffledAnswers.length - 1 ? "Finalizar" : "Siguiente"}
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full max-w-[327px] mt-8 space-y-4">
            <div className="bg-[#131309] rounded-[20px] p-6">
              <p className="text-white text-xl text-center">
                {question?.text}
              </p>
            </div>

            <div className="bg-white rounded-[20px] p-6">
              <p className="[font-family:'Londrina_Solid'] text-[40px] text-[#131309] text-center">
                {question?.content}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center">
      <h1 className="[font-family:'Londrina_Solid'] text-[56px] text-[#131309] mt-12">
        BULLSHIT
      </h1>
      
      <p className="text-[#131309] text-xl mt-4">
        RONDA {round.number}
      </p>

      {isModerator && isReadingAnswers && shuffledAnswers.length > 0 ? (
        <>
          <div className="w-full max-w-[327px] mt-8">
            <p className="text-[#131309] text-xl mb-6">
              {question?.text} {question?.content}
            </p>

            <div className="bg-[#131309] rounded-[20px] p-6 mb-6">
              <p className="text-white text-center">
                Lee las respuestas al resto de jugadores.
                Se han ordenado aleatoriamente junto a la respuesta real.
              </p>
            </div>

            <div className="relative h-[300px]">
              {exitingCards.map(card => (
                <div
                  key={`exiting-${card.index}`}
                  className={`absolute top-0 left-0 right-0 w-full h-[300px] ${
                    slideDirection === 'left' ? 'animate-exitLeft' : 'animate-exitRight'
                  }`}
                  style={{
                    zIndex: 100 + card.index,
                    transform: `rotate(${(card.index % 3 - 1) * 2}deg)`,
                  }}
                >
                  <div className="bg-white rounded-[20px] p-6 relative shadow-md h-[300px]">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[#131309] text-xl">
                        Opción {card.index + 1} de {shuffledAnswers.length}
                      </p>
                    </div>
                    <div className="bg-white rounded-[10px] p-4 h-[200px]">
                      <p 
                        className="text-[#131309] text-2xl"
                        style={{ fontFamily: 'Caveat, cursive' }}
                      >
                        {card.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Carta actual con animación */}
              <div 
                className={`absolute top-0 left-0 right-0 w-full h-[300px] ${
                  slideDirection === 'left' 
                    ? 'animate-slideLeft' 
                    : 'animate-slideRight'
                }`}
                style={{
                  zIndex: currentAnswerIndex + 1,
                  transform: `rotate(${(currentAnswerIndex % 3 - 1) * 2}deg)`,
                }}
              >
                <div className="bg-white rounded-[20px] p-6 relative shadow-md h-[300px]">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[#131309] text-xl">
                      Opción {currentAnswerIndex + 1} de {shuffledAnswers.length}
                    </p>
                  </div>
                  <div className="bg-white rounded-[10px] p-4 h-[200px]">
                    <p 
                      className="text-[#131309] text-2xl"
                      style={{ fontFamily: 'Caveat, cursive' }}
                    >
                      {shuffledAnswers[currentAnswerIndex].content}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0">
            <div className="bg-white w-full px-6 pt-5 pb-8">
              <div className="max-w-[327px] mx-auto flex gap-3">
                <Button
                  variant="secondary"
                  onClick={handlePrevAnswer}
                  disabled={currentAnswerIndex === 0}
                  className="w-12 h-12 bg-[#E7E7E6] rounded-[10px] flex items-center justify-center"
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button
                  className="flex-1 h-12 bg-[#CB1517] hover:bg-[#B31315] rounded-[10px] font-bold text-base"
                  onClick={handleNextAnswer}
                >
                  {currentAnswerIndex === shuffledAnswers.length - 1 ? "Finalizar" : "Siguiente"}
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {countdown > 0 ? (
            <>
              <div className="w-full max-w-[327px] aspect-[1.6] bg-[#131309] rounded-[20px] mt-8 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-[200px] font-bold text-[#131309] opacity-10 select-none">
                    BULLSHIT
                  </div>
                </div>
                
                <div className="relative z-10 flex flex-col items-center">
                  <div className="bg-[#9FFF00] w-20 h-20 rounded-[10px] flex items-center justify-center mb-4">
                    <span className="text-4xl">{getCategoryIcon()}</span>
                  </div>
                  <p className="text-[#9FFF00] text-2xl font-bold uppercase">
                    {round.category}
                  </p>
                </div>
              </div>

              <p className="text-[#131309] text-xl mt-8">
                MODERADOR
              </p>

              <div className="mt-4 flex flex-col items-center">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                  style={{ backgroundColor: moderator.avatar_color }}
                >
                  {moderator.name.charAt(0).toUpperCase()}
                </div>
                <p className="text-[#131309] text-xl mt-2">{moderator.name}</p>
              </div>

              <div className="fixed bottom-0 left-0 right-0">
                <div className="bg-white w-full px-6 pt-5 pb-8">
                  <div className="max-w-[327px] mx-auto">
                    <div className="flex flex-col items-center">
                      <span className="text-4xl font-bold mb-4">{countdown}</span>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#CB1517] transition-all duration-1000 ease-linear"
                          style={{ width: `${(countdown / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {question && (
                <div className="w-full max-w-[327px] bg-white rounded-[20px] mt-8 p-6">
                  <div className="space-y-4">
                    <div className="bg-[#131309] rounded-[20px] p-6">
                      <p className="text-white text-xl text-center">
                        {question.text}
                      </p>
                    </div>

                    <div className="bg-white rounded-[20px] p-6">
                      <p className="[font-family:'Londrina_Solid'] text-[40px] text-[#131309] text-center">
                        {question.content}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!isModerator && question && !hasAnswered && (
                <div className="fixed bottom-0 left-0 right-0">
                  <div className="bg-white w-full px-6 pt-5 pb-8">
                    <div className="max-w-[327px] mx-auto space-y-4">
                      <textarea
                        className="w-full min-h-[120px] p-4 border border-[#13130920] rounded-[20px] text-[#131309] resize-none"
                        placeholder="Tu respuesta"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                      />
                      <Button
                        className="w-full h-12 bg-[#CB1517] hover:bg-[#B31315] rounded-[10px] font-bold text-base"
                        onClick={handleSubmitAnswer}
                        disabled={!answer.trim()}
                      >
                        Enviar respuesta
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {!isModerator && hasAnswered && (
                <div className="fixed bottom-0 left-0 right-0">
                  <div className="bg-white w-full px-6 pt-5 pb-8">
                    <div className="max-w-[327px] mx-auto flex flex-col items-center">
                      {isReadingAnswers ? (
                        <p className="text-[#131309] text-xl font-bold">
                          El moderador está leyendo las respuestas
                        </p>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-[#131309] rounded-full flex items-center justify-center mb-6">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                              <path d="M20 6L9 17L4 12" stroke="#9FFF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                          <p className="text-[#131309] text-2xl font-bold mb-4">
                            ¡Respuesta enviada!
                          </p>
                          <p className="text-[#131309] text-base text-center">
                            {moderator?.name} os leerá vuestra mierda de respuestas cuando todos la hayan enviado.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {isModerator && question && !isReadingAnswers && (
                <div className="fixed bottom-0 left-0 right-0">
                  <div className="bg-white w-full px-6 pt-5 pb-8">
                    <div className="max-w-[327px] mx-auto flex flex-col items-center">
                      <Timer className="w-8 h-8 text-[#131309] mb-2" />
                      <p className="text-[#131309] text-xl font-bold mb-1">
                        Esperando las respuestas
                      </p>
                      {pendingPlayers.length > 0 ? (
                        <>
                          <p className="text-[#131309] text-base mb-4">
                            Quedan {pendingPlayers.length} jugadores por enviar la suya:
                          </p>
                          <div className="w-full space-y-2 mb-4">
                            {pendingPlayers.map(player => (
                              <div 
                                key={player.id}
                                className="flex items-center gap-3 p-3 bg-[#E7E7E6] rounded-[10px]"
                              >
                                <div 
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-base"
                                  style={{ backgroundColor: player.avatar_color }}
                                >
                                  {player.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="flex-1 font-normal text-base text-[#131309]">
                                  {player.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-[#131309] text-base mb-4">
                          ¡Todas las respuestas recibidas!
                        </p>
                      )}
                      <Button
                        className="w-full h-12 bg-[#E7E7E6] text-[#131309] hover:bg-[#d1d1d0] rounded-[10px] font-bold text-base"
                        onClick={handleStartReadingAnswers}
                        disabled={pendingPlayers.length > 0}
                      >
                        Leer las respuestas
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};