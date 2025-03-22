import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Player {
  id: string;
  name: string;
}

interface Vote {
  id: string;
  round_id: string;
  player_id: string;
  selected_answer: string;
}

interface ModeratorViewProps {
  gameId: string;
  roundId: string;
  players: Player[];
  round: {
    id: string;
    moderator_id: string;
  };
}

export function ModeratorView({ gameId, roundId, players, round }: ModeratorViewProps) {
  const [pendingPlayers, setPendingPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [votes, setVotes] = useState<Vote[]>([]);

  // Log cuando el componente se monta/actualiza
  console.log('🔄 ModeratorView Render', {
    gameId,
    roundId,
    playersCount: players.length,
    moderatorId: round.moderator_id,
    currentVotes: votes.length
  });

  useEffect(() => {
    const fetchPendingPlayers = async () => {
      console.log('📥 Iniciando fetchPendingPlayers');
      try {
        setIsLoading(true);
        
        // Fetch players
        console.log('👥 Fetching players...');
        const { data: allPlayers, error: playersError } = await supabase
          .from('players')
          .select('id, name')
          .eq('game_id', gameId)
          .neq('id', round.moderator_id);

        if (playersError) {
          console.error('❌ Error fetching players:', playersError);
          return;
        }
        console.log('✅ Players fetched:', allPlayers);

        // Fetch votes
        console.log('🗳️ Fetching votes...');
        const { data: votesData, error: votesError } = await supabase
          .from('votes')
          .select('*')
          .eq('round_id', roundId);

        if (votesError) {
          console.error('❌ Error fetching votes:', votesError);
          return;
        }
        console.log('✅ Votes fetched:', votesData);

        // Update state
        const votedPlayerIds = new Set(votesData?.map(v => v.player_id) || []);
        const pendingPlayers = allPlayers?.filter(player => !votedPlayerIds.has(player.id)) || [];
        
        console.log('📊 Actualizando estados:', {
          pendingPlayers: pendingPlayers.length,
          totalVotes: votesData?.length || 0
        });

        setPendingPlayers(pendingPlayers);
        setVotes(votesData || []);
      } catch (err) {
        console.error('❌ Error in fetchPendingPlayers:', err);
      } finally {
        setIsLoading(false);
      }
    };

    console.log('🔄 Configurando suscripción de votos');
    fetchPendingPlayers();

    const votesChannel = supabase
      .channel(`votes-${roundId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `round_id=eq.${roundId}`
        },
        async (payload) => {
          console.log('🎯 Cambio detectado en votos:', payload);
          await fetchPendingPlayers();
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción:', status);
      });

    return () => {
      console.log('♻️ Limpiando suscripción de votos');
      votesChannel.unsubscribe();
    };
  }, [gameId, roundId, round.moderator_id]);

  // Log cada vez que votes cambia
  useEffect(() => {
    console.log('🔄 Votes actualizados:', {
      totalVotes: votes.length,
      votes
    });
  }, [votes]);

  // Cálculos para el contador
  const totalPlayers = players.filter(p => p.id !== round.moderator_id).length;
  const votedPlayers = votes.filter(vote => 
    players.some(p => p.id === vote.player_id && p.id !== round.moderator_id)
  ).length;

  console.log('📊 Estado actual:', {
    totalPlayers,
    votedPlayers,
    pendingCount: pendingPlayers.length
  });

  if (isLoading) {
    return (
      <div className="w-full max-w-[327px] bg-white rounded-[20px] mt-8 p-6">
        <p className="text-[#131309] text-2xl font-bold text-center">
          MODO VOTACIÓN
        </p>
        <p className="text-[#131309] text-base text-center mt-4">
          Cargando estado de votación...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[327px] bg-white rounded-[20px] mt-8 p-6">
      <p className="text-[#131309] text-2xl font-bold text-center">
        MODO VOTACIÓN
      </p>
      <div className="mt-4 space-y-2">
        {pendingPlayers.length > 0 ? (
          <>
            <p className="text-[#131309] text-base text-center mb-4">
              Jugadores pendientes de votar:
            </p>
            {pendingPlayers.map(player => (
              <div 
                key={player.id}
                className="flex items-center gap-3 p-3 bg-[#E7E7E6] rounded-[10px]"
              >
                <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                <span className="flex-1 text-[#131309]">
                  {player.name}
                </span>
              </div>
            ))}
          </>
        ) : (
          <p className="text-[#131309] text-base text-center">
            ¡Ya han votado todos los jugadores!
          </p>
        )}
      </div>
    </div>
  );
}

export default ModeratorView; 