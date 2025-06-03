import { Button } from "../../components/ui/button";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase, subscribeToAnswers, subscribeToRound } from "../../lib/supabase";
import { ArrowLeft, ChevronLeft, Loader2 } from "lucide-react";
import { AnswerCardStack } from "./components/AnswerCardStack";
import type { Round, Player, Question, Answer, Vote, Category } from "../../lib/types";

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

export const GameRound = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameId } = useParams();
  
  // MODIFICADO: Obtener category_id y category_name del estado de navegación
  const roundInfoFromState = location.state as {
    playerName: string;
    roundNumber: number;
    roundId: string;
    moderatorId: string;
    category_id: string; 
    category_name: string; 
  };

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
  const [_showResults, _setShowResults] = useState(false);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [resultsCountdown, setResultsCountdown] = useState<number>(20);
  
  const answersChannelRef = useRef<any>(null);
  const roundChannelRef = useRef<any>(null);

  const [slideDirection, setSlideDirection] = useState('right');
  const [exitingCards, setExitingCards] = useState<ExitingCard[]>([]);

  const [showInsult, setShowInsult] = useState(false);
  const [insultoActual, setInsultoActual] = useState("");
  
  // Restaurar esta variable de estado
  const [_nonModeratorPlayers, setNonModeratorPlayers] = useState<Player[]>([]);
  
  // 1. Añadir una variable para seguir la última acción
  const [_lastVoteTimestamp, _setLastVoteTimestamp] = useState<number>(0);

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
          const votesChannel = supabase
            .channel(`votes-${round.id}`)
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'votes',
                filter: `round_id=eq.${round.id}`
              },
              (payload) => {
                console.log('📥 Voto recibido en tiempo real:', payload);
                loadVotes();
              }
            )
            .subscribe();

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

  // 1. Añadir esta definición de función en cualquier lugar antes de usarla
  // (cerca de la definición de loadVotes)

  // 2. Modificar la función handleVote para registrar cuándo votamos
  const handleVote = async (selectedContent: string) => {
    if (!round?.id || !currentPlayer?.id) {
      console.error('[LOG] No se puede votar: falta ID de ronda o jugador');
      return;
    }

    console.log('[LOG] Usuario va a votar:', {
      roundId: round.id,
      playerId: currentPlayer.id,
      respuesta: selectedContent
    });

    try {
      const { data, error } = await supabase
        .from('votes')
        .insert({
          round_id: round.id,
          player_id: currentPlayer.id,
          selected_answer: selectedContent
        })
        .select();

      if (error) {
        if (error.code === '23505') {
          console.log('✓ Ya habías votado, ignorando duplicación');
      setHasVoted(true);
          setSelectedVote(selectedContent);
          return;
        }
        console.error('❌ Error al procesar voto:', error);
        return;
      }

      console.log('✅ Voto procesado correctamente:', data);
      setHasVoted(true);
      setSelectedVote(selectedContent);
      _setLastVoteTimestamp(Date.now());

      setTimeout(() => {
        console.log('[LOG] Estado de votos tras votar (después de posible suscripción):', votes);
        const myVote = votes.find(v => v.player_id === currentPlayer.id);
        if (!myVote) {
          console.warn("⚠️ Tras votar, el voto propio NO está en el array de votos.");
        }
      }, 1000);
    } catch (err) {
      console.error('❌ Error inesperado al votar:', err);
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
      // MODIFICADO: Usar roundId de roundInfoFromState
      if (!gameId || !roundInfoFromState?.playerName || !roundInfoFromState?.roundId) return;

      try {
        console.log('🎮 Configurando juego inicial para ronda ID:', roundInfoFromState.roundId);
        
        const [playersData, roundDataFromDB] = await Promise.all([
          fetchWithRetry<Player[]>(async () => 
            supabase.from('players').select('*').eq('game_id', gameId)
              .then(response => ({ data: response.data as Player[], error: response.error }))
          ),
          // MODIFICADO: Al fetchear la ronda, incluir el nombre de la categoría
          fetchWithRetry<Round>(async () => 
            supabase.from('rounds').select('*, categories(id, name)').eq('id', roundInfoFromState.roundId).single()
              .then(response => ({ data: response.data as Round, error: response.error }))
          )
        ]);

        if (!playersData || !roundDataFromDB) {
          throw new Error('No se pudieron cargar los datos del juego o la ronda');
        }

        // Procesar la ronda para asegurar que category_name esté disponible
        const processedRound = {
          ...roundDataFromDB,
          // @ts-ignore Supabase anida las relaciones
          category_name: roundDataFromDB.categories?.name || roundInfoFromState.category_name || 'Desconocida',
          // @ts-ignore
          category_id: roundDataFromDB.category_id || roundInfoFromState.category_id
        };
        setRound(processedRound as Round);

        const questionData = processedRound.question_id ? 
          await fetchWithRetry<Question>(async () => 
            supabase.from('questions')
              .select('*')
              .eq('id', processedRound.question_id)
              .single()
              .then(response => ({ data: response.data as Question, error: response.error }))
          ) : null;

        // 3. Obtener respuestas
        const answersData = await fetchWithRetry<Answer[]>(async () => 
          supabase.from('answers').select('*').eq('round_id', processedRound.id)
            .then(response => ({ data: response.data as Answer[], error: response.error }))
        );

        if (!playersData || playersData.length === 0) {
          throw new Error('No se encontraron jugadores');
        }
        setPlayers(playersData);

        // 2. Establecer jugador actual
        const currentPlayerData = playersData.find(p => p.name === roundInfoFromState.playerName);
        if (!currentPlayerData) {
          throw new Error('Jugador actual no encontrado');
        }
        setCurrentPlayer(currentPlayerData);

        // 3. Obtener la ronda activa
        if (!processedRound) {
          throw new Error('No se encontró la ronda');
        }
        setIsModerator(processedRound.moderator_id === currentPlayerData.id);

        // 4. Establecer moderador
        const moderatorData = playersData.find(p => p.id === processedRound.moderator_id);
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
        answersChannelRef.current = subscribeToAnswers(processedRound.id, handleAnswersUpdate);

        if (roundChannelRef.current) {
          roundChannelRef.current.unsubscribe();
        }
        roundChannelRef.current = supabase
          .channel(`round-${processedRound.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'rounds',
              filter: `id=eq.${processedRound.id}`,
            },
            async (payload) => {
              console.log('Received round update via subscription:', payload.new);
              let updatedRound = payload.new as Round;

              // Si falta category_name, intentar obtenerlo
              if (updatedRound.category_id && !updatedRound.category_name) {
                const { data: catData, error: catErr } = await supabase
                  .from('categories')
                  .select('name')
                  .eq('id', updatedRound.category_id)
                  .single();
                if (!catErr && catData) {
                  updatedRound.category_name = catData.name;
                }
              }
              setRound(updatedRound);

              // Si question_id cambió y no teníamos datos de la pregunta o es diferente
              if (updatedRound.question_id && 
                  (updatedRound.question_id !== question?.id || !question)) {
                const newQuestionData = await fetchWithRetry<Question>(
                  async () => await supabase
                    .from('questions')
                    .select('*')
                    .eq('id', updatedRound.question_id)
                    .single()
                    .then(response => ({ data: response.data as Question, error: response.error }))
                );

                if (newQuestionData) {
                  setQuestion(newQuestionData);
                  setCountdown(0);
                }
              }
            }
          );

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
        // MODIFICADO: Lógica de desuscripción de Supabase
        const promise = roundChannelRef.current.unsubscribe();
        void promise.then(() => console.log('Desuscrito del canal de ronda'));
        roundChannelRef.current = null;
      }
    };
  }, [gameId, roundInfoFromState?.playerName, roundInfoFromState?.roundId, handleAnswersUpdate]);

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
    
    // El objeto que se envía a 'round-update' debe ser consistente
    // con lo que espera el receptor, incluyendo category_name si es posible.
    const updatedRoundPayload = { 
      ...round, 
      reading_phase: true, 
      // category_name podría ya estar en 'round', si no, se puede omitir o buscar
    };

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
          payload: { round: updatedRoundPayload } // Usar el payload consistente
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

  // MODIFICADO: Usar round.category_name para el icono
  const getCategoryIcon = () => {
    switch (round?.category_name?.toLowerCase()) {
      case 'pelicula': return '🎬';
      case 'sigla': return 'ABC';
      case 'personaje': return '👤';
      default: return '❓';
    }
  };

  useEffect(() => {
    // Suscribirse a los votos tanto en fase de votación como en fase de resultados,
    // y hacerlo para todos los jugadores (moderador y no-moderador).
    if (!round?.id || !(round.voting_phase || round.results_phase)) return;

    console.log('🔄 Configurando canal para escuchar votos - ID Ronda:', round.id);
    
    // Crear un canal con nombre único para evitar colisiones
    const channelName = `votes-${round.id}-${Date.now()}`;
    console.log('📢 Nombre del canal:', channelName);
    
    const channel = supabase.channel(channelName);
    
    // Suscribirse a cambios en la tabla votos
    channel
      .on('postgres_changes', {
        event: 'INSERT',  // Solo nos interesan nuevas inserciones
        schema: 'public',
        table: 'votes',
        filter: `round_id=eq.${round.id}`
      }, (payload) => {
        console.log('[LOG] Voto recibido por suscripción:', payload);
        loadVotes();
      })
      .subscribe((status) => {
        console.log(`🔌 Estado de suscripción: ${status}`);
      });
    
    // Cargar votos iniciales
    loadVotes();
    
    // Limpiar la suscripción al desmontar
    return () => {
      console.log('🛑 Cerrando canal de votos');
      channel.unsubscribe();
    };
  }, [round?.id, round?.voting_phase, round?.results_phase]);

  // Llamar a loadVotes en cuanto entremos en la fase de resultados para asegurarnos
  // de que todos los jugadores tienen la lista más reciente (incluido su propio voto).
  useEffect(() => {
    if (round?.results_phase) {
      loadVotes();
    }
  }, [round?.results_phase]);

  // Función para cargar todos los votos
  const loadVotes = async () => {
    if (!round?.id) return;
    
    console.log("[LOG] Llamando a loadVotes para la ronda:", round.id);

    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('round_id', round.id);

    if (error) {
      console.error('[LOG] Error al cargar votos:', error);
      return;
    }

    console.log('[LOG] Votos recibidos de la base de datos:', data);

    setVotes(data || []);
  };

  // Mantener solo una implementación de handleRevealResults con la lógica completa
  const handleRevealResults = async () => {
    if (!round) return;
    
    // Payload consistente para el broadcast
    const updatedRoundPayload = {
      ...round, 
      results_phase: true,
      voting_phase: false
    };
    
    try {
      console.log('🏆 Revelando resultados...');
      
      // Actualizar la base de datos
      const { error: updateError } = await supabase
        .from('rounds')
        .update({ 
          results_phase: true,
          voting_phase: false  // Desactivar fase de votación
        })
        .eq('id', round.id);

      if (updateError) throw updateError;
      
      // Actualizar el estado local
      const updatedRound = {
        ...round, 
        results_phase: true,
        voting_phase: false
      };
      
      // Enviar broadcast para sincronizar todos los clientes
      supabase
        .channel(`round-updates-${round.id}`)
        .send({
          type: 'broadcast',
          event: 'round-update',
          payload: { round: updatedRoundPayload } // Usar el payload consistente
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
          // MODIFICADO: Pasar category_name si es necesario en la pantalla de scores
          category_name: round.category_name, 
          usedQuestionIds: question?.id 
        } 
      });
    }
  }, [round?.results_phase, resultsCountdown, round?.id, round?.number, round?.moderator_id, round?.category_name, gameId, navigate, currentPlayer?.name, question?.id]);

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
        
        // Asegurar que category_name esté presente si es posible
        if (updatedRound.category_id && !updatedRound.category_name) {
          // Esto es un fallback, idealmente el broadcast ya lo trae.
          // Podrías tener un mapa local de category_id -> name o fetchearlo.
          // Por ahora, si no viene, quedará como undefined o el valor anterior.
          console.warn("Actualización de ronda recibida sin category_name en el payload.");
        }
        
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
          console.log('�� Fase de resultados activada');
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

  // Añadir esta función para obtener las puntuaciones totales
  const fetchTotalScores = useCallback(async () => {
    if (!gameId || !players.length) return;
    
    try {
      console.log('📊 Obteniendo puntuaciones totales...');
      
      // Obtener todas las puntuaciones del juego
      const { data: scoresData, error: scoresError } = await supabase
        .from('scores')
        .select('*')
        .eq('game_id', gameId);
        
      if (scoresError) throw scoresError;
      
      // Calcular total por jugador
      const totalScores: Record<string, number> = {};
      
      // Inicializar todos los jugadores con 0 puntos
      players.forEach(player => {
        totalScores[player.id] = 0;
      });
      
      // Sumar los puntos de todas las rondas
      scoresData?.forEach(score => {
        totalScores[score.player_id] = (totalScores[score.player_id] || 0) + score.points;
      });
      
      console.log('✅ Puntuaciones totales calculadas:', totalScores);
      return totalScores;
    } catch (err) {
      console.error('❌ Error obteniendo puntuaciones:', err);
      setError('Error al obtener puntuaciones');
      return {};
    }
  }, [gameId, players]);

  // Usar este useEffect para guardar los puntos de la ronda actual
  useEffect(() => {
    if (!round?.results_phase || !question || !votes || !answers || !gameId) return;
    
    const saveScores = async () => {
      try {
        console.log('💾 Guardando puntuaciones de la ronda...');
        
        // Calcular las puntuaciones de esta ronda
        
        // 1. Puntos por votos correctos (2 puntos)
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

        // 2. Puntos por recibir votos (1 punto por voto)
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
        
        console.log('✅ Puntuaciones guardadas correctamente');
      } catch (err) {
        console.error('❌ Error guardando puntuaciones:', err);
      }
    };
    
    saveScores();
  }, [round?.results_phase, gameId, round?.id, question, votes, answers, calculateScores]);

  // 1. Añadir el estado para totalScores
  const [, setTotalScores] = useState<Record<string, number>>({});

  // 2. Añadir useEffect para cargar puntuaciones totales
  useEffect(() => {
    if (round?.results_phase) {
      fetchTotalScores().then(scores => {
        if (scores) {
          console.log('📊 Puntuaciones totales cargadas:', scores);
          setTotalScores(scores);
        }
      });
    }
  }, [round?.results_phase, fetchTotalScores]);

  // 2. Calcular jugadores no moderadores cuando cambian los players o el moderador
  useEffect(() => {
    if (!players.length || !moderator) return;
    
    const filteredPlayers = players.filter(p => p.id !== moderator.id);
    setNonModeratorPlayers(filteredPlayers);
    console.log('👥 Jugadores (no moderadores):', filteredPlayers.length);
  }, [players, moderator]);

  // 3. Modificar la suscripción realtime para ignorar eventos recientes
  useEffect(() => {
    if (!round?.voting_phase || !round.id) return;
    
    // Definir el handler de eventos para los votos
    const handleVoteReceived = (payload: any) => {
      // Verificar si es un voto reciente nuestro
      const isRecentOwnVote = 
        Date.now() - _lastVoteTimestamp < 5000 && // Menos de 5 segundos
        payload.new && 
        payload.new.player_id === currentPlayer?.id;
        
      if (isRecentOwnVote) {
        console.log('📝 Ignorando notificación de nuestro propio voto');
        return; // No procesar nuestros propios votos recientes
      }
      
      console.log('📥 Voto recibido en tiempo real:', payload);
      loadVotes();
    };
    
    // Canal para recibir votos
    const votesChannel = supabase
      .channel(`votes-${round.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'votes',
        filter: `round_id=eq.${round.id}`
      }, handleVoteReceived)
      .subscribe();
    
    // Función de limpieza
    return () => {
      // La función unsubscribe devuelve una Promise, pero debemos adaptar esto
      // para que sea compatible con React useEffect
      const promise = votesChannel.unsubscribe();
      // No devolvemos la Promise directamente
      void promise;
    };
  }, [round?.id, round?.voting_phase, currentPlayer?.id, _lastVoteTimestamp]);

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
                className="w-full mt-6 p-4 bg-[#804000] hover:bg-[#603000] text-white font-bold rounded-[10px] transition-colors"
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
              // Determinar si esta respuesta es la del jugador actual
              const isOwnAnswer = answer.playerId === currentPlayer?.id;

              return (
                <div
                  key={index}
                  className={`w-full p-6 bg-white rounded-[20px] mb-4 border-2 transition-all
                    ${selectedVote === answer.content ? 'border-[#000000]' : 'border-transparent'}
                    ${isOwnAnswer ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'}
                  `}
                  onClick={() => !hasVoted && !isOwnAnswer && handleVote(answer.content)}
                >
                  <p className="text-[#131309] text-lg">
                    {answer.content}
                    {isOwnAnswer && <span className="ml-2 text-[#804000] font-medium">(Tu respuesta)</span>}
                  </p>
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
                  onClick={() => !hasVoted && selectedVote && handleVote(selectedVote)}
                  disabled={hasVoted || !selectedVote}
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
    console.log("[LOG] ENTRANDO EN FASE DE RESULTADOS");
    console.log("Usuario actual:", currentPlayer);
    console.log("Ronda:", round);
    console.log("Votos actuales:", votes);
    console.log("calculateScores():", calculateScores());
    const myVote = votes.find(v => v.player_id === currentPlayer?.id);
    console.log("Mi voto:", myVote);
    if (!myVote) {
      console.warn("⚠️ El voto del usuario actual NO está en el array de votos.");
    }

    // Loader SOLO si no es moderador y aún no está el voto propio
    if (
      !isModerator &&
      !votes.find(v => v.player_id === currentPlayer?.id)
    ) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <p className="text-[#131309] text-lg">Cargando resultados...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center">
        <h1 className="[font-family:'Londrina_Solid'] text-[40px] text-[#131309] mt-6">
        BULLSHIT
      </h1>
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
                if (playerIdA === round?.moderator_id) return 1;
                if (playerIdB === round?.moderator_id) return -1;
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
                          <p className="text-sm">
                            {playerVote
                              ? (isCorrectVote ? '✅ Votó correctamente' : '❌ Engañado')
                              : '❌ No votó'}
                          </p>
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
        </div>

        {/* Barra inferior con cuenta atrás hacia la siguiente ronda */}
        <div className="fixed bottom-0 left-0 right-0">
          <div className="bg-white w-full px-6 pt-5 pb-8">
            <div className="max-w-[327px] mx-auto flex flex-col items-center">
              <p className="text-[#131309] text-xl font-bold mb-4 text-center">
                Siguiente ronda en {resultsCountdown}
              </p>
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
        {/* Overlay solo para no-moderadores */}
        {!isModerator && <ReadingOverlay />}

        <h1 className="[font-family:'Londrina_Solid'] text-[40px] text-[#131309] mt-6">BULLSHIT</h1>

      {isModerator && isReadingAnswers && shuffledAnswers.length > 0 ? (
        <>
            {/* Vista del moderador mientras lee las respuestas */}
            <div className="w-full max-w-[375px] mt-8 mb-28">
              <div className="text-center mb-6">
                <p className="text-[#131309] text-lg font-bold">
                  {question?.text.replace(/\.$/, '')}{' '}
                  <span className="italic">{question?.content}</span>?
                </p>
              </div>

              <div className="bg-[#131309] rounded-[20px] px-8 py-4 mb-6">
                <p className="text-white text-center">
                  Lee las respuestas al resto de jugadores. Se han ordenado aleatoriamente junto a la respuesta real.
              </p>
            </div>

              <AnswerCardStack
                shuffledAnswers={shuffledAnswers}
                exitingCards={exitingCards}
                slideDirection={slideDirection as 'left' | 'right'}
                currentAnswerIndex={currentAnswerIndex}
              />

            </div> {/* cierra contenedor cards moderador */}

            {/* Navegación inferior */}
            <div className="fixed bottom-0 left-0 right-0">
              <div className="bg-white w-full px-6 pt-5 pb-8">
                <div className="max-w-[327px] mx-auto flex gap-3">
                  <button
                    onClick={handlePrevAnswer}
                    className="w-12 h-12 bg-[#E7E7E6] hover:bg-[#d1d1d0] rounded-[10px] flex items-center justify-center"
                    disabled={currentAnswerIndex === 0}
                  >
                    <ChevronLeft className="w-6 h-6 text-[#131309]" />
                  </button>
                  <button
                    onClick={handleNextAnswer}
                    className="flex-1 h-12 bg-[#804000] hover:bg-[#603000] text-white rounded-[10px] font-bold text-base"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Vista para participantes (o moderador antes de leer) */
          <div className="w-full max-w-[375px] mt-8 space-y-4">
            <div className="bg-[#131309] rounded-[20px] p-6">
              <p className="text-white text-xl text-center">{question?.text}</p>
            </div>
            <div className="bg-white rounded-[20px] p-4">
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
      <h1 className="[font-family:'Londrina_Solid'] text-[40px] text-[#131309] mt-6">
        BULLSHIT
      </h1>
      

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

            <AnswerCardStack
              shuffledAnswers={shuffledAnswers}
              exitingCards={exitingCards}
              slideDirection={slideDirection as 'left' | 'right'}
              currentAnswerIndex={currentAnswerIndex}
            />

          </div> {/* cierra contenedor cards moderador fuera de reading_phase */}

          <div className="fixed bottom-0 left-0 right-0">
            <div className="bg-white w-full px-6 pt-5 pb-8">
              <div className="max-w-[327px] mx-auto flex gap-3">
                <button
                  onClick={handlePrevAnswer}
                  className="w-12 h-12 bg-[#E7E7E6] hover:bg-[#d1d1d0] rounded-[10px] flex items-center justify-center"
                  disabled={currentAnswerIndex === 0}
                >
                  <ChevronLeft className="w-6 h-6 text-[#131309]" />
                </button>
                
                <button
                  onClick={handleNextAnswer}
                  className="flex-1 h-12 bg-[#804000] hover:bg-[#603000] text-white rounded-[10px] font-bold text-base"
                >
                  Siguiente
                </button>
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
                    {round.category_name}
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

                    <div className="bg-white rounded-[20px] p-4">
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
                        className="w-full h-12 bg-[#804000] hover:bg-[#603000] text-white rounded-[10px] font-bold text-base"
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
                          <p className="text-[#131309] text-base sm:text-lg font-bold mb-4 whitespace-nowrap">
                            Quedan por responder: {pendingPlayers.length > 0 ? (
                              <>
                                {pendingPlayers[0]?.name}
                                {pendingPlayers.length > 1 && (
                                  <>
                                    {pendingPlayers.length === 2 ? ' y ' : ', '}
                                    {pendingPlayers[1]?.name}
                                    {pendingPlayers.length > 2 && ` y ${pendingPlayers.length - 2} más`}
                                  </>
                                )}
                              </>
                            ) : (
                              "Nadie"
                            )}
                          </p>
                          
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
                        </>
                      ) : (
                        <p className="text-[#131309] text-base mb-4">
                          ¡Todas las respuestas recibidas!
                        </p>
                      )}
                      
                      <Button
                        className="w-full h-12 bg-[#804000] hover:bg-[#603000] text-white rounded-[10px] font-bold text-base"
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

      {!isModerator && showInsult && <InsultPopup />}

      {isModerator && allPlayersVoted && (
        <div className="fixed bottom-0 left-0 right-0">
          <div className="bg-white w-full px-6 pt-5 pb-8">
            <div className="max-w-[327px] mx-auto">
              <p className="text-[#131309] text-xl text-center mb-4">
                ¡Ya han votado todos los jugadores!
              </p>
              <Button
                className="w-full h-12 bg-[#804000] hover:bg-[#603000] text-white rounded-[10px] font-bold text-base"
                onClick={handleRevealResults}
              >
                Revelar resultados
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};