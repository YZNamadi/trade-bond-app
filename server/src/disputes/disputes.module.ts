import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dispute } from './dispute.entity';
import { DisputeEvidence } from './dispute-evidence.entity';
import { DisputeEvent } from './dispute-event.entity';
import { DisputesService } from './disputes.service';
import { DisputesController } from './disputes.controller';
import { Transaction } from '../transactions/transaction.entity';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [TypeOrmModule.forFeature([Dispute, DisputeEvidence, DisputeEvent, Transaction]), CommonModule],
  providers: [DisputesService],
  controllers: [DisputesController],
  exports: [DisputesService],
})
export class DisputesModule {}
