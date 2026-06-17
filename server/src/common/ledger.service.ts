import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { LedgerEntry, type LedgerEventType } from './ledger-entry.entity';

@Injectable()
export class LedgerService {
  constructor(
    @InjectRepository(LedgerEntry)
    private ledgerRepository: Repository<LedgerEntry>,
  ) {}

  async record(input: {
    transactionId: string;
    eventType: LedgerEventType;
    amountMinor: number;
    currency: string;
    provider?: string | null;
    providerRef?: string | null;
    metadata?: Record<string, unknown> | null;
  }) {
    return this.recordInManager(null, input);
  }

  async listByTransaction(transactionId: string, take = 200) {
    const safeTake = Math.max(1, Math.min(500, Math.floor(take || 200)));
    return this.ledgerRepository.find({
      where: { transactionId } as any,
      order: { createdAt: 'ASC' } as any,
      take: safeTake,
    });
  }

  async recordInManager(
    manager: EntityManager | null,
    input: {
      transactionId: string;
      eventType: LedgerEventType;
      amountMinor: number;
      currency: string;
      provider?: string | null;
      providerRef?: string | null;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    const repo = manager ? manager.getRepository(LedgerEntry) : this.ledgerRepository;
    const entry = repo.create({
      transactionId: input.transactionId,
      eventType: input.eventType,
      amountMinor: input.amountMinor,
      currency: input.currency,
      provider: input.provider ?? null,
      providerRef: input.providerRef ?? null,
      metadata: input.metadata ?? null,
    });
    await repo.save(entry);
    return entry;
  }
}
