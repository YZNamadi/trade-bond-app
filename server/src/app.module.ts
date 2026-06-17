import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as path from 'path';
import { User } from './users/user.entity';
import { Transaction } from './transactions/transaction.entity';
import { TransactionEvent } from './transactions/transaction-event.entity';
import { TransactionProof } from './transactions/transaction-proof.entity';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TransactionsModule } from './transactions/transactions.module';
import { PaystackModule } from './paystack/paystack.module';
import { DatabaseModule } from './database/database.module';
import { AuthSession } from './auth/auth-session.entity';
import { IdempotencyRecord } from './common/idempotency.entity';
import { AuditLog } from './common/audit-log.entity';
import { PaystackWebhookEvent } from './paystack/paystack-webhook-event.entity';
import { HealthController } from './health.controller';
import { SellerOnboardingRequest } from './users/seller-onboarding.entity';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { TypeOrmLogger } from './observability/typeorm-logger';
import { Dispute } from './disputes/dispute.entity';
import { DisputeEvidence } from './disputes/dispute-evidence.entity';
import { DisputeEvent } from './disputes/dispute-event.entity';
import { DisputesModule } from './disputes/disputes.module';
import { OutboxJob } from './common/outbox-job.entity';
import { LedgerEntry } from './common/ledger-entry.entity';
import { TransactionMessage } from './transactions/transaction-message.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(process.cwd(), '.env'),
        path.resolve(process.cwd(), 'server', '.env'),
        path.resolve(process.cwd(), '..', '.env'),
      ],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const type = (config.get<string>('DB_TYPE') || 'sqlite').toLowerCase();
        const isProd = config.get<string>('NODE_ENV') === 'production';
        if (isProd && type !== 'postgres') {
          throw new Error('PostgreSQL is required in production');
        }
        const synchronize = config.get<string>('TYPEORM_SYNCHRONIZE') === 'true' && !isProd;
        const entities: TypeOrmModuleOptions['entities'] = [
          User,
          SellerOnboardingRequest,
          Transaction,
          TransactionEvent,
          TransactionProof,
          TransactionMessage,
          Dispute,
          DisputeEvidence,
          DisputeEvent,
          AuthSession,
          IdempotencyRecord,
          AuditLog,
          OutboxJob,
          LedgerEntry,
          PaystackWebhookEvent,
        ];
        const common: Omit<TypeOrmModuleOptions, 'type'> = {
          entities,
          synchronize,
          logger: new TypeOrmLogger(),
        };
        if (type === 'postgres') {
          return {
            type: 'postgres',
            host: String(config.get('DB_HOST') ?? '127.0.0.1'),
            port: Number(config.get('DB_PORT') ?? 5432),
            username: String(config.get('DB_USER') ?? 'postgres'),
            password: String(config.get('DB_PASSWORD') ?? ''),
            database: String(config.get('DB_NAME') ?? 'trustytrade'),
            ssl: config.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
            ...common,
          } as unknown as TypeOrmModuleOptions;
        }
        return {
          type: 'sqlite',
          database: String(config.get('SQLITE_PATH') ?? 'db.sqlite'),
          ...common,
        } as unknown as TypeOrmModuleOptions;
      },
    }),
    RateLimitModule,
    UsersModule,
    AuthModule,
    TransactionsModule,
    DisputesModule,
    PaystackModule,
    DatabaseModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
