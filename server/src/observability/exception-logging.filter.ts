import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Response } from 'express';
import { logError } from './logger';

@Catch()
export class ExceptionLoggingFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    logError('exception', exception, { statusCode: status });
    if (!res.headersSent) {
      if (exception instanceof HttpException) {
        const response = exception.getResponse() as any;
        res.status(status).json(typeof response === 'object' ? response : { message: String(response) });
        return;
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}

