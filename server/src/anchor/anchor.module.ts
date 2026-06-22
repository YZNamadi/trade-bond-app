import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';
import { MoneyAccount } from '../money/money-account.entity';
import { MoneyCounterparty } from '../money/money-counterparty.entity';
import { MoneyMovement } from '../money/money-movement.entity';
import { ProviderEvent } from '../money/provider-event.entity';
import { MoneyModule } from '../money/money.module';
import { AnchorService } from './anchor.service';
import { AnchorController } from './anchor.controller';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Transaction,
      MoneyAccount,
      MoneyCounterparty,
      MoneyMovement,
      ProviderEvent,
    ]),
    MoneyModule,
    forwardRef(() => TransactionsModule),
  ],
  providers: [AnchorService],
  controllers: [AnchorController],
  exports: [AnchorService],
})
export class AnchorModule {}
