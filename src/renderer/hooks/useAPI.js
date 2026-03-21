import { useCallback, useState } from 'react';

export function useAPI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const invoke = useCallback(async (channel, ...args) => {
    try {
      setLoading(true);
      setError(null);
      const result = await window.electron.invoke(channel, ...args);
      if (!result.success) {
        throw new Error(result.error || 'Operation failed');
      }
      return result.data || result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { invoke, loading, error };
}
