import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { getRequestContext } from './request-context';
import { logError, logInfo } from './logger';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest<any>();
    const res = http.getResponse<any>();
    const startedAtMs = Date.now();
    return next.handle().pipe(
      tap({
        next: () => {
          const ctx = getRequestContext();
          const latencyMs = Date.now() - startedAtMs;
          logInfo('http.request', {
            statusCode: res?.statusCode,
            latencyMs,
            userId: ctx?.userId ?? req?.user?.userId ?? null,
          });
        },
        error: (err) => {
          const ctx = getRequestContext();
          const latencyMs = Date.now() - startedAtMs;
          logError('http.error', err, {
            statusCode: res?.statusCode,
            latencyMs,
            userId: ctx?.userId ?? req?.user?.userId ?? null,
          });
        },
      }),
    );
  }
}

