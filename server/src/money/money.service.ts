import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { MoneyAccount } from './money-account.entity';
import { MoneyCounterparty } from './money-counterparty.entity';
import { MoneyMovement } from './money-movement.entity';
import { ProviderEvent } from './provider-event.entity';
import { ReconciliationRun } from './reconciliation-run.entity';

@Injectable()
export class MoneyService {
  constructor(
    @InjectRepository(MoneyAccount)
    private moneyAccountsRepository: Repository<MoneyAccount>,
    @InjectRepository(MoneyCounterparty)
    private moneyCounterpartiesRepository: Repository<MoneyCounterparty>,
    @InjectRepository(MoneyMovement)
    private moneyMovementsRepository: Repository<MoneyMovement>,
    @InjectRepository(ProviderEvent)
    private providerEventsRepository: Repository<ProviderEvent>,
    @InjectRepository(ReconciliationRun)
    private reconciliationRunsRepository: Repository<ReconciliationRun>,
  ) {}

  async ensureEscrowBucket(transaction: Transaction) {
    const existing = await this.moneyAccountsRepository.findOne({
      where: {
        provider: 'internal',
        scope: 'TRANSACTION',
        kind: 'ESCROW_BUCKET',
        transactionId: transaction.id,
      } as any,
    });
    if (existing) return existing;

    const account = this.moneyAccountsRepository.create({
      provider: 'internal',
      scope: 'TRANSACTION',
      kind: 'ESCROW_BUCKET',
      status: 'ACTIVE',
      currency: String(transaction.currency || 'NGN'),
      transactionId: transaction.id,
      userId: transaction.buyerId,
      displayName: `Escrow ${transaction.id}`,
      metadata: {
        transactionId: transaction.id,
        buyerId: transaction.buyerId,
        sellerId: transaction.sellerId,
      },
    });
    return this.moneyAccountsRepository.save(account);
  }

  async recordProviderEvent(input: {
    provider: string;
    providerEventId: string;
    eventType: string;
    resourceType?: string | null;
    resourceId?: string | null;
    signature?: string | null;
    signatureVerified?: boolean;
    dedupeHash?: string | null;
    payload?: Record<string, unknown> | null;
    included?: Record<string, unknown>[] | null;
  }) {
    const event = this.providerEventsRepository.create({
      provider: input.provider,
      providerEventId: input.providerEventId,
      eventType: input.eventType,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
      signature: input.signature ?? null,
      signatureVerified: input.signatureVerified ?? false,
      dedupeHash: input.dedupeHash ?? null,
      receivedAt: new Date(),
      processedAt: null,
      processingError: null,
      payload: input.payload ?? null,
      included: input.included ?? null,
    });
    return this.providerEventsRepository.save(event);
  }

  buildAnchorFundingPlan(input: {
    transaction: Transaction;
    buyerAnchorCustomerId: string;
    buyerReservedAccountId?: string | null;
  }) {
    return {
      collectionStrategy: input.buyerReservedAccountId ? 'RESERVED_ACCOUNT' : 'PAY_WITH_TRANSFER',
      expectedMovement: {
        kind: 'PAYIN',
        amountMinor: Math.round(Number(input.transaction.amount) * 100),
        currency: String(input.transaction.currency || 'NGN'),
        reference: `tt_payin_${input.transaction.id.replace(/-/g, '')}`,
        provider: 'anchor',
      },
      anchorRelationships: {
        customerId: input.buyerAnchorCustomerId,
        reservedAccountId: input.buyerReservedAccountId ?? null,
      },
    };
  }

  buildAnchorReleasePlan(input: {
    transaction: Transaction;
    escrowAccountId: string;
    sellerSettlementAccountId?: string | null;
    sellerCounterpartyId?: string | null;
    revenueAccountId?: string | null;
    feeAmountMinor?: number | null;
  }) {
    const grossAmountMinor = Math.round(Number(input.transaction.amount) * 100);
    const feeAmountMinor = Math.max(0, Number(input.feeAmountMinor ?? 0));
    const sellerAmountMinor = Math.max(0, grossAmountMinor - feeAmountMinor);

    return {
      escrowRelease: {
        kind: 'BOOK_TRANSFER',
        provider: 'anchor',
        amountMinor: sellerAmountMinor,
        currency: String(input.transaction.currency || 'NGN'),
        sourceAccountId: input.escrowAccountId,
        destinationAccountId: input.sellerSettlementAccountId ?? null,
        counterpartyId: input.sellerCounterpartyId ?? null,
        reference: `tt_release_${input.transaction.id.replace(/-/g, '')}`,
      },
      feeSweep: feeAmountMinor > 0 && input.revenueAccountId
        ? {
            kind: 'BOOK_TRANSFER',
            provider: 'anchor',
            amountMinor: feeAmountMinor,
            currency: String(input.transaction.currency || 'NGN'),
            sourceAccountId: input.escrowAccountId,
            destinationAccountId: input.revenueAccountId,
            reference: `tt_fee_${input.transaction.id.replace(/-/g, '')}`,
          }
        : null,
    };
  }

  buildAnchorRefundPlan(input: {
    transaction: Transaction;
    escrowAccountId: string;
    buyerSettlementAccountId?: string | null;
    buyerCounterpartyId?: string | null;
    refundAmountMinor?: number | null;
  }) {
    const amountMinor = Math.max(0, Number(input.refundAmountMinor ?? Math.round(Number(input.transaction.amount) * 100)));
    return {
      refund: {
        kind: input.buyerSettlementAccountId ? 'BOOK_TRANSFER' : 'NIP_TRANSFER',
        provider: 'anchor',
        amountMinor,
        currency: String(input.transaction.currency || 'NGN'),
        sourceAccountId: input.escrowAccountId,
        destinationAccountId: input.buyerSettlementAccountId ?? null,
        counterpartyId: input.buyerCounterpartyId ?? null,
        reference: `tt_refund_${input.transaction.id.replace(/-/g, '')}`,
      },
    };
  }

  async startReconciliationRun(input: { provider: string; runType: ReconciliationRun['runType']; summary?: Record<string, unknown> | null }) {
    const run = this.reconciliationRunsRepository.create({
      provider: input.provider,
      runType: input.runType,
      status: 'STARTED',
      startedAt: new Date(),
      completedAt: null,
      findingsCount: 0,
      mismatchAmountMinor: 0,
      cursor: null,
      error: null,
      summary: input.summary ?? null,
    });
    return this.reconciliationRunsRepository.save(run);
  }

  async completeReconciliationRun(
    id: string,
    input: {
      status: ReconciliationRun['status'];
      findingsCount?: number;
      mismatchAmountMinor?: number;
      cursor?: string | null;
      error?: string | null;
      summary?: Record<string, unknown> | null;
    },
  ) {
    await this.reconciliationRunsRepository.update(id, {
      status: input.status,
      completedAt: new Date(),
      findingsCount: Number(input.findingsCount ?? 0),
      mismatchAmountMinor: Number(input.mismatchAmountMinor ?? 0),
      cursor: input.cursor ?? null,
      error: input.error ?? null,
      summary: input.summary ?? null,
    } as any);
    return this.reconciliationRunsRepository.findOne({ where: { id } as any });
  }

  async listMoneyMovements(input?: {
    provider?: string | null;
    status?: string | null;
    transactionId?: string | null;
    take?: number;
  }) {
    const qb = this.moneyMovementsRepository.createQueryBuilder('movement')
      .orderBy('movement.createdAt', 'DESC')
      .take(Math.min(200, Math.max(1, Number(input?.take ?? 100))));

    if (input?.provider) qb.andWhere('movement.provider = :provider', { provider: input.provider });
    if (input?.status) qb.andWhere('movement.status = :status', { status: input.status });
    if (input?.transactionId) qb.andWhere('movement.transactionId = :transactionId', { transactionId: input.transactionId });

    return qb.getMany();
  }

  async listProviderEvents(input?: {
    provider?: string | null;
    eventType?: string | null;
    take?: number;
  }) {
    const qb = this.providerEventsRepository.createQueryBuilder('event')
      .orderBy('event.createdAt', 'DESC')
      .take(Math.min(200, Math.max(1, Number(input?.take ?? 100))));

    if (input?.provider) qb.andWhere('event.provider = :provider', { provider: input.provider });
    if (input?.eventType) qb.andWhere('event.eventType = :eventType', { eventType: input.eventType });

    return qb.getMany();
  }

  async listReconciliationRuns(input?: {
    provider?: string | null;
    runType?: ReconciliationRun['runType'] | null;
    take?: number;
  }) {
    const qb = this.reconciliationRunsRepository.createQueryBuilder('run')
      .orderBy('run.createdAt', 'DESC')
      .take(Math.min(100, Math.max(1, Number(input?.take ?? 50))));

    if (input?.provider) qb.andWhere('run.provider = :provider', { provider: input.provider });
    if (input?.runType) qb.andWhere('run.runType = :runType', { runType: input.runType });

    return qb.getMany();
  }

  async getReconciliationOverview(provider?: string | null) {
    const movementQb = this.moneyMovementsRepository.createQueryBuilder('movement');
    const eventQb = this.providerEventsRepository.createQueryBuilder('event');
    const runQb = this.reconciliationRunsRepository.createQueryBuilder('run');

    if (provider) {
      movementQb.where('movement.provider = :provider', { provider });
      eventQb.where('event.provider = :provider', { provider });
      runQb.where('run.provider = :provider', { provider });
    }

    const [pendingMovements, failedMovements, latestRun, unprocessedEvents] = await Promise.all([
      movementQb.clone().andWhere('movement.status IN (:...statuses)', { statuses: ['INITIATED', 'PENDING', 'NEEDS_REQUERY'] }).getCount(),
      movementQb.clone().andWhere('movement.status IN (:...statuses)', { statuses: ['FAILED', 'REVERSED'] }).getCount(),
      runQb.clone().orderBy('run.createdAt', 'DESC').getOne(),
      eventQb.clone().andWhere('event.processedAt IS NULL').getCount(),
    ]);

    return {
      provider: provider || 'all',
      pendingMovements,
      failedMovements,
      unprocessedEvents,
      latestRun: latestRun || null,
    };
  }

  async runOperationalReconciliation(input?: { provider?: string | null }) {
    const provider = input?.provider || 'anchor';
    const run = await this.startReconciliationRun({
      provider,
      runType: 'PENDING_TRANSFER_REQUERY',
      summary: { mode: 'manual' },
    });

    try {
      const pendingMovements = await this.listMoneyMovements({
        provider,
        take: 200,
      });
      const candidates = pendingMovements.filter((row) =>
        ['INITIATED', 'PENDING', 'NEEDS_REQUERY'].includes(String(row.status || '').toUpperCase()),
      );
      const result = await this.completeReconciliationRun(run.id, {
        status: 'COMPLETED',
        findingsCount: candidates.length,
        mismatchAmountMinor: 0,
        summary: {
          candidateMovementIds: candidates.slice(0, 50).map((row) => row.id),
          totalCandidates: candidates.length,
        },
      });
      return result;
    } catch (error: any) {
      const result = await this.completeReconciliationRun(run.id, {
        status: 'FAILED',
        error: String(error?.message || 'reconciliation failed'),
      });
      return result;
    }
  }
}
