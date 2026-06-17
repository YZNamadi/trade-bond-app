import type { Request, Response, NextFunction } from 'express';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function now() {
  return Date.now();
}

export function authRateLimit(options: { windowMs: number; max: number }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = ((req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() || (req.socket as any)?.remoteAddress || 'unknown').toString();
    const email = typeof (req.body as any)?.email === 'string' ? (req.body as any).email.toLowerCase() : '';
    const key = `${ip}:${email}:${req.path}`;
    const t = now();
    const b = buckets.get(key);
    if (!b || b.resetAt <= t) {
      buckets.set(key, { count: 1, resetAt: t + options.windowMs });
      return next();
    }
    b.count += 1;
    if (b.count > options.max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((b.resetAt - t) / 1000));
      res.setHeader('retry-after', String(retryAfterSeconds));
      res.status(429).json({ message: 'Too many attempts. Please try again later.' });
      return;
    }
    next();
  };
}

