import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { RequestContextMiddleware } from './observability/request-context.middleware';
import { HttpLoggingInterceptor } from './observability/http-logging.interceptor';
import { ExceptionLoggingFilter } from './observability/exception-logging.filter';
import { baseLogger } from './observability/logger';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

async function bootstrap() {
  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
    app.enableShutdownHooks();
    const trustProxy = String(process.env.TRUST_PROXY || '').toLowerCase() === 'true';
    (app as any).set('trust proxy', trustProxy ? 1 : false);
    
    app.setGlobalPrefix('api');

    app.use(cookieParser());

    const requestContext = new RequestContextMiddleware();
    app.use(requestContext.use.bind(requestContext) as any);
    app.useGlobalInterceptors(new HttpLoggingInterceptor());
    app.useGlobalFilters(new ExceptionLoggingFilter());
    
    const isProd = process.env.NODE_ENV === 'production';
    const corsOriginsEnv = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const allowedOrigins = new Set<string>(
      corsOriginsEnv.length > 0
        ? corsOriginsEnv
        : [
            'http://localhost:8080',
            'http://127.0.0.1:8080',
            'http://localhost:5173',
            'http://127.0.0.1:5173',
          ],
    );
    const allowPrivateLanOrigin = (origin: string) => {
      if (isProd) return false;
      try {
        const url = new URL(origin);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
        const portNum = Number(url.port || (url.protocol === 'https:' ? 443 : 80));
        if (!Number.isFinite(portNum)) return false;
        const okPort = portNum === 8080 || (portNum >= 5173 && portNum <= 5199);
        if (!okPort) return false;
        const host = url.hostname;
        if (host === 'localhost' || host === '127.0.0.1') return true;
        if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
        if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
        if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
        return false;
      } catch {
        return false;
      }
    };

    app.enableCors({
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.has(origin) || allowPrivateLanOrigin(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });

    app.use((req: any, res: any, next: any) => {
      const method = (req.method || 'GET').toUpperCase();
      if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return next();

      const path = req.originalUrl || req.url || '';
      if (path.startsWith('/api/auth/login') || path.startsWith('/api/auth/register')) return next();
      if (path.startsWith('/api/auth/logout')) return next();
      if (path.startsWith('/api/paystack/webhook')) return next();

      const cookieToken = req.cookies?.csrf_token;
      const headerToken = req.headers['x-csrf-token'];
      if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        res.status(403).json({ message: 'CSRF validation failed' });
        return;
      }
      next();
    });

    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }));

    if (isProd || process.env.SERVE_FRONTEND === 'true') {
      const frontendDistPath = join(__dirname, '..', '..', '..', 'dist');
      if (existsSync(frontendDistPath)) {
        app.useStaticAssets(frontendDistPath, { index: false });

        const expressApp = app.getHttpAdapter().getInstance();
        expressApp.get('*', (req: any, res: any, next: any) => {
          const path = String(req.path || '');
          if (path.startsWith('/api')) return next();
          return res.sendFile(join(frontendDistPath, 'index.html'));
        });
      }
    }

    const port = Number(process.env.PORT || 3001);
    const host = process.env.HOST || (isProd ? '127.0.0.1' : '0.0.0.0');
    await app.listen(port, host);
    baseLogger.info({ event: 'app.start', url: await app.getUrl() }, 'app.start');
  } catch (error) {
    baseLogger.error({ event: 'app.start.error', err: error }, 'app.start.error');
  }
}
bootstrap();
