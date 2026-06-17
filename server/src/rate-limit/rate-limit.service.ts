import { Injectable } from '@nestjs/common';
type RedisLike = { eval: (...args: any[]) => Promise<any> };

type Decision = { allowed: boolean; totalHits: number; resetMs: number };

type Bucket = { hits: number; resetAtMs: number };

@Injectable()
export class RateLimitService {
  private fallback = new Map<string, Bucket>();
  private lastSweepAtMs = 0;

  constructor(private redis: RedisLike | null) {}

  private sweepFallback(now: number) {
    const sweepEveryMs = Number(process.env.RL_FALLBACK_SWEEP_MS || 10_000);
    if (now - this.lastSweepAtMs < sweepEveryMs) return;
    this.lastSweepAtMs = now;

    const maxEntries = Number(process.env.RL_FALLBACK_MAX_KEYS || 20_000);
    for (const [k, v] of this.fallback.entries()) {
      if (v.resetAtMs <= now) {
        this.fallback.delete(k);
      }
    }
    if (this.fallback.size <= maxEntries) return;
    const toDrop = this.fallback.size - maxEntries;
    let dropped = 0;
    for (const k of this.fallback.keys()) {
      this.fallback.delete(k);
      dropped += 1;
      if (dropped >= toDrop) break;
    }
  }

  private fallbackCheck(key: string, windowMs: number, limit: number): Decision {
    const now = Date.now();
    this.sweepFallback(now);
    const b = this.fallback.get(key);
    if (!b || b.resetAtMs <= now) {
      const resetAtMs = now + windowMs;
      this.fallback.set(key, { hits: 1, resetAtMs });
      return { allowed: true, totalHits: 1, resetMs: resetAtMs };
    }
    b.hits += 1;
    return { allowed: b.hits <= limit, totalHits: b.hits, resetMs: b.resetAtMs };
  }

  async slidingWindow(key: string, windowMs: number, limit: number): Promise<Decision> {
    const isProd = process.env.NODE_ENV === 'production';
    const strictLimit = isProd ? Math.max(1, Math.floor(limit / 5)) : limit;
    if (!this.redis) {
      return this.fallbackCheck(key, windowMs, strictLimit);
    }
    const now = Date.now();
    const min = now - windowMs;
    const redisKey = `rl:${key}`;
    try {
      const script = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local min = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local windowSeconds = tonumber(ARGV[4])
redis.call('ZREMRANGEBYSCORE', key, 0, min)
redis.call('ZADD', key, now, tostring(now))
local count = redis.call('ZCARD', key)
redis.call('EXPIRE', key, windowSeconds)
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
local resetAt = now
if oldest and oldest[2] then
  resetAt = tonumber(oldest[2]) + (windowSeconds * 1000)
end
return { count, resetAt }
`;
      const windowSeconds = Math.ceil(windowMs / 1000);
      const result = (await (this.redis as any).eval(script, 1, redisKey, now, min, limit, windowSeconds)) as [number, number];
      const totalHits = Number(result?.[0] ?? 0);
      const resetMs = Number(result?.[1] ?? now + windowMs);
      return { allowed: totalHits <= limit, totalHits, resetMs };
    } catch {
      return this.fallbackCheck(key, windowMs, strictLimit);
    }
  }
}
