import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './transaction.entity';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { PaystackModule } from '../paystack/paystack.module';
import { PaystackController } from './paystack.controller';
import { User } from '../users/user.entity';
import { TransactionEvent } from './transaction-event.entity';
import { TransactionProof } from './transaction-proof.entity';
import { TransactionMessage } from './transaction-message.entity';
import { CommonModule } from '../common/common.module';
import { PaystackWebhookEvent } from '../paystack/paystack-webhook-event.entity';
import { ReconciliationService } from './reconciliation.service';
import { DisputesModule } from '../disputes/disputes.module';
import { SettlementWorkerService } from './settlement-worker.service';
import { AnchorModule } from '../anchor/anchor.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, TransactionEvent, TransactionProof, TransactionMessage, User, PaystackWebhookEvent]),
    PaystackModule,
    forwardRef(() => AnchorModule),
    CommonModule,
    DisputesModule,
  ],
  providers: [TransactionsService, ReconciliationService, SettlementWorkerService],
  controllers: [TransactionsController, PaystackController],
  exports: [TransactionsService]
})
export class TransactionsModule {}
