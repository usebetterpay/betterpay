import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, type Snapshot } from './api';

type Ctx = {
  state: Snapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setState: (s: Snapshot) => void;
  run: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
};

const DogfoodContext = createContext<Ctx | null>(null);

export function DogfoodProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const s = await api.state();
      setState(s);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = useCallback(async <T,>(fn: () => Promise<T>) => {
    try {
      setError(null);
      return await fn();
    } catch (e) {
      setError((e as Error).message);
      return undefined;
    }
  }, []);

  const value = useMemo(
    () => ({ state, loading, error, refresh, setState, run }),
    [state, loading, error, refresh, run],
  );

  return <DogfoodContext.Provider value={value}>{children}</DogfoodContext.Provider>;
}

export function useDogfood() {
  const ctx = useContext(DogfoodContext);
  if (!ctx) throw new Error('useDogfood outside provider');
  return ctx;
}
