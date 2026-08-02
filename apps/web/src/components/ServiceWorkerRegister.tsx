'use client';

import { useEffect } from 'react';

/** Registers the PWA service worker in production only. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // service worker registration is best-effort
    });
  }, []);
  return null;
}
