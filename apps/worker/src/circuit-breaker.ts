/**
 * Per-provider circuit breaker (in-memory). After N consecutive failures the
 * circuit opens for a cooldown window; while open, requests are rejected
 * fast instead of hammering a down provider.
 */
export interface CircuitState {
  failures: number;
  openUntil: number | null;
  lastError: string | null;
  lastFailureAt: number | null;
}

export class CircuitBreaker {
  private states = new Map<string, CircuitState>();

  constructor(
    private failureThreshold: number,
    private cooldownMs: number
  ) {}

  private state(providerId: string): CircuitState {
    let s = this.states.get(providerId);
    if (!s) {
      s = { failures: 0, openUntil: null, lastError: null, lastFailureAt: null };
      this.states.set(providerId, s);
    }
    return s;
  }

  /** Is the circuit open (requests should be skipped)? */
  isOpen(providerId: string, now = Date.now()): boolean {
    const s = this.state(providerId);
    if (s.openUntil === null) return false;
    if (now >= s.openUntil) {
      // Half-open: allow a probe.
      s.openUntil = null;
      return false;
    }
    return true;
  }

  recordSuccess(providerId: string): void {
    const s = this.state(providerId);
    s.failures = 0;
    s.openUntil = null;
    s.lastError = null;
  }

  recordFailure(providerId: string, error: string, now = Date.now()): void {
    const s = this.state(providerId);
    s.failures += 1;
    s.lastError = error;
    s.lastFailureAt = now;
    if (s.failures >= this.failureThreshold && s.openUntil === null) {
      s.openUntil = now + this.cooldownMs;
    }
  }

  getState(providerId: string): CircuitState {
    return this.state(providerId);
  }

  status(providerId: string): 'ok' | 'circuit_open' | 'degraded' {
    const s = this.state(providerId);
    if (this.isOpen(providerId)) return 'circuit_open';
    if (s.failures > 0) return 'degraded';
    return 'ok';
  }
}
