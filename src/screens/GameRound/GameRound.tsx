import { Button } from "../../components/ui/button";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase, subscribeToAnswers, subscribeToRound } from "../../lib/supabase";
import { ArrowLeft, ChevronLeft, Loader2 } from "lucide-react";
<<<<<<< HEAD
import type { Round, Player, Question, Answer, Vote, PlayerScoreData, AnswerOption, ExitingCard } from "../../lib/types"; // Added PlayerScoreData, AnswerOption, ExitingCard
import { CountdownView } from './components/phases/CountdownView';
import { PlayerAnsweringView } from './components/phases/PlayerAnsweringView';
import { ModeratorWaitingView } from './components/phases/ModeratorWaitingView';
import { ModeratorReadingView } from './components/phases/ModeratorReadingView';
import { PlayerVotingView } from './components/phases/PlayerVotingView';
import { ModeratorVotingWaitView } from './components/phases/ModeratorVotingWaitView';
import { ResultsView } from './components/phases/ResultsView';
import { fetchWithRetry } from '../../lib/fetchWithRetry';
=======
import { AnswerCardStack } from "./components/AnswerCardStack";
import type { Round, Player, Question, Answer, Vote, Category } from "../../lib/types";
>>>>>>> ac20bc9 (refactor: centralize categories table and update types & UI; set login/signup card bg white)

type AnswerResponse = Pick<Answer, 'content' | 'player_id'> & {
  players: { name: string; avatar_color: string; }[];
};

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
  const [isReadingAnswers, setIsReadingAnswers] = useState(false); // This state might be derivable from round.reading_phase for simplification
  const [currentAnswerIndex, setCurrentAnswerIndex] = useState(0);
  const [shuffledAnswers, setShuffledAnswers] = useState<AnswerOption[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 5;
  const retryDelay = 1000;
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [allPlayersVoted, setAllPlayersVoted] = useState(false);
  const [_showResults, _setShowResults] = useState(false); // Keep if used for other logic, otherwise might be removable
  const [votes, setVotes] = useState<Vote[]>([]);
  const [resultsCountdown, setResultsCountdown] = useState<number>(20);
  
  const answersChannelRef = useRef<any>(null);
  const roundChannelRef = useRef<any>(null);

  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [exitingCards, setExitingCards] = useState<ExitingCard[]>([]);

  const [showInsult, setShowInsult] = useState(false);
  const [insultoActual, setInsultoActual] = useState("");
  
  const [_nonModeratorPlayers, setNonModeratorPlayers] = useState<Player[]>([]);
  const [_lastVoteTimestamp, _setLastVoteTimestamp] = useState<number>(0);

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

  // fetchWithRetry has been moved to ../../lib/fetchWithRetry.ts

  useEffect(() => {
    if (round?.voting_phase && !isModerator) {
      const loadVotingPhase = async () => {
        try {
          if (!round.id || !round.question_id || !currentPlayer?.id) {
            console.warn("Missing data for loadVotingPhase", {roundId: round.id, questionId: round.question_id, currentPlayerId: currentPlayer?.id});
            setError("Faltan datos para cargar la fase de votación.");
            return;
          }
          const [answersData, questionData, votesData] = await Promise.all([
            fetchWithRetry<AnswerResponse[]>(
              async () => {
                const response = await supabase
                .from('answers')
                .select(`content, player_id, players (name, avatar_color)`)
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

          const allAnswersOptions: AnswerOption[] = [ // Renamed to avoid conflict with 'answers' state
            { content: questionData.correct_answer, isCorrectAnswer: true },
            ...(answersData || []).map((ans: any) => ({
              content: ans.content,
              playerId: ans.player_id,
              playerName: ans.players?.name
            }))
          ];
          setShuffledAnswers(allAnswersOptions);

          const playerVote = votesData?.find(v => v.player_id === currentPlayer?.id);
          if (playerVote) {
            setSelectedVote(playerVote.selected_answer);
            setHasVoted(true);
          }

          const nonModPlayers = players.filter(p => p.id !== moderator?.id);
          const allHaveVoted = nonModPlayers.every(player => 
            votesData?.some(vote => vote.player_id === player.id)
          );
          setAllPlayersVoted(allHaveVoted);
        } catch (err) {
          console.error('Error loading voting phase:', err);
          setError('Error al cargar la fase de votación. Intentando reconectar...');
          if (retryCount < maxRetries) {
            setTimeout(() => { setRetryCount(prev => prev + 1); setError(null); }, retryDelay);
          } else {
            setError('No se pudo cargar la fase de votación. Por favor, recarga la página.');
          }
        }
      };
      loadVotingPhase();
    }
  }, [round?.voting_phase, round?.id, round?.question_id, isModerator, currentPlayer?.id, players, moderator?.id, retryCount]);

  const handleVote = async (selectedContent: string) => {
    if (!round?.id || !currentPlayer?.id) {
      console.error('[LOG] No se puede votar: falta ID de ronda o jugador');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('votes')
        .insert({ round_id: round.id, player_id: currentPlayer.id, selected_answer: selectedContent })
        .select();
      if (error) {
        if (error.code === '23505') {
          setHasVoted(true); setSelectedVote(selectedContent); return;
        }
        throw error;
      }
      setHasVoted(true); setSelectedVote(selectedContent); _setLastVoteTimestamp(Date.now());
    } catch (err) { console.error('❌ Error inesperado al votar:', err); }
  };

  const handleFinishReadingAnswers = async () => {
    if (!round) return;
    try {
      const { error: updateError } = await supabase.from('rounds').update({ reading_phase: false, voting_phase: true }).eq('id', round.id);
      if (updateError) throw updateError;
      supabase.channel(`round-updates-${round.id}`).send({ type: 'broadcast', event: 'round-update', payload: { round: { ...round, reading_phase: false, voting_phase: true } } });
      setIsReadingAnswers(false); // This should ideally be set by the round update subscription
    } catch (err) { console.error('Error transitioning to voting phase:', err); setError('Error al iniciar la fase de votación'); }
  };

  const handleNextAnswer = () => {
    if (currentAnswerIndex < shuffledAnswers.length - 1) {
      setExitingCards(prev => [...prev, { index: currentAnswerIndex, content: shuffledAnswers[currentAnswerIndex].content }]);
      setSlideDirection('left');
      setTimeout(() => { setCurrentAnswerIndex(prev => prev + 1); setExitingCards([]); }, 400);
    } else {
      handleFinishReadingAnswers();
    }
  };

  const handlePrevAnswer = () => {
    if (currentAnswerIndex > 0) {
      setExitingCards(prev => [...prev, { index: currentAnswerIndex, content: shuffledAnswers[currentAnswerIndex].content }]);
      setSlideDirection('right');
      setTimeout(() => { setCurrentAnswerIndex(prev => prev - 1); setExitingCards([]); }, 400);
    }
  };

  const getPendingPlayers = useCallback(() => {
    if (!round?.moderator_id || !players.length || !answers) return [];
    const answeredPlayerIds = new Set(answers.map(a => a.player_id));
    return players.filter(player => player.id !== round.moderator_id && !answeredPlayerIds.has(player.id));
  }, [round?.moderator_id, players, answers]);

  const handleAnswersUpdate = useCallback((newAnswers: Answer[]) => {
    setAnswers(newAnswers);
    if (currentPlayer) {
      setHasAnswered(newAnswers.some(a => a.player_id === currentPlayer.id));
    }
  }, [currentPlayer]);

  useEffect(() => {
    const setupGame = async () => {
<<<<<<< HEAD
      if (!gameId || !location.state?.playerName || !location.state?.roundId) {
          setError("Faltan datos para iniciar el juego.");
          setIsLoading(false);
          return;
      }
      try {
        setIsLoading(true);
        const [playersData, roundData] = await Promise.all([
          fetchWithRetry<Player[]>(async () => supabase.from('players').select('*').eq('game_id', gameId)),
          fetchWithRetry<Round>(async () => supabase.from('rounds').select('*').eq('id', location.state.roundId).single())
        ]);

        const currentPlayerData = playersData.find(p => p.name === location.state.playerName);
        const moderatorData = playersData.find(p => p.id === roundData.moderator_id);

        if (!currentPlayerData || !moderatorData) throw new Error('Jugador o moderador no encontrado.');
        
        setCurrentPlayer(currentPlayerData);
        setModerator(moderatorData);
        setPlayers(playersData);
        setRound(roundData);
        setIsModerator(roundData.moderator_id === currentPlayerData.id);

        if (roundData.question_id) {
          const questionData = await fetchWithRetry<Question>(async () => supabase.from('questions').select('*').eq('id', roundData.question_id).single());
          setQuestion(questionData);
          setCountdown(0); // Question already exists, skip countdown
        }

        const answersData = await fetchWithRetry<Answer[]>(async () => supabase.from('answers').select('*').eq('round_id', roundData.id));
        setAnswers(answersData || []);
        setHasAnswered(answersData.some(a => a.player_id === currentPlayerData.id));
        
        // Setup subscriptions
        if (answersChannelRef.current) answersChannelRef.current.unsubscribe();
        answersChannelRef.current = subscribeToAnswers(roundData.id, handleAnswersUpdate);
        
        if (roundChannelRef.current) roundChannelRef.current.unsubscribe();
        roundChannelRef.current = subscribeToRound(roundData.id, async (updatedRound) => {
          setRound(updatedRound);
          if (updatedRound.question_id && updatedRound.question_id !== (round?.question_id || question?.id) ) { // check previous round state or current question state
            const newQuestionData = await fetchWithRetry<Question>(async () => supabase.from('questions').select('*').eq('id', updatedRound.question_id).single());
            setQuestion(newQuestionData);
            setCountdown(0);
          }
           // Update phase-specific states based on updatedRound
          setIsReadingAnswers(updatedRound.reading_phase);
          if (updatedRound.results_phase) setResultsCountdown(20);

        });
=======
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
>>>>>>> ac20bc9 (refactor: centralize categories table and update types & UI; set login/signup card bg white)

        setIsLoading(false);
      } catch (err) {
        console.error('Error en setup:', err);
        setError('Error al cargar la ronda');
        setIsLoading(false);
        if (retryCount < maxRetries) { setTimeout(() => setRetryCount(prev => prev + 1), retryDelay); }
      }
    };
    setupGame();
    return () => {
<<<<<<< HEAD
      if (answersChannelRef.current) answersChannelRef.current.unsubscribe();
      if (roundChannelRef.current) roundChannelRef.current.unsubscribe();
    };
  }, [gameId, location.state?.playerName, location.state?.roundId, retryCount]); // Added location.state.roundId dependency
=======
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
>>>>>>> ac20bc9 (refactor: centralize categories table and update types & UI; set login/signup card bg white)

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0 && !question) { // Only countdown if no question yet
      timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [countdown, question]);

  const handleSubmitAnswer = async () => {
    if (!answer.trim() || !round || !currentPlayer || hasAnswered) return;
    try {
      const { error: submitError } = await supabase.from('answers').insert([{ round_id: round.id, player_id: currentPlayer.id, content: answer.trim() }]);
      if (submitError) {
        if (submitError.code === '23505') { setHasAnswered(true); setAnswer(''); return; }
        throw submitError;
      }
      supabase.channel('answers-broadcast').send({ type: 'broadcast', event: 'new-answer', payload: { roundId: round.id } });
      setAnswer(''); setHasAnswered(true);
    } catch (err) { console.error('❌ Error submitting answer:', err); setError('Error al enviar la respuesta'); }
  };

  const handleStartReadingAnswers = async () => {
    if (!round) return;
<<<<<<< HEAD
=======
    
    // El objeto que se envía a 'round-update' debe ser consistente
    // con lo que espera el receptor, incluyendo category_name si es posible.
    const updatedRoundPayload = { 
      ...round, 
      reading_phase: true, 
      // category_name podría ya estar en 'round', si no, se puede omitir o buscar
    };

>>>>>>> ac20bc9 (refactor: centralize categories table and update types & UI; set login/signup card bg white)
    try {
      const { error: updateError } = await supabase.from('rounds').update({ reading_phase: true }).eq('id', round.id);
      if (updateError) throw updateError;
<<<<<<< HEAD
      supabase.channel(`round-updates-${round.id}`).send({ type: 'broadcast', event: 'round-update', payload: { round: { ...round, reading_phase: true } } });
      // setIsReadingAnswers(true); // Should be set by round update subscription
=======
      
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
>>>>>>> ac20bc9 (refactor: centralize categories table and update types & UI; set login/signup card bg white)
      prepareShuffledAnswers();
    } catch (err) { console.error('Error starting reading phase:', err); setError('Error al iniciar la fase de lectura'); }
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
    if (!round?.id || !(round.voting_phase || round.results_phase)) return;
    const channelName = `votes-${round.id}-${Date.now()}`;
    const channel = supabase.channel(channelName);
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes', filter: `round_id=eq.${round.id}`}, (payload) => { loadVotes(); }).subscribe();
    loadVotes(); // Initial load
    return () => { channel.unsubscribe(); };
  }, [round?.id, round?.voting_phase, round?.results_phase]);

  useEffect(() => { if (round?.results_phase) { loadVotes(); } }, [round?.results_phase]);

  const loadVotes = async () => {
    if (!round?.id) return;
    const { data, error } = await supabase.from('votes').select('*').eq('round_id', round.id);
    if (error) { console.error('[LOG] Error al cargar votos:', error); return; }
    setVotes(data || []);
  };

  const handleRevealResults = async () => {
    if (!round) return;
<<<<<<< HEAD
=======
    
    // Payload consistente para el broadcast
    const updatedRoundPayload = {
      ...round, 
      results_phase: true,
      voting_phase: false
    };
    
>>>>>>> ac20bc9 (refactor: centralize categories table and update types & UI; set login/signup card bg white)
    try {
      const { error: updateError } = await supabase.from('rounds').update({ results_phase: true, voting_phase: false }).eq('id', round.id);
      if (updateError) throw updateError;
<<<<<<< HEAD
      const updatedRoundData = { ...round, results_phase: true, voting_phase: false };
      supabase.channel(`round-updates-${round.id}`).send({ type: 'broadcast', event: 'round-update', payload: { round: updatedRoundData } });
      // setRound(updatedRoundData); // Should be set by round update subscription
      // setResultsCountdown(20); // Should be set by round update subscription
    } catch (err) { console.error('Error revealing results:', err); setError('Error al revelar resultados'); }
=======
      
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
>>>>>>> ac20bc9 (refactor: centralize categories table and update types & UI; set login/signup card bg white)
  };

  useEffect(() => {
    if (round?.results_phase && resultsCountdown > 0) {
      const timer = setInterval(() => setResultsCountdown(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    }
    if (round?.results_phase && resultsCountdown === 0) {
<<<<<<< HEAD
      navigate(`/game/${gameId}/scores`, { state: { playerName: currentPlayer?.name, roundNumber: round.number, roundId: round.id, moderatorId: round.moderator_id, usedQuestionIds: question?.id } });
    }
  }, [round?.results_phase, resultsCountdown, round?.id, gameId, navigate, currentPlayer?.name, round?.number, question?.id]);
=======
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
>>>>>>> ac20bc9 (refactor: centralize categories table and update types & UI; set login/signup card bg white)

  useEffect(() => {
    if (!gameId || !round?.id) return;
    const insultoChannel = supabase.channel('insulto-broadcast').on('broadcast', { event: 'insulto' }, (payload) => {
      const insultoRandom = INSULTOS[Math.floor(Math.random() * INSULTOS.length)];
      setInsultoActual(insultoRandom); setShowInsult(true);
    }).subscribe();
    return () => { insultoChannel.unsubscribe(); };
  }, [gameId, round?.id]);
  
  const prepareShuffledAnswers = async () => {
    if (!question || !round) return;
    try {
      const { data: answersWithPlayers, error: answersError } = await supabase.from('answers').select(`content, player_id, players (name, avatar_color)`).eq('round_id', round.id);
      if (answersError) throw answersError;
      const allAnswersOptions: AnswerOption[] = [ // Renamed to avoid conflict
        { content: question.correct_answer, isCorrectAnswer: true },
        ...(answersWithPlayers || []).map((ans: any) => ({ content: ans.content, isCorrectAnswer: false, playerName: ans.players?.name, playerId: ans.player_id }))
      ];
      const shuffled = allAnswersOptions.sort(() => Math.random() - 0.5);
      setShuffledAnswers(shuffled); setCurrentAnswerIndex(0);
    } catch (err) { console.error('Error preparando respuestas:', err); setError('Error al preparar las respuestas'); }
  };

  useEffect(() => {
    if (!gameId || !round?.id) return;
    const roundBroadcast = supabase.channel(`round-updates-${round.id}`).on('broadcast', { event: 'round-update' }, (payload) => {
      const updatedRound = payload.payload.round as Round;
      setRound(updatedRound); // Main round state update
      setIsReadingAnswers(updatedRound.reading_phase); // Update based on new round state
      if(updatedRound.results_phase) setResultsCountdown(20); // Reset countdown on entering results phase
      if(updatedRound.voting_phase) setIsReadingAnswers(false); // Ensure reading is off if voting starts

<<<<<<< HEAD
    }).subscribe();
    return () => { roundBroadcast.unsubscribe(); };
  }, [gameId, round?.id]); // Removed round from dependencies to avoid loop with setRound
=======
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
>>>>>>> ac20bc9 (refactor: centralize categories table and update types & UI; set login/signup card bg white)

  const calculateScores = useCallback(() => {
    if (!question || !votes || !answers || !players) return {}; // Ensure players is also checked
    const scores: Record<string, {points: number, details: string[], playerAnswer: string | null}> = {};
    players.forEach(player => { scores[player.id] = {points: 0, details: [], playerAnswer: answers.find(a => a.player_id === player.id)?.content || null}; });
    votes.forEach(vote => {
      if (vote.selected_answer === question.correct_answer) {
        if(scores[vote.player_id]) { scores[vote.player_id].points += 2; scores[vote.player_id].details.push('✅ +2pts por votar la respuesta correcta');}
      }
    });
    const playerAnswersMap = answers.reduce((acc, answer) => { acc[answer.content] = answer.player_id; return acc; }, {} as Record<string, string>);
    votes.forEach(vote => {
      if (vote.selected_answer !== question.correct_answer) {
        const authorId = playerAnswersMap[vote.selected_answer];
        if (authorId && scores[authorId]) { scores[authorId].points += 1; scores[authorId].details.push(`🎯 +1pt por engañar a ${players.find(p => p.id === vote.player_id)?.name || 'alguien'}`); }
      }
    });
    return scores;
  }, [question, votes, answers, players]);

  // Removed fetchTotalScores, saveScores, and related useEffects as they are not part of this subtask's scope

  useEffect(() => {
    if (!players.length || !moderator) return;
    setNonModeratorPlayers(players.filter(p => p.id !== moderator.id));
  }, [players, moderator]);

  useEffect(() => {
    if (!round?.voting_phase || !round.id || !currentPlayer?.id) return; // Ensure currentPlayerId is available
    const handleVoteReceived = (payload: any) => {
      const isRecentOwnVote = Date.now() - _lastVoteTimestamp < 5000 && payload.new && payload.new.player_id === currentPlayer?.id;
      if (isRecentOwnVote) { return; }
      loadVotes();
    };
    const votesChannel = supabase.channel(`votes-realtime-${round.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes', filter: `round_id=eq.${round.id}`}, handleVoteReceived).subscribe();
    return () => { supabase.removeChannel(votesChannel); }; // Use removeChannel for cleanup
  }, [round?.id, round?.voting_phase, currentPlayer?.id, _lastVoteTimestamp]);


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

  if (!round || !moderator || !currentPlayer) { 
    return (
      <div className="bg-[#E7E7E6] flex flex-col min-h-screen px-6">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#131309] text-lg">Cargando datos de la ronda...</p>
        </div>
      </div>
    );
  }

  // Phase-specific rendering
if (round.results_phase) {
  if (!question) { 
    return (
      <div className="bg-[#E7E7E6] flex flex-col min-h-screen px-6">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#131309] text-lg">Cargando resultados...</p>
        </div>
      </div>
    );
  }
  const scoresMap = calculateScores(); 
  const sortedScoresData: PlayerScoreData[] = players
    .map(p => {
      const scoreInfo = scoresMap[p.id] || { points: 0, details: [], playerAnswer: null };
      const playerVote = votes.find(v => v.player_id === p.id)?.selected_answer;
      let voteIsCorrect: boolean | null = null;
      if (playerVote && question) { voteIsCorrect = playerVote === question.correct_answer; } 
      else if (playerVote) { voteIsCorrect = false; }

      return {
        playerId: p.id, name: p.name, avatar_color: p.avatar_color,
        points: scoreInfo.points, details: scoreInfo.details, playerAnswer: scoreInfo.playerAnswer,
        isModerator: p.id === round.moderator_id, isCurrentPlayer: p.id === currentPlayer.id,
        votedAnswer: playerVote || null, voteIsCorrect: voteIsCorrect,
      };
    })
    .sort((a, b) => {
      if (a.isModerator) return 1; if (b.isModerator) return -1;
      return b.points - a.points; 
    });

  return <ResultsView question={question} sortedScores={sortedScoresData} resultsCountdown={resultsCountdown} />;
}

if (round.voting_phase) {
  if (isModerator) {
    const nonModeratorPlayersList = players.filter(p => p.id !== round.moderator_id);
    const totalPlayersToVote = nonModeratorPlayersList.length;
    const nonModeratorVotes = votes.filter(vote => nonModeratorPlayersList.some(p => p.id === vote.player_id));
    const votedPlayersCount = nonModeratorVotes.length;
    const pendingToVotePlayersList = nonModeratorPlayersList.filter(player => !nonModeratorVotes.some(vote => vote.player_id === player.id));
    return (
      <ModeratorVotingWaitView
        totalPlayersToVote={totalPlayersToVote} votedPlayersCount={votedPlayersCount}
        pendingToVotePlayers={pendingToVotePlayersList} onRevealResults={handleRevealResults}
      />
    );
  } else {
     if (!question) { 
        return (
          <div className="bg-[#E7E7E6] flex flex-col min-h-screen px-6">
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[#131309] text-lg">Cargando votación...</p>
            </div>
          </div>
        );
      }
    return (
      <PlayerVotingView
        question={question} shuffledAnswers={shuffledAnswers}
        currentPlayerId={currentPlayer?.id} selectedAnswerContent={selectedVote}
        hasVoted={hasVoted} allPlayersVoted={allPlayersVoted} 
        onSelectAnswer={(answerContent) => setSelectedVote(answerContent)}
        onConfirmVote={() => { if(selectedVote) { handleVote(selectedVote); } }}
      />
    );
  }
}

if (round.reading_phase) {
  if (isModerator) {
    if (!question || shuffledAnswers.length === 0) {
       return (
          <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#131309] mb-4" />
            <p className="text-[#131309] text-lg">Preparando respuestas para leer...</p>
          </div>
        );
    }
    return (
      <ModeratorReadingView
        question={question} shuffledAnswers={shuffledAnswers} exitingCards={exitingCards}
        slideDirection={slideDirection} currentAnswerIndex={currentAnswerIndex}
        handlePrevAnswer={handlePrevAnswer} handleNextAnswer={handleNextAnswer}
      />
    );
  } else {
    return (
      <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center">
        <ReadingOverlay />
        <h1 className="[font-family:'Londrina_Solid'] text-[40px] text-[#131309] mt-6">BULLSHIT</h1>
        {question && (
          <div className="w-full max-w-[375px] mt-8 space-y-4">
            <div className="bg-[#131309] rounded-[20px] p-6"><p className="text-white text-xl text-center">{question.text}</p></div>
            <div className="bg-white rounded-[20px] p-4"><p className="[font-family:'Londrina_Solid'] text-[40px] text-[#131309] text-center">{question.content}</p></div>
          </div>
        )}
        {!isModerator && showInsult && <InsultPopup />}
      </div>
    );
  }
}

if (round.scoring_phase) { // Placeholder for actual scoring view
  return (
<<<<<<< HEAD
    <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center justify-center">
      <h1 className="[font-family:'Londrina_Solid'] text-[40px] text-[#131309]">Puntuaciones</h1>
=======
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

>>>>>>> ac20bc9 (refactor: centralize categories table and update types & UI; set login/signup card bg white)
      {!isModerator && showInsult && <InsultPopup />}
    </div>
  );
}

if (countdown > 0 && !question) { 
  return (
    <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center">
      <h1 className="[font-family:'Londrina_Solid'] text-[40px] text-[#131309] mt-6">BULLSHIT</h1>
      <CountdownView round={round} moderator={moderator} countdown={countdown} getCategoryIcon={getCategoryIcon} />
      {!isModerator && showInsult && <InsultPopup />}
    </div>
  );
}

// Default view: Question display and answering phase (if not moderator) or waiting (if moderator)
return (
  <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center">
    <h1 className="[font-family:'Londrina_Solid'] text-[40px] text-[#131309] mt-6">BULLSHIT</h1>
    {question && (
      <div className="w-full max-w-[327px] bg-white rounded-[20px] mt-8 p-6">
        <div className="space-y-4">
          <div className="bg-[#131309] rounded-[20px] p-6"><p className="text-white text-xl text-center">{question.text}</p></div>
          <div className="bg-white rounded-[20px] p-4"><p className="[font-family:'Londrina_Solid'] text-[40px] text-[#131309] text-center">{question.content}</p></div>
        </div>
      </div>
    )}
    {!isModerator && question && !hasAnswered && (
      <PlayerAnsweringView answer={answer} setAnswer={setAnswer} handleSubmitAnswer={handleSubmitAnswer} />
    )}
    {!isModerator && hasAnswered && !round.reading_phase && !round.voting_phase && !round.results_phase && ( // Message for player after answering, before other phases
      <div className="fixed bottom-0 left-0 right-0">
        <div className="bg-white w-full px-6 pt-5 pb-8">
          <div className="max-w-[327px] mx-auto flex flex-col items-center">
            <div className="w-16 h-16 bg-[#131309] rounded-full flex items-center justify-center mb-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="#9FFF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <p className="text-[#131309] text-2xl font-bold mb-4">¡Respuesta enviada!</p>
            <p className="text-[#131309] text-base text-center">{moderator?.name} os leerá vuestra mierda de respuestas cuando todos la hayan enviado.</p>
          </div>
        </div>
      </div>
    )}
    {isModerator && question && !round.reading_phase && !round.voting_phase && !round.results_phase && ( // Moderator waiting for answers
      <ModeratorWaitingView
        pendingPlayers={getPendingPlayers()}
        sendInsultBroadcast={async () => {
          if (!round) return;
          supabase.channel('insulto-broadcast').send({ type: 'broadcast', event: 'insulto', payload: { roundId: round.id } });
        }}
        handleStartReadingAnswers={handleStartReadingAnswers}
      />
    )}
    {!isModerator && showInsult && <InsultPopup />}
  </div>
);
};