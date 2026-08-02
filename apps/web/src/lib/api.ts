'use client';

import { useState } from 'react';
import { cn } from './utils';

/**
 * Minimal accessible client fetch wrapper with the shared error envelope.
 * Throws an Error with a Persian/English-safe message on non-OK responses.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: { message?: string; code?: string } };
      if (body.error?.message) message = body.error.message;
    } catch {
      // non-JSON error body
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

/** Connection status hook: navigator.onLine + periodic check. */
export function useConnectionStatus(): 'online' | 'offline' {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useState(() => {
    if (typeof window === 'undefined') return;
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  });
  return online ? 'online' : 'offline';
}

export { cn };
