import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PaystackModule } from '../paystack/paystack.module';
import { createRedisClient } from './redis.client';
import { RateLimitService } from './rate-limit.service';
import { RateLimitGuard } from './rate-limit.guard';

@Global()
@Module({
  imports: [PaystackModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async () => {
        const client = createRedisClient();
        return client;
      },
    },
    {
      provide: RateLimitService,
      useFactory: (redis: any) => new RateLimitService(redis),
      inject: ['REDIS_CLIENT'],
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
  exports: ['REDIS_CLIENT', RateLimitService],
})
export class RateLimitModule {}
