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
export const subscribeToAnswers = (roundId: string, onUpdate: (answers: any[]) => void) => {
  const channel = supabase.channel(`answers-${roundId}`, {
    config: {
      broadcast: { self: true },
      presence: { key: roundId }
    }
  });

  // Subscribe to all answer changes
  channel
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'answers',
        filter: `round_id=eq.${roundId}`
      },
      async (payload) => {
        console.log('New answer received:', payload);
        try {
          const { data, error } = await supabase
            .from('answers')
            .select('*')
            .eq('round_id', roundId);
          
          if (error) {
            console.error('Error fetching answers:', error);
            return;
          }
          
          if (data) {
            onUpdate(data);
          }
        } catch (err) {
          console.error('Error in answers subscription handler:', err);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Subscribed to answers for round ${roundId}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`Error subscribing to answers for round ${roundId}`);
      }
    });

  return channel;
};

// Create a realtime subscription for rounds
export const subscribeToRound = (roundId: string, onUpdate: (round: any) => void) => {
  const channel = supabase.channel(`round-${roundId}`, {
    config: {
      broadcast: { self: true },
      presence: { key: roundId }
    }
  });

  channel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rounds',
        filter: `id=eq.${roundId}`
      },
      (payload) => {
        console.log('Round update received:', payload);
        try {
          if (payload.new) {
            onUpdate(payload.new);
          }
        } catch (err) {
          console.error('Error in round subscription handler:', err);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Subscribed to round ${roundId}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`Error subscribing to round ${roundId}`);
      }
    });

  return channel;
};

// Create a subscription for votes
export const subscribeToVotes = (roundId: string, onUpdate: (votes: any[]) => void) => {
  const channel = supabase.channel(`votes-${roundId}`, {
    config: {
      broadcast: { self: true },
      presence: { key: roundId }
    }
  });

  channel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'votes',
        filter: `round_id=eq.${roundId}`
      },
      async () => {
        try {
          const { data, error } = await supabase
            .from('votes')
            .select('*')
            .eq('round_id', roundId);
          
          if (error) {
            console.error('Error fetching votes:', error);
            return;
          }
          
          if (data) {
            onUpdate(data);
          }
        } catch (err) {
          console.error('Error in votes subscription handler:', err);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Subscribed to votes for round ${roundId}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`Error subscribing to votes for round ${roundId}`);
      }
    });

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