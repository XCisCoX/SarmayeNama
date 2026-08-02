/**
 * Shared HTTP helpers: fetch with timeout, typed errors, and retry with
 * exponential backoff + jitter. Rate-limit (429) responses are never retried
 * in a tight loop — they are surfaced as ProviderRateLimitedError.
 */

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly providerId: string,
    public readonly retryable: boolean,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class ProviderRateLimitedError extends ProviderError {
  constructor(providerId: string, message = 'Rate limited by provider', status = 429) {
    super(message, providerId, false, status);
    this.name = 'ProviderRateLimitedError';
  }
}

export class ProviderTimeoutError extends ProviderError {
  constructor(providerId: string, message = 'Provider request timed out') {
    super(message, providerId, true);
    this.name = 'ProviderTimeoutError';
  }
}

export interface FetchJsonOptions {
  timeoutMs?: number;
  headers?: Record<string, string>;
  method?: string;
  body?: string;
  retries?: number;
  /** Base delay for exponential backoff (ms). */
  backoffBaseMs?: number;
  /** Max jitter added to backoff (ms). */
  jitterMs?: number;
  /** Signal to abort (graceful shutdown). */
  signal?: AbortSignal;
  /** Log retry attempts (e.g. pino). */
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

export async function fetchJson<T>(
  url: string,
  providerId: string,
  opts: FetchJsonOptions = {}
): Promise<T> {
  const {
    timeoutMs = 20_000,
    headers = {},
    method = 'GET',
    body,
    retries = 2,
    backoffBaseMs = 1500,
    jitterMs = 500,
    signal,
    onRetry,
  } = opts;

  let attempt = 0;
  for (;;) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);
    const onOuterAbort = () => controller.abort();
    signal?.addEventListener('abort', onOuterAbort, { once: true });

    try {
      const res = await fetch(url, {
        method,
        body,
        headers: { Accept: 'application/json', ...headers },
        signal: controller.signal,
      });
      if (res.status === 429) {
        throw new ProviderRateLimitedError(providerId);
      }
      if (res.status === 401 || res.status === 403) {
        throw new ProviderError(`Provider authentication failed (${res.status})`, providerId, false, res.status);
      }
      if (res.status >= 500) {
        throw new ProviderError(`Provider server error (${res.status})`, providerId, true, res.status);
      }
      if (!res.ok) {
        throw new ProviderError(`Provider responded ${res.status}`, providerId, false, res.status);
      }
      const text = await res.text();
      return JSON.parse(text) as T;
    } catch (err) {
      const error =
        err instanceof ProviderError
          ? err
          : err instanceof Error && err.name === 'AbortError'
            ? new ProviderTimeoutError(providerId)
            : new ProviderError(err instanceof Error ? err.message : String(err), providerId, true);

      if (error instanceof ProviderRateLimitedError) throw error;
      if (!error.retryable) throw error;
      if (attempt >= retries) throw error;

      const delay = backoffBaseMs * 2 ** attempt + Math.floor(Math.random() * jitterMs);
      onRetry?.(attempt + 1, error, delay);
      await sleep(delay, signal);
      attempt += 1;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onOuterAbort);
    }
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new Error('aborted'));
    });
  });
}

/**
 * Retry policy used by the worker scheduler: how many attempts, base backoff,
 * and whether a given error is retryable. Exported for unit tests.
 */
export function isRetryableError(err: unknown): boolean {
  if (err instanceof ProviderError) return err.retryable;
  if (err instanceof Error && (err.name === 'TypeError' || err.name === 'AbortError')) return true;
  return false;
}
