import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionStatus } from './transaction.entity';
import { TransactionsService } from './transactions.service';

@Injectable()
export class ReconciliationService implements OnApplicationBootstrap {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(Transaction)
    private transactionsRepository: Repository<Transaction>,
    private transactionsService: TransactionsService,
  ) {}

  async onApplicationBootstrap() {
    const enabled = process.env.ENABLE_RECONCILIATION === 'true';
    if (!enabled) return;
    const intervalMs = Number(process.env.RECONCILIATION_INTERVAL_MS || 300000);
    this.timer = setInterval(() => {
      this.runOnce().catch(() => null);
    }, intervalMs);
    await this.runOnce().catch(() => null);
  }

  async runOnce() {
    const limit = Number(process.env.RECONCILIATION_BATCH_SIZE || 25);
    const cutoffMs = Number(process.env.RECONCILIATION_MIN_AGE_MS || 120000);
    const cutoff = new Date(Date.now() - cutoffMs);
    const candidates = await this.transactionsRepository.find({
      where: {
        status: TransactionStatus.CREATED as any,
      } as any,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    for (const tx of candidates) {
      if (!tx.paymentReference) continue;
      if (tx.paystackVerifiedAt) continue;
      if (tx.paystackInitializedAt && new Date(tx.paystackInitializedAt).getTime() > cutoff.getTime()) continue;
      await this.transactionsService.markFundedByReference(tx.paymentReference).catch(() => null);
    }
  }
}

