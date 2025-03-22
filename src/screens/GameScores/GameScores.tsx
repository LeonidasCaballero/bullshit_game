import { useLocation, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import type { Player } from "../../lib/types";

interface PlayerScore {
  player: Player;
  totalPoints: number;
  roundPoints: {
    points: number;
    reason: string;
  }[];
  correctVotePoints: number;  // Puntos por acertar
  receivedVotesPoints: number;  // Puntos por votos recibidos
}

export const GameScores = () => {
  const location = useLocation();
  const { gameId } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>([]);
  const roundNumber = location.state?.roundNumber;
  const [countdown, setCountdown] = useState<number>(20);
  const navigate = useNavigate();

  useEffect(() => {
    const calculateScores = async () => {
      try {
        setIsLoading(true);
        
        // 1. Obtener los jugadores
        const { data: players } = await supabase
          .from('players')
          .select('*')
          .eq('game_id', gameId);

        if (!players) return;

        // 2. Obtener las puntuaciones
        const { data: scores } = await supabase
          .from('scores')
          .select('*')
          .eq('game_id', gameId);

        // 3. Calcular puntuaciones por jugador
        const calculatedScores = players.map(player => {
          const playerScores = scores?.filter(s => s.player_id === player.id) || [];
          const correctVotePoints = playerScores
            .filter(s => s.reason === 'Voto correcto')
            .reduce((sum, score) => sum + score.points, 0);
          const receivedVotesPoints = playerScores
            .filter(s => s.reason === 'Votos recibidos')
            .reduce((sum, score) => sum + score.points, 0);

          return {
            player,
            totalPoints: correctVotePoints + receivedVotesPoints,
            roundPoints: playerScores
              .filter(score => score.round_id === location.state?.roundId)
              .map(score => ({
                points: score.points,
                reason: score.reason
              })),
            correctVotePoints,
            receivedVotesPoints
          };
        });

        // 4. Ordenar por puntos totales
        calculatedScores.sort((a, b) => b.totalPoints - a.totalPoints);
        
        setPlayerScores(calculatedScores);
      } catch (error) {
        console.error('Error loading scores:', error);
      } finally {
        setIsLoading(false);
      }
    };

    calculateScores();
  }, [gameId, location.state?.roundId]);

  // Timer para la siguiente ronda
  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);

      return () => clearInterval(timer);
    }

    if (countdown === 0) {
      const transitionToNextRound = async () => {
        try {
          console.log('🔄 Iniciando transición a siguiente ronda');
          console.log('Estado actual:', {
            gameId,
            roundNumber,
            currentRoundId: location.state?.roundId
          });

          // 1. Primero, desactivar la ronda actual
          console.log('📝 Desactivando ronda actual');
          await supabase
            .from('rounds')
            .update({ active: false })
            .eq('id', location.state?.roundId);

          // 2. Verificar que no haya rondas activas (debería ser false ahora)
          const { data: activeRound } = await supabase
            .from('rounds')
            .select('*')
            .eq('game_id', gameId)
            .eq('active', true)
            .single();

          console.log('🔍 Verificación de ronda activa:', activeRound);

          // 3. Obtener jugadores
          const { data: players } = await supabase
            .from('players')
            .select('*')
            .eq('game_id', gameId)
            .order('created_at', { ascending: true });

          console.log('👥 Jugadores obtenidos:', players);

          if (!players) return;

          const currentModeratorIndex = players.findIndex(p => p.id === location.state?.moderatorId);
          const nextModeratorIndex = (currentModeratorIndex + 1) % players.length;
          const nextModerator = players[nextModeratorIndex];

          console.log('👤 Siguiente moderador:', {
            current: location.state?.moderatorId,
            next: nextModerator.id
          });

          // Obtener pregunta
          const { data: question } = await supabase
            .from('questions')
            .select('id')
            .eq('category', 'pelicula')
            .limit(1)
            .single();

          console.log('❓ Pregunta seleccionada:', question);

          // Crear nueva ronda
          console.log('📝 Creando nueva ronda con:', {
            number: roundNumber + 1,
            moderator: nextModerator.id,
            question: question?.id
          });

          const { data: newRound, error: createError } = await supabase
            .from('rounds')
            .insert({
              game_id: gameId,
              number: roundNumber + 1,
              moderator_id: nextModerator.id,
              category: 'pelicula',
              active: true,
              question_id: question?.id,
              voting_phase: false,
              reading_phase: false,
              results_phase: false
            })
            .select()
            .single();

          console.log('✅ Nueva ronda creada:', newRound);
          console.log('❌ Error al crear ronda:', createError);

          if (createError) throw createError;
          if (!newRound) throw new Error('No se pudo crear la nueva ronda');

          console.log('🚀 Navegando a siguiente ronda con:', {
            roundNumber: roundNumber + 1,
            roundId: newRound.id,
            moderatorId: nextModerator.id
          });

          navigate(`/game/${gameId}/next-round`, {
            state: { 
              playerName: location.state?.playerName,
              roundNumber: roundNumber + 1,
              roundId: newRound.id,
              moderatorId: nextModerator.id,
              category: 'pelicula'
            }
          });

        } catch (err) {
          console.error('❌ Error en transición:', err);
          // Intentar obtener la ronda activa
          try {
            const { data: activeRound } = await supabase
              .from('rounds')
              .select('*')
              .eq('game_id', gameId)
              .eq('active', true)
              .single();

            navigate(`/game/${gameId}/next-round`, {
              state: { 
                playerName: location.state?.playerName,
                roundNumber: roundNumber + 1,
                roundId: activeRound?.id,
                moderatorId: activeRound?.moderator_id,
                category: activeRound?.category
              }
            });
          } catch (fetchErr) {
            // Si todo falla, navegar con información mínima
            navigate(`/game/${gameId}/next-round`, {
              state: { 
                playerName: location.state?.playerName,
                roundNumber: roundNumber + 1
              }
            });
          }
        }
      };

      transitionToNextRound();
    }
  }, [countdown, gameId, navigate, location.state, roundNumber]);

  if (isLoading) {
    return (
      <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center justify-center">
        <p className="text-[#131309] text-lg">Cargando puntuaciones...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#E7E7E6] flex flex-col min-h-screen items-center">
      <h1 className="[font-family:'Londrina_Solid'] text-[56px] text-[#131309] mt-12">
        Puntuaciones
      </h1>
      
      <p className="text-[#131309] text-xl mt-4">
        RONDA {roundNumber}
      </p>

      <div className="w-full max-w-[327px] bg-white rounded-[20px] mt-8 p-6">
        <div className="space-y-4">
          {playerScores.map((playerScore, index) => (
            <div 
              key={playerScore.player.id}
              className="flex flex-col p-4 bg-[#E7E7E6] rounded-[10px]"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: playerScore.player.avatar_color }}
                  >
                    {playerScore.player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[#131309]">{playerScore.player.name}</span>
                </div>
                <span className="text-[#131309] font-bold">{playerScore.totalPoints} pts</span>
              </div>

              <div className="pl-11 space-y-1 text-sm text-gray-600">
                {playerScore.correctVotePoints > 0 && (
                  <div className="flex justify-between">
                    <span>Acierto</span>
                    <span>{playerScore.correctVotePoints} pts</span>
                  </div>
                )}
                {playerScore.receivedVotesPoints > 0 && (
                  <div className="flex justify-between">
                    <span>Votos recibidos</span>
                    <span>{playerScore.receivedVotesPoints} pts</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Añadir el timer en la parte inferior */}
      <div className="fixed bottom-0 left-0 right-0">
        <div className="bg-white w-full px-6 pt-5 pb-8">
          <div className="max-w-[327px] mx-auto">
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold mb-4">{countdown}s</span>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#CB1517] transition-all duration-1000 ease-linear"
                  style={{ width: `${(countdown / 20) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 