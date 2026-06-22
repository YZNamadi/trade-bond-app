import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoneyAccount } from './money-account.entity';
import { MoneyCounterparty } from './money-counterparty.entity';
import { MoneyMovement } from './money-movement.entity';
import { ProviderEvent } from './provider-event.entity';
import { ReconciliationRun } from './reconciliation-run.entity';
import { MoneyService } from './money.service';
import { MoneyAdminController } from './money-admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MoneyAccount,
      MoneyCounterparty,
      MoneyMovement,
      ProviderEvent,
      ReconciliationRun,
    ]),
  ],
  providers: [MoneyService],
  controllers: [MoneyAdminController],
  exports: [MoneyService],
})
export class MoneyModule {}
