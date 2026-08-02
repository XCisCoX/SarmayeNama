import { describe, expect, it, vi } from 'vitest';
import { CircuitBreaker } from '../src/circuit-breaker.js';
import { providerDailyQuota, staleAfterMs, withJitter } from '../src/config.js';
import { parseEnv } from '@sarmaye/shared';

function testEnv() {
  return parseEnv({ ...process.env, DATABASE_URL: 'postgresql://x:x@localhost/x' });
}

describe('CircuitBreaker', () => {
  it('opens after threshold failures and rejects fast', () => {
    const cb = new CircuitBreaker(3, 60_000);
    const now = Date.now();
    expect(cb.isOpen('p', now)).toBe(false);
    cb.recordFailure('p', 'err1', now);
    cb.recordFailure('p', 'err2', now);
    cb.recordFailure('p', 'err3', now);
    expect(cb.status('p')).toBe('circuit_open');
    expect(cb.isOpen('p', now + 10_000)).toBe(true);
  });
  it('half-opens after cooldown', () => {
    const cb = new CircuitBreaker(2, 1000);
    cb.recordFailure('p', 'e', 0);
    cb.recordFailure('p', 'e', 0);
    expect(cb.isOpen('p', 500)).toBe(true);
    expect(cb.isOpen('p', 1500)).toBe(false); // cooldown passed -> probe allowed
  });
  it('resets on success', () => {
    const cb = new CircuitBreaker(2, 60_000);
    cb.recordFailure('p', 'e', 0);
    cb.recordSuccess('p');
    cb.recordFailure('p', 'e', 0);
    expect(cb.status('p')).toBe('degraded');
    expect(cb.isOpen('p')).toBe(false);
  });
});

describe('Quota helpers', () => {
  it('maps provider ids to daily quotas', () => {
    const env = testEnv();
    expect(providerDailyQuota('brsapi', env)).toBe(1500);
    expect(providerDailyQuota('alphavantage', env)).toBe(25);
    expect(providerDailyQuota('frankfurter', env)).toBeNull();
  });
  it('staleness threshold is 3x the refresh interval with a 15-min floor', () => {
    const env = testEnv();
    // 3 × 90s = 270s but the 15-minute floor dominates.
    expect(staleAfterMs('brsapi', env)).toBe(900_000);
    expect(staleAfterMs('frankfurter', env)).toBe(36 * 3600_000);
  });
  it('jitter stays within ±10% and never below 30s', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(withJitter(90_000)).toBe(90_000);
    expect(withJitter(10_000)).toBeGreaterThanOrEqual(30_000);
    vi.restoreAllMocks();
  });
});

describe('Env validation', () => {
  it('fails fast on missing DATABASE_URL', () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });
  it('parses booleans from strings', () => {
    const env = parseEnv({
      DATABASE_URL: 'postgresql://x:x@localhost/x',
      IRANIAN_STOCKS_ENABLED: 'true',
      GLOBAL_MARKETS_ENABLED: 'false',
    });
    expect(env.IRANIAN_STOCKS_ENABLED).toBe(true);
    expect(env.GLOBAL_MARKETS_ENABLED).toBe(false);
  });
});
