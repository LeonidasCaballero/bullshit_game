// src/lib/fetchWithRetry.ts
export const fetchWithRetry = async <T,>(
  fetcher: () => Promise<{ data: T; error: any }>,
  maxAttempts = 3,
  delay = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { data, error } = await fetcher();
      if (error) throw error;
      if (data === null && attempt < maxAttempts) { 
         console.warn(`fetchWithRetry: Data was null on attempt ${attempt}, retrying...`);
         throw new Error(`Null data received on attempt ${attempt}`); 
      }
      if (data === null && attempt === maxAttempts) { 
         console.warn(`fetchWithRetry: Data is null after ${maxAttempts} attempts. Returning null or throwing.`);
         throw new Error(`Data is null after ${maxAttempts} attempts.`);
      }
      return data;
    } catch (err) {
      console.error(`fetchWithRetry: Attempt ${attempt} of ${maxAttempts} failed. Error: ${err}`);
      if (attempt === maxAttempts) throw err;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt -1) )); // Exponential backoff
    }
  }
  throw new Error('Max retries reached and loop somehow exited.'); // Should not be reached
};
