'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type CurrencyMode = 'TOMAN' | 'RIAL';

interface SettingsValue {
  mode: CurrencyMode;
  setMode: (m: CurrencyMode) => void;
  favorites: string[];
  toggleFavorite: (symbol: string) => void;
  isFavorite: (symbol: string) => boolean;
}

const SettingsContext = createContext<SettingsValue | null>(null);

const MODE_KEY = 'sarmaye_currency_mode';
const FAV_KEY = 'sarmaye_favorites';

function readFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FAV_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<CurrencyMode>('TOMAN');
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem(MODE_KEY);
    if (stored === 'RIAL') setModeState('RIAL');
    setFavorites(readFavorites());
  }, []);

  const setMode = useCallback((m: CurrencyMode) => {
    setModeState(m);
    window.localStorage.setItem(MODE_KEY, m);
  }, []);

  const toggleFavorite = useCallback((symbol: string) => {
    setFavorites((prev) => {
      const next = prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol];
      window.localStorage.setItem(FAV_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isFavorite = useCallback((symbol: string) => favorites.includes(symbol), [favorites]);

  const value = useMemo(
    () => ({ mode, setMode, favorites, toggleFavorite, isFavorite }),
    [mode, setMode, favorites, toggleFavorite, isFavorite]
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
