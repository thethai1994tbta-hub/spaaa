import { useCallback, useState } from 'react';

export function useAPI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const invoke = useCallback(async (channel, ...args) => {
    try {
      setLoading(true);
      setError(null);

      // Get IPC from window
      const ipc = window.electron || window.ipc;
      if (!ipc) {
        throw new Error('IPC not available');
      }

      const result = await ipc.invoke(channel, ...args);
      if (!result.success) {
        throw new Error(result.error || 'Operation failed');
      }
      return result.data || result;
    } catch (err) {
      setError(err.message);
      console.error('[API Error]', channel, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { invoke, loading, error };
}
