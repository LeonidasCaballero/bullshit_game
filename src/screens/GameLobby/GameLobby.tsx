import { Button } from "../../components/ui/button";
import React, { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Users, ArrowLeft, Share2 } from "lucide-react";
import type { Player, Game } from "../../lib/types";

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
          .select('*')
          .eq('id', gameId)
          .single();

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
        if (playersData) setPlayers(playersData);
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
    if (!gameId || players.length < 2 || isStartingGame) return;
    
    setIsStartingGame(true);
    
    try {
      // 1. Obtener todas las preguntas disponibles
      const { data: availableQuestions } = await supabase
        .from('questions')
        .select('id')
        .eq('category', 'pelicula');

      if (!availableQuestions || availableQuestions.length === 0) {
        throw new Error('No hay preguntas disponibles');
      }

      // 2. Seleccionar 4 preguntas (permitiendo repeticiones si es necesario)
      const selectedQuestions = [];
      for (let i = 0; i < 4; i++) {
        const randomIndex = Math.floor(Math.random() * availableQuestions.length);
        selectedQuestions.push(availableQuestions[randomIndex]);
      }

      // 3. Crear las 4 rondas
      const rounds = [];
      for (let i = 0; i < 4; i++) {
        const moderator = players[i % players.length];
        rounds.push({
          game_id: gameId,
          number: i + 1,
          moderator_id: moderator.id,
          category: 'pelicula',
          active: i === 0,
          question_id: selectedQuestions[i].id,
          voting_phase: false,
          reading_phase: false,
          results_phase: false
        });
      }

      // 4. Insertar todas las rondas
      const { error: roundsError } = await supabase
        .from('rounds')
        .insert(rounds);

      if (roundsError) throw roundsError;

      // 5. Actualizar el estado del juego
      const { error: gameError } = await supabase
        .from('games')
        .update({ 
          started: true,
          current_round_id: rounds[0].id 
        })
        .eq('id', gameId);

      if (gameError) throw gameError;

    } catch (err) {
      console.error('Error starting game:', err);
      setError('Error al iniciar el juego');
      setIsStartingGame(false);
    }
  };

  const checkGameStatus = async () => {
    try {
      // En lugar de buscar rondas activas, obtener la ronda más reciente
      const { data: latestRound } = await supabase
        .from('rounds')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestRound) {
        // Usar la ronda más reciente para determinar el estado del juego
        navigate(`/game/${gameId}/round`, {
          state: {
            roundId: latestRound.id,
            roundNumber: latestRound.number,
            moderatorId: latestRound.moderator_id,
            playerName: location.state?.playerName
          }
        });
      }
    } catch (error) {
      console.error('Error checking game status:', error);
    }
  };

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
      <h1 className="[font-family:'Londrina_Solid'] text-[56px] text-[#131309] mt-12">
        BULLSHIT
      </h1>
      
      <p className="text-[#131309] text-xl mt-2">
        presenta a...
      </p>

      <h2 className="[font-family:'Londrina_Solid'] text-[56px] text-[#131309] mt-4 text-center">
        {game?.name?.toUpperCase()}
      </h2>

      <div className="w-full max-w-[327px] bg-white rounded-[20px] mt-8 p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-[#131309] text-xl">
            {players.length} {players.length === 1 ? 'jugador' : 'jugadores'} en la partida
          </p>
          <button className="text-[#131309]">
            <Share2 className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-[#131309] text-white p-4 rounded-[10px] mb-6">
          <p className="text-center">
            Espera a que se unan todos los jugadores antes de comenzar.
          </p>
        </div>

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

        <Button
          className="w-full h-12 bg-[#CB1517] hover:bg-[#B31315] rounded-[10px] font-bold text-base mt-6"
          onClick={handleStartGame}
          disabled={players.length < 2 || isStartingGame}
        >
          {isStartingGame ? "Iniciando partida..." : 
            players.length < 2 ? "Esperando jugadores..." : "Comenzar partida"}
        </Button>
      </div>
    </div>
  );
};