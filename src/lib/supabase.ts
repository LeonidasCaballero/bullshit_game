import { createClient } from '@supabase/supabase-js';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: true,
    detectSessionInUrl: false
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'Content-Type': 'application/json'
    }
  },
  db: {
    schema: 'public'
  }
});

// Create a realtime subscription for answers
export const subscribeToAnswers = (roundId: string, callback: (answers: Answer[]) => void) => {
  console.log(`📝 Configurando suscripción a respuestas para ronda ${roundId}`);

  // Obtener todas las respuestas iniciales
  supabase
    .from('answers')
    .select('*')
    .eq('round_id', roundId)
    .then(({ data }) => {
      console.log(`📊 Cargando respuestas iniciales: ${data?.length || 0}`);
      if (data) {
        callback(data);
      }
    });

  // Canal dedicado de broadcast para respuestas
  const channel = supabase
    .channel(`answers-broadcast`)
    .on('broadcast', { event: 'new-answer' }, () => {
      console.log('📣 Notificación de nueva respuesta recibida');
      
      // Refrescar todas las respuestas
      supabase
        .from('answers')
        .select('*')
        .eq('round_id', roundId)
        .then(({ data }) => {
          console.log(`📊 Total de respuestas actualizadas: ${data?.length || 0}`);
          if (data) {
            callback(data);
          }
        });
    })
    .subscribe((status) => {
      console.log(`🔄 Estado de suscripción a respuestas: ${status}`);
    });

  console.log(`✅ Suscrito a respuestas para ronda ${roundId}`);
  return channel;
};

// Create a realtime subscription for rounds
export const subscribeToRound = (roundId: string, onUpdate: (round: Round) => void) => {
  return supabase
    .channel(`round_${roundId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rounds',
        filter: `id=eq.${roundId}`
      },
      (payload) => {
        console.log('Round updated:', payload);
        if (payload.new) {
          onUpdate(payload.new as Round);
        }
      }
    )
    .subscribe();
};

// Create a subscription for votes
export const subscribeToVotes = (roundId: string, callback: (votes: Vote[]) => void) => {
  console.log(`📝 Configurando suscripción a votos para ronda ${roundId}`);

  // Obtener todos los votos iniciales
  supabase
    .from('votes')
    .select('*')
    .eq('round_id', roundId)
    .then(({ data }) => {
      console.log(`📊 Cargando votos iniciales: ${data?.length || 0}`);
      if (data) {
        callback(data);
      }
    });

  // Canal dedicado de broadcast para votos
  const channel = supabase
    .channel(`votes-broadcast`)
    .on('broadcast', { event: 'new-vote' }, () => {
      console.log('📣 Notificación de nuevo voto recibida');
      
      // Refrescar todos los votos
      supabase
        .from('votes')
        .select('*')
        .eq('round_id', roundId)
        .then(({ data }) => {
          console.log(`📊 Total de votos actualizados: ${data?.length || 0}`);
          if (data) {
            callback(data);
          }
        });
    })
    .subscribe((status) => {
      console.log(`🔄 Estado de suscripción a votos: ${status}`);
    });

  console.log(`✅ Suscrito a votos para ronda ${roundId}`);
  return channel;
};

// Generate a random color for player avatar
export const generateAvatarColor = () => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB',
    '#E67E22', '#2ECC71', '#1ABC9C', '#F1C40F'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Format last seen time
export const formatLastSeen = (date: string) => {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: es
  });
};

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: any): string => {
  console.error('Supabase error:', error);
  
  if (error.code === 'PGRST116') {
    return 'No se encontraron resultados';
  }
  
  if (error.code === '20P0001') {
    return 'Error de validación en la base de datos';
  }
  
  if (error.message?.includes('Failed to fetch')) {
    return 'Error de conexión con el servidor';
  }
  
  return 'Ha ocurrido un error inesperado';
};

// Utility function to retry failed requests
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  backoff: number = 2
): Promise<T> => {
  let lastError: Error = new Error('Operation failed');
  let currentDelay = delay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) break;
      
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= backoff;
    }
  }

  throw lastError;
};