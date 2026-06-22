import { Injectable, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OutboxService } from '../common/outbox.service';
import { OutboxJob } from '../common/outbox-job.entity';
import { Transaction, TransactionStatus } from './transaction.entity';
import { PaystackService } from '../paystack/paystack.service';
import { LedgerService } from '../common/ledger.service';
import { AuditService } from '../common/audit.service';
import { TransactionsService } from './transactions.service';
import { AnchorService } from '../anchor/anchor.service';

function isTruthy(v: string | undefined) {
  return String(v || '').toLowerCase() === 'true';
}

function payoutReferenceFor(txId: string) {
  return `tt_payout_${txId.replace(/-/g, '')}`;
}

@Injectable()
export class SettlementWorkerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private timer: NodeJS.Timeout | null = null;
  private reconcileTimer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private outboxService: OutboxService,
    private paystackService: PaystackService,
    private ledgerService: LedgerService,
    private auditService: AuditService,
    private transactionsService: TransactionsService,
    private anchorService: AnchorService,
    @InjectRepository(Transaction)
    private txRepo: Repository<Transaction>,
  ) {}

  private activeSettlementProvider(tx?: Transaction | null) {
    const provider = String(tx?.payoutProvider || tx?.refundProvider || this.anchorService.activeSettlementProvider()).trim().toLowerCase();
    return provider === 'anchor' ? 'anchor' : 'paystack';
  }

  async onApplicationBootstrap() {
    const enabled = process.env.ENABLE_OUTBOX_WORKER ? isTruthy(process.env.ENABLE_OUTBOX_WORKER) : true;
    if (!enabled) return;

    const pollMs = Number(process.env.OUTBOX_POLL_MS || 1500);
    const batch = Number(process.env.OUTBOX_BATCH_SIZE || 10);

    this.timer = setInterval(() => {
      this.tick(batch).catch(() => null);
    }, pollMs);

    const reconcileMs = Number(process.env.SETTLEMENT_RECONCILIATION_MS || 15000);
    this.reconcileTimer = setInterval(() => {
      this.reconcile().catch(() => null);
    }, reconcileMs);

    await this.reconcile().catch(() => null);
    await this.tick(batch).catch(() => null);
  }

  async onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
    if (this.reconcileTimer) clearInterval(this.reconcileTimer);
    this.timer = null;
    this.reconcileTimer = null;
  }

  private async tick(batch: number) {
    if (this.running) return;
    this.running = true;
    try {
      const jobs = await this.outboxService.takeNext(batch);
      for (const job of jobs) {
        try {
          await this.handle(job);
          await this.outboxService.markDone(job.id);
        } catch (e: any) {
          await this.outboxService.markFailed(job.id, e, job.attempts, job.maxAttempts);
        }
      }
    } finally {
      this.running = false;
    }
  }

  private async reconcile() {
    const pendingPayout = await this.txRepo.find({
      where: [
        { status: TransactionStatus.RELEASE_PENDING as any, payoutStatus: null as any },
        { status: TransactionStatus.RELEASE_PENDING as any, payoutStatus: 'REQUESTED' as any },
        { status: TransactionStatus.RELEASE_PENDING as any, payoutStatus: 'INITIATED' as any },
      ] as any,
      take: 100,
      order: { updatedAt: 'DESC' } as any,
    });
    for (const tx of pendingPayout) {
      if (String(tx.payoutStatus || '').toUpperCase() === 'INITIATED') {
        await this.outboxService.enqueue({ type: 'payout.verify', dedupeKey: tx.id, payload: { transactionId: tx.id } }).catch(() => null);
      } else {
        await this.outboxService.enqueue({ type: 'payout.initiate', dedupeKey: tx.id, payload: { transactionId: tx.id } }).catch(() => null);
      }
    }

    const pendingRefund = await this.txRepo.find({
      where: [
        { status: TransactionStatus.REFUND_PENDING as any, refundStatus: 'INITIATED' as any },
        { status: TransactionStatus.REFUND_PENDING as any, refundStatus: 'PROCESSING' as any },
        { status: TransactionStatus.REFUND_PENDING as any, refundStatus: 'PENDING' as any },
      ] as any,
      take: 100,
      order: { updatedAt: 'DESC' } as any,
    });
    for (const tx of pendingRefund) {
      await this.outboxService.enqueue({ type: 'refund.verify', dedupeKey: tx.id, payload: { transactionId: tx.id } }).catch(() => null);
    }
  }

  private async handle(job: OutboxJob) {
    const type = String(job.type || '').toLowerCase();
    if (type === 'payment.verify') return this.handlePaymentVerify(job);
    if (type === 'payout.initiate') return this.handlePayoutInitiate(job);
    if (type === 'payout.verify') return this.handlePayoutVerify(job);
    if (type === 'refund.initiate') return this.handleRefundInitiate(job);
    if (type === 'refund.verify') return this.handleRefundVerify(job);
    throw new Error('Unknown outbox job type');
  }

  private async handlePaymentVerify(job: OutboxJob) {
    const reference = String(job.payload?.reference || '').trim();
    if (!reference) throw new Error('Missing reference');
    await this.transactionsService.markFundedByReference(reference);
  }

  private async handlePayoutInitiate(job: OutboxJob) {
    const txId = String(job.payload?.transactionId || '').trim();
    if (!txId) throw new Error('Missing transactionId');
    const tx = await this.txRepo.findOne({ where: { id: txId } as any, relations: { seller: true } as any });
    if (!tx) return;
    if (tx.status !== TransactionStatus.RELEASE_PENDING) return;

    const payoutStatus = String(tx.payoutStatus || '').toUpperCase();
    if (payoutStatus === 'INITIATED' || payoutStatus === 'SENT') return;
    if (tx.payoutProviderTransferCode) return;

    if (this.activeSettlementProvider(tx) === 'anchor') {
      const sellerCounterparty = await this.anchorService.ensureCounterpartyForUser(tx.sellerId);
      const reference = tx.payoutReference || payoutReferenceFor(tx.id);
      if (!tx.payoutReference) {
        await this.txRepo.update(tx.id, { payoutReference: reference } as any);
      }
      const amountMinor = Math.max(0, Math.round(Number(tx.amount) * 100));
      if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
        await this.txRepo.update(tx.id, { payoutStatus: 'BLOCKED', payoutFailureReason: 'invalid_amount' } as any);
        return;
      }
      const res = await this.anchorService.initiateNipTransfer({
        amountMinor,
        counterpartyId: String(sellerCounterparty.providerCounterpartyId || '').trim(),
        currency: String(tx.currency || 'NGN'),
        reason: `TrustyTrade payout for ${tx.id}`,
        reference,
      });
      const transfer = (res as any)?.data;
      const transferId = transfer?.id ? String(transfer.id) : null;
      await this.txRepo.update(tx.id, {
        payoutStatus: 'INITIATED',
        payoutProvider: 'anchor',
        payoutProviderTransferCode: transferId,
        payoutInitiatedAt: new Date(),
        payoutFailureReason: null,
      } as any);
      await this.ledgerService.record({
        transactionId: tx.id,
        eventType: 'PAYOUT_INITIATED',
        amountMinor,
        currency: String(tx.currency || 'NGN'),
        provider: 'anchor',
        providerRef: reference,
        metadata: { transferId, counterpartyId: sellerCounterparty.providerCounterpartyId },
      });
      await this.auditService.record({
        action: 'payout.initiated',
        actorUserId: job.payload?.actorUserId ?? null,
        actorRole: job.payload?.actorRole ?? null,
        targetType: 'transaction',
        targetId: tx.id,
        after: { provider: 'anchor', reference, amountMinor, transferId },
        outcome: 'ok',
      });
      await this.outboxService.enqueue({ type: 'payout.verify', dedupeKey: tx.id, payload: { transactionId: tx.id } }).catch(() => null);
      return;
    }

    const seller: any = (tx as any).seller;
    const recipient = String(seller?.paystackTransferRecipientCode || '').trim();
    if (!recipient || !seller?.bankVerifiedAt) {
      await this.txRepo.update(tx.id, { payoutStatus: 'BLOCKED', payoutFailureReason: 'missing_bank_account' } as any);
      return;
    }

    const reference = tx.payoutReference || payoutReferenceFor(tx.id);
    if (!tx.payoutReference) {
      await this.txRepo.update(tx.id, { payoutReference: reference } as any);
    }

    const amountInKobo = Math.max(0, Math.round(Number(tx.amount) * 100));
    if (!Number.isFinite(amountInKobo) || amountInKobo <= 0) {
      await this.txRepo.update(tx.id, { payoutStatus: 'BLOCKED', payoutFailureReason: 'invalid_amount' } as any);
      return;
    }

    const res = await this.paystackService.initiateTransfer({
      amountInKobo,
      recipientCode: recipient,
      reason: `TrustyTrade payout for ${tx.id}`,
      reference,
      currency: String(tx.currency || 'NGN'),
      idempotencyKey: reference,
    });
    const transferCode = res?.transfer_code ? String(res.transfer_code) : res?.id ? String(res.id) : null;
    await this.txRepo.update(tx.id, {
      payoutStatus: 'INITIATED',
      payoutProvider: 'paystack',
      payoutProviderTransferCode: transferCode,
      payoutInitiatedAt: new Date(),
      payoutFailureReason: null,
    } as any);
    await this.ledgerService.record({
      transactionId: tx.id,
      eventType: 'PAYOUT_INITIATED',
      amountMinor: amountInKobo,
      currency: String(tx.currency || 'NGN'),
      provider: 'paystack',
      providerRef: reference,
      metadata: { transferCode },
    });
    await this.auditService.record({
      action: 'payout.initiated',
      actorUserId: job.payload?.actorUserId ?? null,
      actorRole: job.payload?.actorRole ?? null,
      targetType: 'transaction',
      targetId: tx.id,
      after: { provider: 'paystack', reference, amountInKobo, transferCode },
      outcome: 'ok',
    });
    await this.outboxService.enqueue({ type: 'payout.verify', dedupeKey: tx.id, payload: { transactionId: tx.id } }).catch(() => null);
  }

  private async handlePayoutVerify(job: OutboxJob) {
    const txId = String(job.payload?.transactionId || '').trim();
    if (!txId) throw new Error('Missing transactionId');
    const tx = await this.txRepo.findOne({ where: { id: txId } as any });
    if (!tx) return;
    if (tx.status !== TransactionStatus.RELEASE_PENDING) return;
    if (this.activeSettlementProvider(tx) === 'anchor') {
      const transferId = String(tx.payoutProviderTransferCode || '').trim();
      if (!transferId) throw new Error('Missing payout transfer id');
      const r = await this.anchorService.verifyTransfer(transferId);
      const data = (r as any)?.data;
      const providerStatus = String(data?.attributes?.status || '').toLowerCase();
      if (providerStatus === 'completed') {
        await this.txRepo.update(tx.id, { payoutStatus: 'SENT', status: TransactionStatus.RELEASED } as any);
        const amountMinor = Number(data?.attributes?.amount) || Math.round(Number(tx.amount) * 100);
        await this.ledgerService.record({
          transactionId: tx.id,
          eventType: 'PAYOUT_CONFIRMED',
          amountMinor: Math.max(0, Math.floor(amountMinor)),
          currency: String(data?.attributes?.currency || tx.currency || 'NGN'),
          provider: 'anchor',
          providerRef: String(tx.payoutReference || transferId),
          metadata: { transferId },
        });
        return;
      }
      if (providerStatus === 'failed' || providerStatus === 'reversed') {
        await this.txRepo.update(tx.id, { payoutStatus: 'FAILED', payoutFailureReason: providerStatus } as any);
        await this.ledgerService.record({
          transactionId: tx.id,
          eventType: 'PAYOUT_FAILED',
          amountMinor: Math.max(0, Math.round(Number(tx.amount) * 100)),
          currency: String(tx.currency || 'NGN'),
          provider: 'anchor',
          providerRef: String(tx.payoutReference || transferId),
          metadata: { providerStatus, transferId },
        });
        return;
      }
      throw new Error('Payout pending');
    }
    const reference = String(tx.payoutReference || '').trim();
    if (!reference) throw new Error('Missing payout reference');

    const r = await this.paystackService.verifyTransfer(reference);
    const data = (r as any)?.data;
    const providerStatus = String(data?.status || '').toLowerCase();

    if (providerStatus === 'success') {
      await this.txRepo.update(tx.id, { payoutStatus: 'SENT', status: TransactionStatus.RELEASED } as any);
      const amountMinor = Number(data?.amount) || Math.round(Number(tx.amount) * 100);
      await this.ledgerService.record({
        transactionId: tx.id,
        eventType: 'PAYOUT_CONFIRMED',
        amountMinor: Math.max(0, Math.floor(amountMinor)),
        currency: String(data?.currency || tx.currency || 'NGN'),
        provider: 'paystack',
        providerRef: reference,
        metadata: { transferCode: data?.transfer_code ? String(data.transfer_code) : null },
      });
      return;
    }
    if (providerStatus === 'failed') {
      await this.txRepo.update(tx.id, { payoutStatus: 'FAILED', payoutFailureReason: 'provider_failed' } as any);
      await this.ledgerService.record({
        transactionId: tx.id,
        eventType: 'PAYOUT_FAILED',
        amountMinor: Math.max(0, Math.round(Number(tx.amount) * 100)),
        currency: String(tx.currency || 'NGN'),
        provider: 'paystack',
        providerRef: reference,
        metadata: { providerStatus },
      });
      return;
    }
    if (providerStatus === 'otp') {
      await this.txRepo.update(tx.id, { payoutStatus: 'BLOCKED', payoutFailureReason: 'otp_required' } as any);
      return;
    }
    throw new Error('Payout pending');
  }

  private async handleRefundInitiate(job: OutboxJob) {
    const txId = String(job.payload?.transactionId || '').trim();
    if (!txId) throw new Error('Missing transactionId');
    const tx = await this.txRepo.findOne({ where: { id: txId } as any, relations: { buyer: true } as any });
    if (!tx) return;
    if (tx.status !== TransactionStatus.REFUND_PENDING) return;

    if (this.activeSettlementProvider(tx) === 'anchor') {
      const amountMinorRaw = job.payload?.amountInKobo;
      const amountMinor = typeof amountMinorRaw === 'number'
        ? Math.max(0, Math.floor(amountMinorRaw))
        : Math.max(0, Math.round(Number(tx.amount) * 100));
      const buyerCounterparty = await this.anchorService.ensureCounterpartyForUser(tx.buyerId);
      const reference = `tt_refund_${tx.id}_${amountMinor}`;
      const res = await this.anchorService.initiateNipTransfer({
        amountMinor,
        counterpartyId: String(buyerCounterparty.providerCounterpartyId || '').trim(),
        currency: String(tx.currency || 'NGN'),
        reason: `TrustyTrade refund for ${tx.id}`,
        reference,
      });
      const transfer = (res as any)?.data;
      const refundId = transfer?.id ? String(transfer.id) : null;
      const status = String(transfer?.attributes?.status || 'PENDING').toUpperCase();
      await this.txRepo.update(tx.id, {
        refundStatus: status,
        refundProvider: 'anchor',
        refundProviderRefundId: refundId,
        refundInitiatedAt: new Date(),
        refundFailureReason: null,
      } as any);
      await this.ledgerService.record({
        transactionId: tx.id,
        eventType: 'REFUND_INITIATED',
        amountMinor,
        currency: String(tx.currency || 'NGN'),
        provider: 'anchor',
        providerRef: reference,
        metadata: { transferId: refundId, counterpartyId: buyerCounterparty.providerCounterpartyId },
      });
      await this.auditService.record({
        action: 'refund.initiated',
        actorUserId: job.payload?.actorUserId ?? null,
        actorRole: job.payload?.actorRole ?? null,
        targetType: 'transaction',
        targetId: tx.id,
        after: { provider: 'anchor', refundId, amountMinor },
        outcome: 'ok',
      });
      if (refundId) {
        await this.outboxService.enqueue({ type: 'refund.verify', dedupeKey: tx.id, payload: { transactionId: tx.id } }).catch(() => null);
      }
      return;
    }

    const paymentRef = String(tx.paymentReference || '').trim();
    if (!paymentRef) throw new Error('Missing payment reference');
    const amountInKoboRaw = job.payload?.amountInKobo;
    const amountInKobo = typeof amountInKoboRaw === 'number' ? Math.max(0, Math.floor(amountInKoboRaw)) : undefined;

    const res = await this.paystackService.refundTransaction({
      transaction: paymentRef,
      amountInKobo,
      idempotencyKey: `tt_refund_${tx.id}_${amountInKobo ?? 'full'}`,
    });
    const refundId = res?.id ? String(res.id) : null;
    const status = String(res?.status || '').toUpperCase() || 'INITIATED';
    await this.txRepo.update(tx.id, {
      refundStatus: status,
      refundProvider: 'paystack',
      refundProviderRefundId: refundId,
      refundInitiatedAt: new Date(),
      refundFailureReason: null,
    } as any);
    await this.ledgerService.record({
      transactionId: tx.id,
      eventType: 'REFUND_INITIATED',
      amountMinor: amountInKobo ?? Math.max(0, Math.round(Number(tx.amount) * 100)),
      currency: String(tx.currency || 'NGN'),
      provider: 'paystack',
      providerRef: paymentRef,
      metadata: { refundId },
    });
    await this.auditService.record({
      action: 'refund.initiated',
      actorUserId: job.payload?.actorUserId ?? null,
      actorRole: job.payload?.actorRole ?? null,
      targetType: 'transaction',
      targetId: tx.id,
      after: { provider: 'paystack', paymentRef, refundId, amountInKobo: amountInKobo ?? null },
      outcome: 'ok',
    });
    if (refundId) {
      await this.outboxService.enqueue({ type: 'refund.verify', dedupeKey: tx.id, payload: { transactionId: tx.id } }).catch(() => null);
    }
  }

  private async handleRefundVerify(job: OutboxJob) {
    const txId = String(job.payload?.transactionId || '').trim();
    if (!txId) throw new Error('Missing transactionId');
    const tx = await this.txRepo.findOne({ where: { id: txId } as any });
    if (!tx) return;
    if (tx.status !== TransactionStatus.REFUND_PENDING) return;
    if (this.activeSettlementProvider(tx) === 'anchor') {
      const refundId = String(tx.refundProviderRefundId || '').trim();
      if (!refundId) throw new Error('Missing refund transfer id');
      const r = await this.anchorService.verifyTransfer(refundId);
      const data = (r as any)?.data;
      const providerStatus = String(data?.attributes?.status || '').toLowerCase();
      if (providerStatus === 'completed') {
        await this.txRepo.update(tx.id, {
          refundStatus: 'PROCESSED',
          refundProcessedAt: new Date(),
          status: TransactionStatus.REFUNDED,
        } as any);
        await this.ledgerService.record({
          transactionId: tx.id,
          eventType: 'REFUND_CONFIRMED',
          amountMinor: Math.max(0, Number(data?.attributes?.amount) || Math.round(Number(tx.amount) * 100)),
          currency: String(data?.attributes?.currency || tx.currency || 'NGN'),
          provider: 'anchor',
          providerRef: refundId,
          metadata: null,
        });
        return;
      }
      if (providerStatus === 'failed' || providerStatus === 'reversed') {
        await this.txRepo.update(tx.id, { refundStatus: 'FAILED', refundFailureReason: providerStatus } as any);
        await this.ledgerService.record({
          transactionId: tx.id,
          eventType: 'REFUND_FAILED',
          amountMinor: Math.max(0, Math.round(Number(tx.amount) * 100)),
          currency: String(tx.currency || 'NGN'),
          provider: 'anchor',
          providerRef: refundId,
          metadata: { providerStatus },
        });
        return;
      }
      await this.txRepo.update(tx.id, { refundStatus: providerStatus ? providerStatus.toUpperCase() : 'PENDING' } as any);
      throw new Error('Refund pending');
    }
    const refundId = String(tx.refundProviderRefundId || '').trim();
    if (!refundId) throw new Error('Missing refund id');

    const r = await this.paystackService.fetchRefund(refundId);
    const data = (r as any)?.data;
    const providerStatus = String(data?.status || '').toLowerCase();

    if (providerStatus === 'processed') {
      await this.txRepo.update(tx.id, {
        refundStatus: 'PROCESSED',
        refundProcessedAt: new Date(),
        status: TransactionStatus.REFUNDED,
      } as any);
      await this.ledgerService.record({
        transactionId: tx.id,
        eventType: 'REFUND_CONFIRMED',
        amountMinor: Math.max(0, Number(data?.amount) || Math.round(Number(tx.amount) * 100)),
        currency: String(data?.currency || tx.currency || 'NGN'),
        provider: 'paystack',
        providerRef: refundId,
        metadata: null,
      });
      return;
    }
    if (providerStatus === 'needs-attention') {
      await this.txRepo.update(tx.id, { refundStatus: 'NEEDS_ATTENTION', refundFailureReason: 'needs_attention' } as any);
      return;
    }
    if (providerStatus === 'failed' || providerStatus === 'cancelled') {
      await this.txRepo.update(tx.id, { refundStatus: 'FAILED', refundFailureReason: providerStatus } as any);
      await this.ledgerService.record({
        transactionId: tx.id,
        eventType: 'REFUND_FAILED',
        amountMinor: Math.max(0, Math.round(Number(tx.amount) * 100)),
        currency: String(tx.currency || 'NGN'),
        provider: 'paystack',
        providerRef: refundId,
        metadata: { providerStatus },
      });
      return;
    }
    await this.txRepo.update(tx.id, { refundStatus: providerStatus ? providerStatus.toUpperCase() : 'PENDING' } as any);
    throw new Error('Refund pending');
  }
}
