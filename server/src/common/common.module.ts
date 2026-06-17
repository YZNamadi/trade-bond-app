import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdempotencyRecord } from './idempotency.entity';
import { IdempotencyService } from './idempotency.service';
import { AuditLog } from './audit-log.entity';
import { AuditService } from './audit.service';
import { OutboxJob } from './outbox-job.entity';
import { OutboxService } from './outbox.service';
import { LedgerEntry } from './ledger-entry.entity';
import { LedgerService } from './ledger.service';

@Module({
  imports: [TypeOrmModule.forFeature([IdempotencyRecord, AuditLog, OutboxJob, LedgerEntry])],
  providers: [IdempotencyService, AuditService, OutboxService, LedgerService],
  exports: [IdempotencyService, AuditService, OutboxService, LedgerService],
})
export class CommonModule {}
