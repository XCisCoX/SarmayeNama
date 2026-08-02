'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { Icon } from './Icon';
import { cn } from '@/lib/utils';

/** Copy-price button with inline feedback. */
export function CopyButton({ value, className }: { value: string | null | undefined; className?: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  if (value == null) return null;
  return (
    <button
      type="button"
      className={cn('btn btn-ghost px-2 py-1 text-xs', className)}
      aria-label={t('copy')}
      title={t('copy')}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(String(value));
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // clipboard unavailable
        }
      }}
    >
      <Icon name={copied ? 'check' : 'copy'} size={14} />
      <span>{copied ? t('copied') : ''}</span>
    </button>
  );
}

/** Share button (native share API with fallback to copying the URL). */
export function ShareButton({ url, title, className }: { url: string; title: string; className?: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={cn('btn btn-secondary px-2.5 py-1.5 text-xs', className)}
      aria-label={t('share')}
      title={t('share')}
      onClick={async () => {
        const full = typeof window !== 'undefined' ? `${window.location.origin}${url}` : url;
        if (typeof navigator !== 'undefined' && navigator.share) {
          try {
            await navigator.share({ title, url: full });
            return;
          } catch {
            // user cancelled or unsupported — fall through to copy
          }
        }
        try {
          await navigator.clipboard.writeText(full);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // ignore
        }
      }}
    >
      <Icon name={copied ? 'check' : 'share'} size={14} />
      <span>{copied ? t('copied') : t('share')}</span>
    </button>
  );
}
