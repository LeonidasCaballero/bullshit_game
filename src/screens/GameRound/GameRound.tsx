import { Button } from "../../components/ui/button";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase, subscribeToAnswers, subscribeToRound, subscribeToVotes } from "../../lib/supabase";
import { ArrowLeft, ChevronLeft, Loader2 } from "lucide-react";
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

// Añadir este array de insultos en la parte superior, justo después de las interfaces
const INSULTOS = [
  "Eres la razón por la que los espejos tienen traumas.",
  "Si la fealdad fuera un delito, tendrías cadena perpetua.",
  "Tu cara hace que los bebés lloren antes de conocerte.",
  "Eres el motivo por el que las luces se apagan en las fiestas.",
  "Pareces un experimento de Photoshop que salió mal.",
  "Tu reflejo en el agua haría huir hasta a los peces.",
  "Eres la prueba de que la evolución a veces da marcha atrás.",
  "Si fueras un emoji, serías el que nadie usa.",
  "Los sustos de Halloween se inspiran en tu foto de perfil.",
  "Si la belleza está en el interior, ¿has intentado voltearte?",
];

// Solo el componente ReadingOverlay fuera
const ReadingOverlay = () => (
  <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-50">
    <Loader2 className="h-8 h-8 animate-spin text-white mb-4" />
    <p className="text-white text-lg text-center px-4">
      El moderador está leyendo vuestras burradas
    </p>
  </div>
);

// Definir la interfaz para los scores fuera del componente
interface Score {
  game_id: string;
  round_id: string;
  player_id: string;
  points: number;
  reason: string;
}

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
  const votesChannelRef = useRef<any>(null);

  const [slideDirection, setSlideDirection] = useState('right');
  const [exitingCards, setExitingCards] = useState<ExitingCard[]>([]);

  const [showInsult, setShowInsult] = useState(false);
  const [insultoActual, setInsultoActual] = useState("");

  const hasProcessedVotes = useRef(false);

  // Usar solo el setter del estado
  const [, setTotalScores] = useState<Record<string, number>>({});

  // Modificar el InsultPopup para hacerlo más bonito y añadir el nombre del moderador
  const InsultPopup = () => (
    <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-[20px] p-8 mx-4 w-full max-w-[350px] relative shadow-xl animate-scaleIn">
        <button 
          onClick={() => setShowInsult(false)}
          className="absolute top-4 right-4 text-[#131309] hover:text-[#131309]/70 w-8 h-8 flex items-center justify-center rounded-full bg-[#E7E7E6] hover:bg-[#D1D1D0] transition-colors"
        >
          ✕
        </button>
        
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-[#CB1517] rounded-full flex items-center justify-center mb-4 animate-pulse">
            <span className="text-white text-3xl">🔥</span>
          </div>
          
          <p className="text-[#131309] text-base mb-4 text-center">
            Un mensaje de parte de <span className="font-bold">{moderator?.name}</span>, el moderador...
          </p>
          
          <div className="bg-[#131309] rounded-[15px] p-6 w-full">
            <p className="text-white text-xl font-bold text-center italic">
              "{insultoActual}"
            </p>
          </div>
        </div>
      </div>
    </div>
  );

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
      
      // Notificar a todos sobre el nuevo voto usando broadcast
      supabase
        .channel('votes-broadcast')
        .send({
          type: 'broadcast',
          event: 'new-vote',
          payload: { roundId: round.id }
        })
        .then(() => console.log('📢 Broadcast de nuevo voto enviado'))
        .catch(err => console.error('❌ Error enviando broadcast:', err));
      
      setHasVoted(true);
      setSelectedVote(selectedAnswer);
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
      
      // Enviar broadcast para notificar a todos los jugadores
      supabase
        .channel(`round-updates-${round.id}`)
        .send({
          type: 'broadcast',
          event: 'round-update',
          payload: { round: { ...round, reading_phase: false, voting_phase: true } }
        })
        .then(() => console.log('✅ Broadcast de fase de votación enviado'))
        .catch(err => console.error('❌ Error enviando broadcast:', err));
      
      setIsReadingAnswers(false);
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
    console.log('🔄 Recibidas nuevas respuestas:', newAnswers.length);
    
    // Actualizar el estado de respuestas
    setAnswers(newAnswers);
    
    // Actualizar si el jugador actual ha respondido
    if (currentPlayer) {
      const hasPlayerAnswered = newAnswers.some(a => a.player_id === currentPlayer.id);
      console.log(`👤 ¿${currentPlayer.name} ha respondido?`, hasPlayerAnswered);
      setHasAnswered(hasPlayerAnswered);
    }
    
    // Forzar actualización de jugadores pendientes
    const pending = players.filter(player => 
      player.id !== round?.moderator_id && 
      !newAnswers.some(a => a.player_id === player.id)
    );
    console.log(`⏳ Jugadores pendientes: ${pending.length}`);
  }, [currentPlayer, players, round?.moderator_id]);

  useEffect(() => {
    const setupGame = async () => {
      if (!gameId || !location.state?.playerName) return;

      try {
        console.log('🎮 Configurando juego inicial...');
        
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
        console.error('Error en setup:', err);
        setError('Error al cargar la ronda');
        if (retryCount < maxRetries) {
          setTimeout(() => setRetryCount(prev => prev + 1), retryDelay);
        }
      }
    };

    setupGame();

    // Limpiar solo cuando el componente se desmonta
    return () => {
      console.log('🧹 Limpieza final de suscripciones');
      if (answersChannelRef.current) {
        answersChannelRef.current.unsubscribe();
        answersChannelRef.current = null;
      }
      if (roundChannelRef.current) {
        roundChannelRef.current.unsubscribe();
        roundChannelRef.current = null;
      }
    };
  }, [gameId, location.state?.playerName]);

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
      console.log('📤 Enviando respuesta...');
      
      // Directamente intentamos insertar la respuesta
      const { error: submitError } = await supabase
        .from('answers')
        .insert([{
          round_id: round.id,
          player_id: currentPlayer.id,
          content: answer.trim()
        }]);

      if (submitError) {
        // Si ya existe una respuesta, Supabase devolverá un error de duplicado
        if (submitError.code === '23505') {
          console.log('⚠️ Ya habías enviado una respuesta anteriormente');
          setHasAnswered(true);
          setAnswer('');
          return;
        }
        
        console.error('❌ Error específico al enviar:', submitError);
        throw submitError;
      }
      
      console.log('✅ Respuesta enviada correctamente');
      
      // Notificar a todos sobre la nueva respuesta usando broadcast
      supabase
        .channel('answers-broadcast')
        .send({
          type: 'broadcast',
          event: 'new-answer',
          payload: { roundId: round.id }
        })
        .then(() => console.log('📢 Broadcast de nueva respuesta enviado'))
        .catch(err => console.error('❌ Error enviando broadcast:', err));
      
      setAnswer('');
      setHasAnswered(true);
    } catch (err) {
      console.error('❌ Error submitting answer:', err);
      setError('Error al enviar la respuesta');
    }
  };

  const handleStartReadingAnswers = async () => {
    if (!round) return;
    
    try {
      const { error: updateError } = await supabase
        .from('rounds')
        .update({ reading_phase: true })
        .eq('id', round.id);

      if (updateError) throw updateError;
      
      // Enviar broadcast para notificar a todos los jugadores
      supabase
        .channel(`round-updates-${round.id}`)
        .send({
          type: 'broadcast',
          event: 'round-update',
          payload: { round: { ...round, reading_phase: true } }
        })
        .then(() => console.log('✅ Broadcast de fase de lectura enviado'))
        .catch(err => console.error('❌ Error enviando broadcast:', err));

      setIsReadingAnswers(true);
      prepareShuffledAnswers();
    } catch (err) {
      console.error('Error starting reading phase:', err);
      setError('Error al iniciar la fase de lectura');
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
    if (!round?.voting_phase || !round?.id) return;

    console.log('🔊 Configurando suscripción para votos...');
    
    if (votesChannelRef.current) {
      votesChannelRef.current.unsubscribe();
    }
    
    votesChannelRef.current = subscribeToVotes(round.id, (newVotes) => {
      console.log('🔄 Recibidos votos actualizados:', newVotes.length);
      setVotes(newVotes);
      
      // Actualizar si el jugador actual ha votado
      if (currentPlayer) {
        const hasPlayerVoted = newVotes.some(v => v.player_id === currentPlayer.id);
        setHasVoted(hasPlayerVoted);
      }
      
      // Verificar si todos han votado
      const nonModeratorPlayers = players.filter(p => p.id !== round.moderator_id);
      const allVoted = nonModeratorPlayers.every(player => 
        newVotes.some(vote => vote.player_id === player.id)
      );
      setAllPlayersVoted(allVoted);
    });
    
    return () => {
      if (votesChannelRef.current) {
        votesChannelRef.current.unsubscribe();
        votesChannelRef.current = null;
      }
    };
  }, [round?.id, round?.voting_phase, players, currentPlayer]);

  const handleRevealResults = async () => {
    if (!round) return;
    
    try {
      console.log('🏆 Revelando resultados...');
      
      // Actualizar la base de datos correctamente
      const { error: updateError } = await supabase
        .from('rounds')
        .update({ 
          results_phase: true,
          voting_phase: false  // Desactivar fase de votación
        })
        .eq('id', round.id);

      if (updateError) throw updateError;
      
      // Actualizar el objeto round con los cambios correctos
      const updatedRound = {
        ...round, 
        results_phase: true,
        voting_phase: false
      };
      
      // Enviar broadcast con el estado correcto
      supabase
        .channel(`round-updates-${round.id}`)
        .send({
          type: 'broadcast',
          event: 'round-update',
          payload: { round: updatedRound }
        })
        .then(() => console.log('✅ Broadcast de fase de resultados enviado'))
        .catch(err => console.error('❌ Error enviando broadcast:', err));
      
      // Actualizar el estado local
      setRound(updatedRound);
      setResultsCountdown(20);
    } catch (err) {
      console.error('Error revealing results:', err);
      setError('Error al revelar resultados');
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

    console.log('🔊 Configurando canal de broadcast para insultos...');
    
    const insultoChannel = supabase
      .channel('insulto-broadcast')
      .on('broadcast', { event: 'insulto' }, (payload) => {
        console.log('📢 Recibido insulto por broadcast:', payload);
        // Seleccionar un insulto aleatorio
        const insultoRandom = INSULTOS[Math.floor(Math.random() * INSULTOS.length)];
        setInsultoActual(insultoRandom);
        setShowInsult(true);
      })
      .subscribe((status) => {
        console.log(`📡 Estado de suscripción a insultos: ${status}`);
      });

    return () => {
      console.log('🧹 Limpiando canal de broadcast de insultos');
      insultoChannel.unsubscribe();
    };
  }, [gameId, round?.id]);

  // Añadir este useEffect para debuggear
  useEffect(() => {
    console.log('💫 Estado showInsult actualizado:', showInsult);
  }, [showInsult]);

  // Añadir esta función para preparar las respuestas mezcladas
  const prepareShuffledAnswers = async () => {
    if (!question || !round) return;

    try {
      // Obtener las respuestas con datos de jugadores
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

      // Combinar respuesta correcta con respuestas de jugadores
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

      // Mezclar aleatoriamente
      const shuffled = allAnswers.sort(() => Math.random() - 0.5);
      setShuffledAnswers(shuffled);
      setCurrentAnswerIndex(0);
    } catch (err) {
      console.error('Error preparando respuestas:', err);
      setError('Error al preparar las respuestas');
    }
  };

  // Añadir un nuevo useEffect para las actualizaciones de ronda
  useEffect(() => {
    if (!gameId || !round?.id) return;

    console.log('🔄 Configurando canal de actualizaciones de ronda:', round.id);
    
    const roundBroadcast = supabase
      .channel(`round-updates-${round.id}`)
      .on('broadcast', { event: 'round-update' }, (payload) => {
        console.log('📢 Actualización de ronda recibida:', payload);
        const updatedRound = payload.payload.round as Round;
        
        // Actualizar el estado round
        setRound(updatedRound);
        
        // Usar condiciones mutuamente excluyentes
        if (updatedRound.reading_phase) {
          console.log('🎭 Fase de lectura activada');
          setIsReadingAnswers(true);
        }
        else if (updatedRound.voting_phase) {
          console.log('🗳️ Fase de votación activada');
          setIsReadingAnswers(false);
        }
        else if (updatedRound.results_phase) {
          console.log('🏆 Fase de resultados activada');
          setResultsCountdown(20);
        }
      })
      .subscribe((status) => {
        console.log(`📡 Estado de suscripción a actualizaciones de ronda: ${status}`);
      });

    return () => {
      console.log('🧹 Limpiando suscripción a actualizaciones de ronda');
      roundBroadcast.unsubscribe();
    };
  }, [gameId, round?.id]);

  // Versión mejorada de calculateTotalScores sin depender de RPC
  const calculateTotalScores = useCallback(async () => {
    if (!gameId) return {};
    
    try {
      console.log('📊 Calculando puntuaciones totales para el juego:', gameId);
      
      // Consulta directa a la tabla scores sin filtrado adicional
      const { data: scores, error } = await supabase
        .from('scores')
        .select('player_id, points')
        .eq('game_id', gameId);
      
      if (error) {
        console.error('❌ Error obteniendo puntuaciones:', error);
        return {};
      }
      
      if (!scores || scores.length === 0) {
        console.log('⚠️ No hay puntuaciones registradas para este juego');
        return {};
      }
      
      // Agrupar por jugador
      const totals = scores.reduce((acc, score) => {
        const playerId = score.player_id;
        acc[playerId] = (acc[playerId] || 0) + score.points;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('✅ Puntuaciones calculadas:', totals);
      return totals;
      
    } catch (error) {
      console.error('❌ Error calculando puntuaciones:', error);
      return {};
    }
  }, [gameId]);

  // IMPORTANTE: Solo usar totalScores después de su declaración

  // Primero necesitamos una función para calcular los puntos
  const calculateScores = useCallback(() => {
    if (!question || !votes || !answers) return {};
    
    // Objeto para almacenar los puntos por jugador
    const scores: Record<string, {points: number, details: string[], playerAnswer: string | null}> = {};
    
    // Inicializar puntuaciones para todos los jugadores
    players.forEach(player => {
      const playerAnswer = answers.find(a => a.player_id === player.id)?.content || null;
      scores[player.id] = {points: 0, details: [], playerAnswer};
    });
    
    // 1. Puntos por votos correctos (2 puntos)
    votes.forEach(vote => {
      if (vote.selected_answer === question.correct_answer) {
        scores[vote.player_id].points += 2;
        scores[vote.player_id].details.push('✅ +2pts por votar la respuesta correcta');
      }
    });
    
    // 2. Puntos por votos recibidos (1 punto por voto)
    const playerAnswers = answers.reduce((acc, answer) => {
      acc[answer.content] = answer.player_id;
      return acc;
    }, {} as Record<string, string>);
    
    votes.forEach(vote => {
      if (vote.selected_answer !== question.correct_answer) {
        const authorId = playerAnswers[vote.selected_answer];
        if (authorId) {
          scores[authorId].points += 1;
          scores[authorId].details.push(`🎯 +1pt por engañar a ${players.find(p => p.id === vote.player_id)?.name || 'alguien'}`);
        }
      }
    });
    
    return scores;
  }, [question, votes, answers, players]);

  // Función simplificada de processVotes sin depender de round_results
  const processVotes = async () => {
    try {
      if (!round?.id || !gameId || !question || !votes || !answers) {
        console.error('❌ Faltan datos necesarios para procesar votos');
        return;
      }

      // CAMBIO CRÍTICO: Usar una transacción con bloqueo
      const { data: isLocked } = await supabase.rpc('lock_round_for_processing', {
        round_id_param: round.id
      });
      
      if (!isLocked) {
        console.log('⚠️ La ronda está siendo procesada por otra instancia');
        return;
      }

      console.log('🔒 Ronda bloqueada para procesamiento exclusivo');

      // Primero verificamos si ya existen puntuaciones
      const { data: existingScores } = await supabase
        .from('scores')
        .select('id')
        .eq('round_id', round.id)
        .limit(1);

      if (existingScores && existingScores.length > 0) {
        console.log('⚠️ Los puntos para esta ronda ya fueron procesados');
        return;
      }

      console.log('🎯 Procesando votos para la ronda:', round.id);

      const scoresToInsert: Score[] = [];

      // 1. Procesar votos correctos (2 puntos por acertar)
      const correctVoters = votes
        .filter(vote => vote.selected_answer === question.correct_answer);

      console.log('✓ Votos correctos:', correctVoters.length);

      // Añadir puntuaciones por votos correctos
      correctVoters.forEach(vote => {
        scoresToInsert.push({
          game_id: gameId,
          round_id: round.id,
          player_id: vote.player_id,
          points: 2,
          reason: 'Voto correcto'
        });
      });

      // 2. Procesar votos recibidos (1 punto por cada voto recibido)
      const answerMap = new Map(
        answers.map(answer => [answer.content, answer.player_id])
      );

      const votesByAnswer = votes
        .filter(vote => vote.selected_answer !== question.correct_answer)
        .reduce((acc, vote) => {
          acc[vote.selected_answer] = (acc[vote.selected_answer] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      console.log('📊 Distribución de votos:', votesByAnswer);

      // Añadir puntuaciones por votos recibidos
      Object.entries(votesByAnswer).forEach(([answer, voteCount]) => {
        const authorId = answerMap.get(answer);
        if (authorId) {
          scoresToInsert.push({
            game_id: gameId,
            round_id: round.id,
            player_id: authorId,
            points: voteCount,
            reason: 'Votos recibidos'
          });
        }
      });

      console.log('💾 Puntuaciones a insertar:', scoresToInsert);

      // Insertar las puntuaciones
      if (scoresToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('scores')
          .insert(scoresToInsert);

        if (insertError) {
          console.error('❌ Error insertando puntuaciones:', insertError);
          return;
        }

        console.log('✅ Puntuaciones insertadas correctamente');
      }

      // Actualizar fase de la ronda
      const { error: updateError } = await supabase
        .from('rounds')
        .update({ 
          results_phase: true,
          voting_phase: false 
        })
        .eq('id', round.id);

      if (updateError) {
        console.error('❌ Error actualizando fase de la ronda:', updateError);
      }

    } catch (error) {
      console.error('❌ Error procesando votos:', error);
    }
  };

  // UseEffect mejorado con control de limpieza
  useEffect(() => {
    let isCancelled = false;
    const processingKey = `processing_${round?.id}`;
    
    // Verificar en sessionStorage si ya se está procesando
    if (sessionStorage.getItem(processingKey)) {
      console.log('⏱️ Esta ronda ya está siendo procesada en otra pestaña');
      return () => {};
    }
    
    const handleResultsPhase = async () => {
      if (round?.results_phase && !hasProcessedVotes.current) {
        hasProcessedVotes.current = true;
        
        // Marcar como en procesamiento
        sessionStorage.setItem(processingKey, 'true');
        
        try {
          await processVotes();
          
          if (!isCancelled) {
            const scores = await calculateTotalScores();
            setTotalScores(scores);
          }
        } finally {
          // Limpiar la marca solo si no fue cancelado
          if (!isCancelled) {
            sessionStorage.removeItem(processingKey);
          }
        }
      }
    };
    
    handleResultsPhase();
    
    return () => {
      isCancelled = true;
      console.log('🧹 Limpiando efecto de procesamiento de votos');
    };
  }, [round?.results_phase]);

  // Usar un useEffect con mejor control de dependencias
  useEffect(() => {
    // Añadir estas variables para prevenir llamadas duplicadas
    let isLoading = false;
    let isMounted = true;
    
    const loadTotalScores = async () => {
      // Evitar ejecuciones simultáneas
      if (isLoading) return;
      isLoading = true;
      
      try {
        if (!round?.results_phase) return;
        
        console.log('🔄 Cargando puntuaciones totales...');
        const totals = await calculateTotalScores();
        
        // Solo actualizar si el componente sigue montado
        if (isMounted) {
          console.log('📊 Actualizando estado de puntuaciones');
          setTotalScores(totals);
        }
      } finally {
        isLoading = false;
      }
    };
    
    // Ejecutar solo una vez
    loadTotalScores();
    
    return () => {
      isMounted = false;
    };
  }, [round?.results_phase, calculateTotalScores]);

  // Corregir el error de handleSubmitVote
  const handleSubmitVote = async () => {
    // ... resto del código de manejo de votos
  };

  // Modificar para manejar correctamente la promesa de fetchTotalScores
  // Añadir estado para almacenar las puntuaciones totales
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
          <h1 className="[font-family:'Londrina_Solid'] text-[40px] text-[#131309] mb-16">
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
      );
      
      const pendingPlayers = players.filter(p => 
        p.id !== round.moderator_id && 
        !votes.some(v => v.player_id === p.id)
      );
      
      const allVoted = votedPlayers.length === totalPlayers;
      const jugadoresText = totalPlayers === 1 ? "jugador" : "jugadores";

      return (
        <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center">
          <h1 className="[font-family:'Londrina_Solid'] text-[40px] text-[#131309] mt-6">
            BULLSHIT
          </h1>
          
          <p className="text-[#131309] text-xl mt-4">
            RONDA {round.number}
          </p>

          <div className="w-full max-w-[327px] bg-white rounded-[20px] mt-8 p-6">
            <p className="text-[#131309] text-xl text-center">
              {allVoted 
                ? "¡Ya han votado todos los jugadores!" 
                : `Han votado ${votedPlayers.length} de ${totalPlayers} ${jugadoresText}`}
            </p>

            {!allVoted && pendingPlayers.length > 0 && (
              <div className="mt-6">
                <p className="text-[#131309] text-base font-bold mb-3">
                  Falta por votar:
                </p>
                <div className="space-y-2">
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
              </div>
            )}

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
        <h1 className="[font-family:'Londrina_Solid'] text-[40px] text-[#131309] mt-6">
          BULLSHIT
        </h1>
        
        <p className="text-[#131309] text-xl mt-4">
          RONDA {round.number}
        </p>

        <div className="w-full max-w-[375px] mt-4 mb-24 px-4">
          {/* Pregunta en formato pequeño arriba */}
          <div className="text-center mb-4">
            <p className="text-[#131309] text-sm">
              <span className="font-medium">{question?.text.replace(/\.$/, '')}</span>{' '}
              <span className="italic">{question?.content}</span>?
            </p>
            </div>

          {/* Contenedor negro con instrucciones */}
          <div className="bg-[#131309] rounded-[20px] px-6 py-4 mb-6">
            <p className="text-white text-center font-medium">
              Selecciona la respuesta real
            </p>
          </div>

          {/* Lista de opciones de respuesta */}
          <div className="space-y-3">
            {shuffledAnswers.map((answer, index) => {
              // Determinar si esta respuesta es del usuario actual
              const isOwnAnswer = answer.playerId === currentPlayer?.id;

              return (
                <div 
                  key={index}
                  className={`
                    bg-white rounded-[15px] p-4 border-2 transition-all
                    ${selectedVote === answer.content 
                      ? 'border-[#CB1517]' 
                      : hasVoted 
                        ? 'border-transparent opacity-50' 
                        : isOwnAnswer
                          ? 'border-[#E7E7E6] opacity-70 cursor-not-allowed' 
                          : 'border-transparent hover:border-[#CB1517] cursor-pointer'
                      }
                  `}
                  onClick={() => !hasVoted && !isOwnAnswer && handleVote(answer.content)}
                >
                  <div className="flex justify-between items-center">
                    <p 
                      className="text-[#131309] text-lg"
                      style={{ fontFamily: 'Caveat, cursive' }}
                    >
                      {answer.content}
                    </p>
                    
                    {isOwnAnswer && (
                      <span className="text-sm text-gray-500 italic">
                        (Tu respuesta)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Botón de votar en la parte inferior */}
        {round?.voting_phase && !isModerator && !hasVoted && selectedVote && (
          <div className="fixed bottom-0 left-0 right-0">
            <div className="bg-white w-full px-6 pt-5 pb-8">
              <div className="max-w-[327px] mx-auto">
                <Button
                  className="w-full h-12 bg-[#CB1517] hover:bg-[#B31315] rounded-[10px] font-bold text-base"
                  onClick={handleSubmitVote}
                >
                  Confirmar voto
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Mensaje después de votar */}
        {round?.voting_phase && !isModerator && hasVoted && (
          <div className="fixed bottom-0 left-0 right-0">
            <div className="bg-white w-full px-6 pt-5 pb-8">
              <div className="max-w-[327px] mx-auto flex flex-col items-center">
                <div className="w-16 h-16 bg-[#131309] rounded-full flex items-center justify-center mb-6">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17L4 12" stroke="#9FFF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-[#131309] text-2xl font-bold mb-4 text-center">
                  ¡Voto registrado!
                </p>
                <p className="text-[#131309] text-base text-center">
                  {allPlayersVoted 
                    ? "Todos han votado. Veremos los resultados pronto." 
                    : "Esperando a que los demás voten..."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (round?.results_phase) {
    // Las puntuaciones ya están en el estado, no necesitamos recalcularlas aquí
    const totalScores = calculateTotalScores();

    return (
      <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center">
        <h1 className="[font-family:'Londrina_Solid'] text-[40px] text-[#131309] mt-6">
          BULLSHIT
        </h1>
        
        <p className="text-[#131309] text-xl mt-4">
          RONDA {round.number}
        </p>

        <div className="w-full max-w-md px-4 mt-8 mb-28">
          <div className="bg-[#131309] rounded-[20px] p-6 mb-4">
            <h2 className="text-white text-xl font-bold text-center mb-2">
              Resultados
            </h2>
            <p className="text-white text-center">
              {question?.text}: <span className="font-bold">{question?.correct_answer}</span>
            </p>
          </div>
          
          <div className="space-y-4">
            {Object.entries(calculateScores())
              .sort(([playerIdA, scoreA], [playerIdB, scoreB]) => {
                // Si uno de ellos es el moderador, ponerlo al final
                if (playerIdA === round?.moderator_id) return 1;
                if (playerIdB === round?.moderator_id) return -1;
                
                // De lo contrario, ordenar por puntos (mayor a menor)
                return scoreB.points - scoreA.points;
              })
              .map(([playerId, {points, details, playerAnswer}]) => {
                const player = players.find(p => p.id === playerId);
                if (!player) return null;
                
                const isPlayerModerator = player.id === round?.moderator_id;
                const isCurrentPlayer = player.id === currentPlayer?.id;
                const playerVote = votes.find(v => v.player_id === playerId)?.selected_answer;
                const isCorrectVote = playerVote === question?.correct_answer;
                
                // Determinar el estilo de borde para el jugador actual
                let borderStyle = '';
                if (isCurrentPlayer && !isPlayerModerator) {
                  borderStyle = isCorrectVote ? 'border-2 border-[#9FFF00]' : 'border-2 border-[#CB1517]';
                }
                
                return (
                  <div 
                    key={playerId} 
                    className={`rounded-[20px] p-4 shadow-md ${
                      isPlayerModerator 
                        ? 'bg-[#F0F0E8] border-2 border-[#131309]' 
                        : isCurrentPlayer 
                          ? `bg-white ${borderStyle}` 
                          : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div 
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${isPlayerModerator ? 'ring-2 ring-[#131309]' : ''}`}
                        style={{ backgroundColor: player.avatar_color }}
                      >
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold">{player.name}</p>
                          {isPlayerModerator && (
                            <span className="bg-[#131309] text-white text-xs px-2 py-1 rounded-full">
                              Moderador
                            </span>
                          )}
                          {isCurrentPlayer && (
                            <span className="bg-[#E7E7E6] text-[#131309] text-xs px-2 py-1 rounded-full">
                              Tú
                            </span>
                          )}
                        </div>
                        {!isPlayerModerator && (
                          <p className="text-sm">{isCorrectVote ? '✅ Votó correctamente' : '❌ Engañado'}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="bg-[#9FFF00] px-3 py-1 rounded-full font-bold">
                          +{points} pts
                        </div>
                      </div>
                    </div>
                    
                    {/* Mostrar la respuesta del jugador (excepto para el moderador) */}
                    {playerAnswer && !isPlayerModerator && (
                      <div className="bg-gray-100 p-3 rounded-lg mb-2 mt-1">
                        <p className="text-sm text-gray-700 font-medium mb-1">Su respuesta:</p>
                        <p className="text-sm font-italic">"{playerAnswer}"</p>
                      </div>
                    )}
                    
                    {details.length > 0 && (
                      <div className="text-sm space-y-1">
                        {details.map((detail, i) => (
                          <p key={i}>{detail}</p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
          
          {resultsCountdown > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-white p-4">
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
          )}
        </div>
      </div>
    );
  }

  if (round?.scoring_phase) {
    return (
      <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center justify-center">
        <h1 className="[font-family:'Londrina_Solid'] text-[40px] text-[#131309]">
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

        <h1 className="[font-family:'Londrina_Solid'] text-[40px] text-[#131309] mt-6">
          BULLSHIT
        </h1>

        {/* Solo mostrar las cards si es moderador y está en fase de lectura */}
      {isModerator && isReadingAnswers && shuffledAnswers.length > 0 ? (
        <>
            <div className="w-full max-w-[375px] mt-8 mb-28">
              <div className="text-center mb-6">
                <p className="text-[#131309] text-lg font-bold">
                  {question?.text.replace(/\.$/, '')} <span className="italic">{question?.content}</span>?
                </p>
              </div>

              <div className="bg-[#131309] rounded-[20px] p-6 px-8 py-4 mb-6">
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
          <div className="w-full max-w-[375px] mt-8 space-y-4">
            <div className="bg-[#131309] rounded-[20px] p-6">
              <p className="text-white text-xl text-center">
                {question?.text}
              </p>
            </div>

            <div className="bg-white rounded-[20px] p-4">
              <p className="[font-family:'Londrina_Solid'] text-[40px] text-[#131309] text-center">
                {question.content}
              </p>
            </div>
          </div>
                )}
              </div>
    );
  }

  return (
    <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center">
      <h1 className="[font-family:'Londrina_Solid'] text-[40px] text-[#131309] mt-6">
        BULLSHIT
      </h1>
      
      <p className="text-[#131309] text-xl mt-4">
        RONDA {round.number}
      </p>

      {isModerator && isReadingAnswers && shuffledAnswers.length > 0 ? (
        <>
          <div className="w-full max-w-[375px] mt-8 mb-28">
            <div className="text-center mb-6">
              <p className="text-[#131309] text-lg font-bold">
                {question?.text.replace(/\.$/, '')} <span className="italic">{question?.content}</span>?
              </p>
            </div>

            <div className="bg-[#131309] rounded-[20px] p-6 px-8 py-4 mb-6">
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
                <div className="w-full max-w-[327px] bg-white rounded-[20px] mt-4 p-4">
                  <div className="space-y-2">
                    <div className="bg-[#131309] rounded-[15px] p-3">
                      <p className="text-white text-base text-center">
                        {question.text}
                      </p>
                    </div>

                    <div className="bg-white rounded-[15px] p-3">
                      <p 
                        className="[font-family:'Londrina_Solid'] text-center text-[#131309]"
                        style={{
                          fontSize: question.content.length > 50 
                            ? question.content.length > 100 
                              ? '24px' 
                              : '32px' 
                            : '40px',
                          lineHeight: question.content.length > 50 ? '1.2' : '1.3'
                        }}
                      >
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
                        className="w-full h-12 bg-[#CB1517] hover:bg-[#B31315] text-white rounded-[10px] font-bold text-base"
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
                      {pendingPlayers.length > 0 ? (
                        <>
                          <Button
                            className="w-full h-12 bg-[#131309] hover:bg-[#131309] rounded-[10px] font-bold text-base mb-6 relative overflow-hidden group"
                            onClick={async () => {
                              console.log('🤬 Enviando insulto al resto por broadcast...');
                              // Enviar broadcast en lugar de actualizar la DB
                              supabase
                                .channel('insulto-broadcast')
                                .send({
                                  type: 'broadcast',
                                  event: 'insulto',
                                  payload: { roundId: round.id }
                                })
                                .then(() => console.log('✅ Broadcast enviado correctamente'))
                                .catch(err => console.error('❌ Error enviando broadcast:', err));
                            }}
                          >
                            {/* Efecto de borde de fuego */}
                            <span className="absolute inset-0 rounded-[10px] border-2 border-[#FF5700] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                            
                            {/* Animación de brillo de fuego en los bordes */}
                            <span className="absolute inset-0 rounded-[10px] shadow-[0_0_10px_3px_rgba(255,87,0,0.7)] opacity-0 group-hover:opacity-100 animate-fire-border"></span>
                            
                            <span className="relative z-10 text-white">Insulta al resto</span>
                          </Button>
                          
                          {/* Modificar este texto */}
                          <p className="text-[#131309] text-base mb-4 whitespace-nowrap overflow-hidden text-overflow-ellipsis">
                            Quedan {pendingPlayers.length} jugadores por responder:
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
                        className="w-full h-12 bg-[#CB1517] hover:bg-[#B31315] text-white rounded-[10px] font-bold text-base"
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

      {!isModerator && showInsult && (
        console.log('🎭 Intentando renderizar popup...'),
        <InsultPopup />
      )}
    </div>
  );
};