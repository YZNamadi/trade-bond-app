import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { baseLogger } from './observability/logger';
import { configureApp } from './app.setup';

async function bootstrap() {
  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
    const isProd = process.env.NODE_ENV === 'production';
    configureApp(app);

    const port = Number(process.env.PORT || 3001);
    const host = process.env.HOST || (isProd ? '127.0.0.1' : '0.0.0.0');
    await app.listen(port, host);
    baseLogger.info({ event: 'app.start', url: await app.getUrl() }, 'app.start');
  } catch (error) {
    baseLogger.error({ event: 'app.start.error', err: error }, 'app.start.error');
  }
}
bootstrap();
