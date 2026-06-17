import { Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { runWithRequestContext } from './request-context';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request & { requestId?: string }, res: Response, next: NextFunction) {
    const requestId = (req.headers['x-request-id'] as string | undefined) || randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('referrer-policy', 'no-referrer');
    res.setHeader('x-frame-options', 'DENY');
    res.setHeader('permissions-policy', 'geolocation=(), microphone=(), camera=()');
    const ip = (req.ip || (req.socket as any)?.remoteAddress || null)?.toString() ?? null;
    const userAgent = (req.headers['user-agent'] as string | undefined) || null;
    const path = req.originalUrl || req.url || null;
    const method = (req.method || 'GET').toUpperCase();
    const startedAtMs = Date.now();
    runWithRequestContext(
      {
        requestId,
        ip,
        userAgent,
        userId: null,
        userRole: null,
        path,
        method,
        startedAtMs,
      },
      () => next(),
    );
  }
}
