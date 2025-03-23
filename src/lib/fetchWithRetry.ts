import { PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';

type SupabaseResponse<T> = PostgrestResponse<T> | PostgrestSingleResponse<T>;

async function fetchWithRetry<T>(
  fn: () => Promise<SupabaseResponse<T>>
): Promise<T> {
  const MAX_RETRIES = 3;
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const { data, error } = await fn();
      
      if (error) throw error;
      if (!data) throw new Error('No data returned');
      
      return data;
    } catch (err) {
      retries++;
      if (retries === MAX_RETRIES) throw err;
      await new Promise(resolve => setTimeout(resolve, 1000 * retries));
    }
  }

  throw new Error('Max retries reached');
}

export { fetchWithRetry }; 