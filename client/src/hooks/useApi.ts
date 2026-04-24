'use client';

import { useState, useCallback } from 'react';
import { api, ApiError } from '@/lib/api-client';

interface UseApiResult<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  execute: (...args: unknown[]) => Promise<T | null>;
  reset: () => void;
}

export function useApi<T>(apiFn: (...args: unknown[]) => Promise<T>): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(async (...args: unknown[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiFn(...args);
      setData(result);
      return result;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'An unexpected error occurred';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiFn]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { data, error, isLoading, execute, reset };
}