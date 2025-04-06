import { Button } from "../../components/ui/button";
import { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { ArrowLeft, Share2 } from "lucide-react";
import type { Player, Game } from "../../lib/types";
import { initializeGameQuestions, getQuestionForRound } from '../../services/questionService';

// Usar un servicio de avatares generados
const getAvatarUrl = (seed: string) => 
  `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;

export const GameLobby = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameId } = useParams();
  const [players, setPlayers] = useState<Player[]>([]);
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const playerName = location.state?.playerName;
  const [showPresenta, setShowPresenta] = useState(false);
  const [showGameName, setShowGameName] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);

  useEffect(() => {
    if (!gameId || !playerName) return;

    let gameSubscription: any;

    const setupSubscriptions = async () => {
      try {
        // Suscribirse a cambios en el juego
        gameSubscription = supabase
          .channel(`game-${gameId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'games',
              filter: `id=eq.${gameId}`
            },
            async (payload) => {
              const gameData = payload.new as Game;
              setGame(gameData);
              
              // Si el juego ha comenzado, obtener la ronda activa
              if (gameData.started) {
                const { data: activeRound } = await supabase
                  .from('rounds')
                  .select('*')
                  .eq('game_id', gameId)
                  .eq('active', true)
                  .single();

                if (activeRound) {
                  // Navegar a la pantalla introductoria con toda la información necesaria
                  navigate(`/game/${gameId}/round/intro`, {
                    state: { 
                      playerName,
                      roundNumber: activeRound.number,
                      roundId: activeRound.id,
                      moderatorId: activeRound.moderator_id,
                      category: activeRound.category
                    }
                  });
                }
              }
            }
          )
          .subscribe();

      } catch (err) {
        console.error('Error setting up subscriptions:', err);
      }
    };

    setupSubscriptions();

    return () => {
      if (gameSubscription) {
        gameSubscription.unsubscribe();
      }
    };
  }, [gameId, playerName, navigate]);

  useEffect(() => {
    if (!gameId) return;

    const fetchGameAndPlayers = async () => {
      try {
        // Fetch game
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('*, creator_id')
          .eq('id', gameId)
          .single();

        console.log('Datos del juego cargados:', gameData);
        console.log('creator_id del juego:', gameData.creator_id);

        if (gameError) throw gameError;
        setGame(gameData);

        // Si el juego ya está iniciado, obtener la ronda activa
        if (gameData.started) {
          const { data: activeRound } = await supabase
            .from('rounds')
            .select('*')
            .eq('game_id', gameId)
            .eq('active', true)
            .single();

          if (activeRound) {
            navigate(`/game/${gameId}/round/intro`, {
              state: { 
                playerName,
                roundNumber: activeRound.number,
                roundId: activeRound.id,
                moderatorId: activeRound.moderator_id,
                category: activeRound.category
              }
            });
          }
          return;
        }

        // Fetch players si el juego no ha comenzado
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('game_id', gameId)
          .order('created_at', { ascending: true });

        if (playersError) throw playersError;
        if (playersData) {
          setPlayers(playersData);
          const player = playersData.find(p => p.name === playerName);
          console.log('Encontrado jugador actual:', player);
          if (player) {
            console.log('Asignando currentPlayerId:', player.id);
            setCurrentPlayerId(player.id);
          }
        }
      } catch (err) {
        console.error('Error in fetchGameAndPlayers:', err);
        setError('Error al cargar la partida');
      }
    };

    fetchGameAndPlayers();

    const intervalId = setInterval(fetchGameAndPlayers, 2000);

    return () => clearInterval(intervalId);
  }, [gameId, navigate, playerName]);

  const handleStartGame = async () => {
    try {
      if (!gameId) {
        console.error('GameId is undefined');
        return;
      }

      setIsStartingGame(true);
      
      // 1. Inicializar preguntas para el juego
      const initialized = await initializeGameQuestions(gameId);
      
      if (!initialized) {
        console.error('Error inicializando preguntas');
        setIsStartingGame(false);
        return;
      }
      
      // 2. Obtener preguntas para todas las rondas (vamos a crear 5 rondas)
      const totalRounds = 5;
      const rounds = [];
      
      for (let roundNumber = 1; roundNumber <= totalRounds; roundNumber++) {
        // Obtener pregunta para esta ronda
        const question = await getQuestionForRound(gameId, roundNumber);
        
        if (!question) {
          console.error(`No se pudo obtener una pregunta para la ronda ${roundNumber}`);
          continue;
        }
        
        // Seleccionar moderador para esta ronda (rotando entre jugadores)
        const moderatorIndex = (roundNumber - 1) % players.length;
        const moderatorId = players[moderatorIndex].id;
        
        // Añadir la ronda a la lista
        rounds.push({
          game_id: gameId,
          number: roundNumber,
          moderator_id: moderatorId,
          question_id: question.id,
          active: roundNumber === 1, // Solo la primera ronda empieza activa
          category: 'Siglas', // Usar una categoría que sabemos es válida
          voting_phase: false,
          reading_phase: false,
          results_phase: false
        });
      }
      
      // 3. Insertar todas las rondas en la base de datos
      const { data: createdRounds, error: roundsError } = await supabase
        .from('rounds')
        .insert(rounds)
        .select();
      
      if (roundsError) {
        console.error('Error creando las rondas:', roundsError);
        throw roundsError;
      }
      
      console.log(`Creadas ${createdRounds?.length || 0} rondas para el juego`);
      
      // 4. Actualizar el estado del juego con la primera ronda
      const firstRoundId = createdRounds?.[0]?.id;
      
      if (!firstRoundId) {
        throw new Error('No se pudo obtener el ID de la primera ronda');
      }
      
      await supabase
        .from('games')
        .update({ 
          started: true,
          current_round_id: firstRoundId
        })
        .eq('id', gameId);
      
      // Continuar con el código existente...
    } catch (error) {
      console.error('Error al iniciar el juego:', error);
      setIsStartingGame(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/join/${gameId}`;
    
    try {
      // Intentar usar la API Web Share si está disponible
      if (navigator.share) {
        await navigator.share({
          title: `Únete a ${game?.name} en BULLSHIT`,
          text: '¡Únete a nuestra partida de BULLSHIT!',
          url: shareUrl
        });
      } else {
        // Si Web Share no está disponible, copiar al portapapeles
        await navigator.clipboard.writeText(shareUrl);
        setShowSnackbar(true);
        setTimeout(() => {
          setShowSnackbar(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error compartiendo:', error);
    }
  };

  useEffect(() => {
    console.log('=== DEPURACIÓN CREADOR ===');
    console.log('currentPlayerId:', currentPlayerId);
    console.log('game?.creator_id:', game?.creator_id);
    console.log('Son iguales?', currentPlayerId === game?.creator_id);
    console.log('Tipo de currentPlayerId:', typeof currentPlayerId);
    console.log('Tipo de game?.creator_id:', typeof game?.creator_id);
    console.log('Jugadores:', players);
    console.log('========================');
  }, [currentPlayerId, game, players]);

  // Efecto para controlar la secuencia de animación
  useEffect(() => {
    // Mostrar "presenta a..." después de 500ms
    const presentaTimer = setTimeout(() => {
      setShowPresenta(true);
    }, 500);

    // Mostrar el nombre del juego después de 1000ms
    const gameNameTimer = setTimeout(() => {
      setShowGameName(true);
    }, 1000);

    return () => {
      clearTimeout(presentaTimer);
      clearTimeout(gameNameTimer);
    };
  }, []);

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

  return (
    <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center">
      <>
        <h1 className="[font-family:'Londrina_Solid'] text-[40px] text-[#131309] mt-2 animate-fade-in">
          BULLSHIT
        </h1>
      </>
      
      <p 
        className={`
          text-[#131309] text-xl mt-0 
          transition-opacity duration-500 
          ${showPresenta ? 'opacity-100' : 'opacity-0'}
        `}
      >
        presenta a...
      </p>

      <h2 
        className={`
          [font-family:'Londrina_Solid'] text-[40px] text-[#131309] mt-1 text-center
          transition-all duration-500
          ${showGameName 
            ? 'opacity-100 transform translate-y-0' 
            : 'opacity-0 transform translate-y-4'
          }
        `}
      >
        {game?.name?.toUpperCase()}
      </h2>

      <div className="w-full max-w-[327px] bg-white rounded-[20px] mt-8 p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-[#131309] text-xl">
            {players.length} {players.length === 1 ? 'jugador' : 'jugadores'} en la partida
          </p>
          <button 
            className="text-[#131309] hover:text-[#131309]/70 transition-colors"
            onClick={handleShare}
          >
            <Share2 className="w-6 h-6" />
          </button>
        </div>

        {/* Mensaje condicional basado en si es el primer jugador o no */}
        {players.length > 0 && currentPlayerId === players[0].id ? (
          <div className="bg-[#131309] text-white p-4 rounded-[10px] mb-6">
            <p className="text-center">
              Eres el primer jugador en llegar.
            </p>
            <p className="text-center mt-2">
              Cuando todos los demás hayan llegado, haz click en 'Comenzar Partida'.
            </p>
          </div>
        ) : (
          <div className="bg-[#131309] text-white p-4 rounded-[10px] mb-6">
            <p className="text-center">
              Espera a que se unan todos los jugadores antes de comenzar.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {players.map((player) => (
            <div
              key={player.id}
              className="flex items-center gap-3 p-3 bg-[#E7E7E6] rounded-[10px]"
            >
              <img 
                src={getAvatarUrl(player.name)} 
                alt="Avatar"
                className="w-12 h-12 rounded-full object-cover bg-gray-100"
              />
              <span className="flex-1 text-[#131309] text-lg">
                {player.name}
                {player.id === currentPlayerId && " (Tú)"}
              </span>
            </div>
          ))}
        </div>

        {/* Banner informativo para jugadores que no son el primero */}
        {players.length > 0 && currentPlayerId !== players[0].id && (
          <div className="border-2 border-[#131309] text-[#131309] p-4 rounded-[10px] mt-6">
            <p className="text-center">
              {players[0]?.name} comenzará la partida cuando estéis todos dentro
            </p>
          </div>
        )}

        {/* Botón de comenzar partida solo visible para el primer jugador */}
        {players.length > 0 && currentPlayerId === players[0].id && (
          <Button
            className="w-full h-12 bg-[#CB1517] hover:bg-[#B31315] rounded-[10px] font-bold text-base mt-3"
            onClick={handleStartGame}
            disabled={players.length < 2 || isStartingGame}
          >
            {isStartingGame ? "Iniciando partida..." : 
              players.length < 2 ? "Esperando jugadores..." : "Comenzar partida"}
          </Button>
        )}
      </div>

      {showSnackbar && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-[#131309] text-white px-4 py-3 rounded-lg shadow-lg z-50">
          Link copiado bro
        </div>
      )}
    </div>
  );
};