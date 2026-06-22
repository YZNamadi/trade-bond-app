import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, DeepPartial, EntityManager, Repository } from 'typeorm';
import { createHash, createHmac, randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Currency, Transaction, TransactionStatus } from './transaction.entity';
import { PaystackService } from '../paystack/paystack.service';
import { User, UserRole } from '../users/user.entity';
import { TransactionEvent, TransactionEventType } from './transaction-event.entity';
import { TransactionProof } from './transaction-proof.entity';
import { TransactionMessage } from './transaction-message.entity';
import { IdempotencyService } from '../common/idempotency.service';
import { AuditService } from '../common/audit.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { getRequestContext } from '../observability/request-context';
import { DisputesService } from '../disputes/disputes.service';
import { OutboxService } from '../common/outbox.service';
import { LedgerService } from '../common/ledger.service';
import { AnchorService } from '../anchor/anchor.service';
import { MoneyMovement } from '../money/money-movement.entity';

function normalizeStatus(status: TransactionStatus): TransactionStatus {
  switch (status) {
    case TransactionStatus.PENDING:
      return TransactionStatus.CREATED;
    case TransactionStatus.ACTIVE:
      return TransactionStatus.FUNDED;
    case TransactionStatus.COMPLETED:
      return TransactionStatus.RELEASED;
    case TransactionStatus.LEGACY_DISPUTED:
      return TransactionStatus.DISPUTED;
    case TransactionStatus.CANCELLED:
      return TransactionStatus.REFUNDED;
    default:
      return status;
  }
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionsRepository: Repository<Transaction>,
    @InjectRepository(TransactionEvent)
    private transactionEventsRepository: Repository<TransactionEvent>,
    @InjectRepository(TransactionProof)
    private transactionProofsRepository: Repository<TransactionProof>,
    @InjectRepository(TransactionMessage)
    private transactionMessagesRepository: Repository<TransactionMessage>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private paystackService: PaystackService,
    private idempotencyService: IdempotencyService,
    private auditService: AuditService,
    private dataSource: DataSource,
    private disputesService: DisputesService,
    private outboxService: OutboxService,
    private ledgerService: LedgerService,
    @Inject(forwardRef(() => AnchorService))
    private anchorService: AnchorService,
  ) {}

  private activeFundingProvider() {
    return this.anchorService.isEnabled() ? 'anchor' : 'paystack';
  }

  private activeSettlementProvider() {
    return this.anchorService.activeSettlementProvider() === 'anchor' ? 'anchor' : 'paystack';
  }

  private supportsRowLock() {
    return this.dataSource.options.type === 'postgres';
  }

  private async loadForUpdate(manager: EntityManager, id: string) {
    const repo = manager.getRepository(Transaction);
    const tx = await repo.findOne({
      where: { id },
      relations: { buyer: true, seller: true },
      ...(this.supportsRowLock() ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    } as any);
    if (!tx) throw new NotFoundException(`Transaction #${id} not found`);
    const normalized = normalizeStatus(tx.status);
    if (tx.status !== normalized) {
      tx.status = normalized;
      await repo.save(tx);
    }
    return { tx, repo };
  }

  private async atomicTransition(manager: EntityManager, input: { id: string; from: TransactionStatus; to: TransactionStatus; set?: Partial<Transaction> }) {
    const repo = manager.getRepository(Transaction);
    const current = await repo.findOne({ where: { id: input.id } });
    if (!current) throw new NotFoundException(`Transaction #${input.id} not found`);
    const currentVersion = typeof (current as any).version === 'number' ? (current as any).version : 1;
    const res = await repo
      .createQueryBuilder()
      .update(Transaction)
      .set({
        ...(input.set ?? {}),
        status: input.to,
        version: () => 'COALESCE(version, 0) + 1',
      } as any)
      .where('id = :id AND status = :from AND (version = :version OR version IS NULL)', { id: input.id, from: input.from, version: currentVersion })
      .execute();
    return res.affected === 1;
  }

  private eventTitle(type: TransactionEventType): string {
    switch (type) {
      case TransactionEventType.TRANSACTION_CREATED:
        return 'Transaction created';
      case TransactionEventType.PAYMENT_INITIALIZED:
        return 'Buyer initiated payment';
      case TransactionEventType.PAYMENT_VERIFIED:
        return 'Payment verified';
      case TransactionEventType.ESCROW_FUNDED:
        return 'Funds secured in escrow';
      case TransactionEventType.SHIPPING_UPDATED:
        return 'Seller updated delivery';
      case TransactionEventType.DELIVERY_CONFIRMED:
        return 'Buyer confirmed delivery';
      case TransactionEventType.FUNDS_RELEASED:
        return 'Funds released to seller';
      case TransactionEventType.PAYOUT_INITIATED:
        return 'Payout initiated';
      case TransactionEventType.PAYOUT_FAILED:
        return 'Payout failed';
      case TransactionEventType.DISPUTE_OPENED:
        return 'Dispute opened';
      default:
        return String(type);
    }
  }

  private async recordEvent(
    transactionId: string,
    type: TransactionEventType,
    description?: string,
    metadata?: Record<string, unknown>,
    actor?: { userId: string; role: string } | null,
    status?: { from: TransactionStatus | null; to: TransactionStatus | null } | null,
    manager?: EntityManager | null,
  ) {
    const ctx = getRequestContext();
    const repo = manager ? manager.getRepository(TransactionEvent) : this.transactionEventsRepository;
    const event = repo.create({
      transactionId,
      type,
      title: this.eventTitle(type),
      description: description || null,
      metadata: metadata ?? null,
      requestId: ctx?.requestId ?? null,
      actorUserId: actor?.userId ?? null,
      actorRole: actor?.role ?? null,
      fromStatus: status?.from ?? null,
      toStatus: status?.to ?? null,
    });
    await repo.save(event);
  }

  async create(createTransactionDto: CreateTransactionDto, userId: string, idempotencyKey?: string): Promise<Transaction> {
    return this.idempotencyService.run({
      scope: `tx:create:${userId}`,
      key: idempotencyKey,
      requestFingerprint: createTransactionDto,
      handler: async () => {
        const seller = await this.usersRepository.findOne({
          where: { id: createTransactionDto.sellerId },
          select: ['id', 'role', 'isVerified', 'trustyTagLower'],
        });
        if (!seller || seller.role !== UserRole.SELLER || !seller.isVerified || !seller.trustyTagLower) {
          throw new BadRequestException('Seller is not verified');
        }
        const transaction = this.transactionsRepository.create({
          sellerId: createTransactionDto.sellerId,
          buyerId: userId,
          amount: createTransactionDto.amount,
          currency: createTransactionDto.currency ?? Currency.NGN,
          description: createTransactionDto.description,
          status: TransactionStatus.CREATED,
        } as Transaction);
        const saved = await this.transactionsRepository.save(transaction);
        await this.recordEvent(
          saved.id,
          TransactionEventType.TRANSACTION_CREATED,
          'Transaction created',
          { sellerVerified: true },
          { userId, role: UserRole.BUYER },
          { from: null, to: TransactionStatus.CREATED },
        );
        await this.auditService.record({
          action: 'transaction.create',
          actorUserId: userId,
          actorRole: UserRole.BUYER,
          targetType: 'transaction',
          targetId: saved.id,
          after: { status: TransactionStatus.CREATED, amount: saved.amount, currency: saved.currency },
          outcome: 'ok',
        });
        const full = await this.findOne(saved.id, userId);
        return { statusCode: 201, body: full };
      },
    });
  }

  async findAllByUserId(userId: string, viewerRole?: string): Promise<Transaction[]> {
    const txs = await this.transactionsRepository.find({
      where: [
        { buyerId: userId },
        { sellerId: userId }
      ],
      relations: { buyer: true, seller: true },
      select: {
        id: true,
        amount: true,
        currency: true,
        description: true,
        status: true,
        paymentReference: true,
        trackingId: true,
        buyerId: true,
        sellerId: true,
        createdAt: true,
        updatedAt: true,
        buyer: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          phone: true,
          role: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true,
        },
        seller: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          phone: true,
          role: true,
          isVerified: true,
          trustyTag: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      order: { createdAt: 'DESC' },
    });
    for (const t of txs) {
      t.status = normalizeStatus(t.status);
    }
    const visible = txs.filter((t) => normalizeStatus(t.status) !== TransactionStatus.CREATED);
    return visible;
  }

  async findOne(id: string, userId?: string, viewerRole?: string): Promise<Transaction> {
    const transaction = await this.transactionsRepository.findOne({
      where: { id },
      relations: { buyer: true, seller: true },
      select: {
        id: true,
        amount: true,
        currency: true,
        description: true,
        status: true,
        paymentReference: true,
        trackingId: true,
        buyerId: true,
        sellerId: true,
        createdAt: true,
        updatedAt: true,
        buyer: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          phone: true,
          role: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true,
        },
        seller: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          phone: true,
          role: true,
          isVerified: true,
          trustyTag: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    });
    if (!transaction) {
      throw new NotFoundException(`Transaction #${id} not found`);
    }
    transaction.status = normalizeStatus(transaction.status);
    if (userId && transaction.buyerId !== userId && transaction.sellerId !== userId) {
      throw new NotFoundException(`Transaction #${id} not found`);
    }
    const r = String(viewerRole || '').toLowerCase();
    if (userId && r === 'seller' && transaction.sellerId === userId && transaction.status === TransactionStatus.CREATED) {
      throw new NotFoundException(`Transaction #${id} not found`);
    }
    return transaction;
  }

  async findAllForAdmin(input: { q: string | null; status: 'ALL' | 'SETTLEMENT_PENDING' }) {
    const qRaw = input.q ? String(input.q).trim() : '';
    const q = qRaw ? `%${qRaw.toLowerCase()}%` : '';
    const qb = this.transactionsRepository
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.buyer', 'buyer')
      .leftJoinAndSelect('tx.seller', 'seller')
      .select([
        'tx.id',
        'tx.amount',
        'tx.currency',
        'tx.description',
        'tx.status',
        'tx.paymentReference',
        'tx.payoutStatus',
        'tx.payoutReference',
        'tx.refundStatus',
        'tx.refundProviderRefundId',
        'tx.createdAt',
        'tx.updatedAt',
        'buyer.id',
        'buyer.email',
        'buyer.fullName',
        'seller.id',
        'seller.email',
        'seller.fullName',
        'seller.trustyTag',
      ])
      .orderBy('tx.createdAt', 'DESC')
      .take(200);

    if (input.status === 'SETTLEMENT_PENDING') {
      qb.andWhere('tx.status IN (:...s)', { s: [TransactionStatus.RELEASE_PENDING, TransactionStatus.REFUND_PENDING] });
    }

    if (q) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('LOWER(tx.id) LIKE :q', { q })
            .orWhere('LOWER(tx.paymentReference) LIKE :q', { q })
            .orWhere('LOWER(tx.payoutReference) LIKE :q', { q })
            .orWhere('LOWER(tx.refundProviderRefundId) LIKE :q', { q })
            .orWhere('LOWER(buyer.email) LIKE :q', { q })
            .orWhere('LOWER(seller.email) LIKE :q', { q });
        }),
      );
    }

    const rows = await qb.getMany();
    for (const t of rows) t.status = normalizeStatus(t.status);
    return rows;
  }

  async findOneForAdmin(id: string) {
    const tx = await this.transactionsRepository.findOne({
      where: { id },
      relations: { buyer: true, seller: true },
      select: {
        id: true,
        amount: true,
        currency: true,
        description: true,
        status: true,
        paymentReference: true,
        payoutStatus: true,
        payoutReference: true,
        payoutProvider: true,
        payoutProviderTransferCode: true,
        payoutInitiatedAt: true,
        payoutFailureReason: true,
        refundStatus: true,
        refundProvider: true,
        refundProviderRefundId: true,
        refundInitiatedAt: true,
        refundProcessedAt: true,
        refundFailureReason: true,
        trackingId: true,
        createdAt: true,
        updatedAt: true,
        buyer: { id: true, email: true, fullName: true, role: true, isVerified: true } as any,
        seller: { id: true, email: true, fullName: true, role: true, isVerified: true, trustyTag: true } as any,
      } as any,
    });
    if (!tx) throw new NotFoundException('Transaction not found');
    tx.status = normalizeStatus(tx.status);
    return tx;
  }

  async getLedgerForAdmin(id: string) {
    const tx = await this.transactionsRepository.findOne({ where: { id }, select: { id: true } as any });
    if (!tx) throw new NotFoundException('Transaction not found');
    return this.ledgerService.listByTransaction(id);
  }

  async adminRetrySettlement(id: string, kind: 'payout' | 'refund' | 'verify', idempotencyKey?: string) {
    return this.idempotencyService.run({
      scope: `admin:settlement:${kind}:${id}`,
      key: idempotencyKey,
      requestFingerprint: { id, kind },
      handler: async () => {
        const tx = await this.transactionsRepository.findOne({ where: { id } });
        if (!tx) throw new NotFoundException('Transaction not found');
        tx.status = normalizeStatus(tx.status);

        if (kind === 'payout') {
          await this.outboxService.enqueue({ type: 'payout.initiate', dedupeKey: tx.id, payload: { transactionId: tx.id } });
          await this.outboxService.enqueue({ type: 'payout.verify', dedupeKey: tx.id, payload: { transactionId: tx.id } });
        } else if (kind === 'refund') {
          await this.outboxService.enqueue({ type: 'refund.initiate', dedupeKey: tx.id, payload: { transactionId: tx.id } });
          await this.outboxService.enqueue({ type: 'refund.verify', dedupeKey: tx.id, payload: { transactionId: tx.id } });
        } else {
          await this.outboxService.enqueue({ type: 'payout.verify', dedupeKey: tx.id, payload: { transactionId: tx.id } });
          await this.outboxService.enqueue({ type: 'refund.verify', dedupeKey: tx.id, payload: { transactionId: tx.id } });
        }

        await this.auditService.record({
          action: 'admin.settlement.retry',
          actorUserId: getRequestContext()?.userId || null,
          actorRole: UserRole.ADMIN,
          targetType: 'transaction',
          targetId: tx.id,
          after: { kind },
          outcome: 'ok',
        });

        return { statusCode: 200, body: { ok: true } };
      },
    });
  }

  async initializePayment(id: string, email: string, userId: string, idempotencyKey?: string) {
    return this.idempotencyService.run({
      scope: `tx:pay:init:${userId}:${id}`,
      key: idempotencyKey,
      requestFingerprint: { id, email },
      handler: async () => {
        const tx = await this.transactionsRepository.findOne({ where: { id }, relations: { buyer: true } });
        if (!tx) throw new NotFoundException(`Transaction #${id} not found`);
        const normalized = normalizeStatus(tx.status);
        if (tx.buyerId !== userId) {
          throw new ForbiddenException('Only buyer can initialize payment');
        }
        if (normalized !== TransactionStatus.CREATED) {
          throw new BadRequestException('Transaction is not eligible for funding');
        }
        if (this.activeFundingProvider() === 'anchor') {
          if (tx.paymentReference) {
            return {
              statusCode: 200,
              body: {
                provider: 'anchor',
                reference: tx.paymentReference,
                paymentStatus: 'pending',
              },
            };
          }
          const buyer = tx.buyer;
          if (!buyer) throw new BadRequestException('Buyer profile not available');
          const paymentData = await this.anchorService.initializeCollection(tx, buyer);
          tx.paymentReference = String(paymentData.reference || '').trim();
          await this.transactionsRepository.save(tx);
          await this.recordEvent(
            tx.id,
            TransactionEventType.PAYMENT_INITIALIZED,
            'Payment initialized with provider',
            {
              provider: 'anchor',
              collectionStrategy: paymentData.collectionStrategy,
              reference: tx.paymentReference,
              accountNumber: paymentData.accountNumber,
              expiresAt: paymentData.expiresAt ?? null,
            },
            { userId, role: UserRole.BUYER },
            { from: TransactionStatus.CREATED, to: TransactionStatus.CREATED },
          );
          await this.auditService.record({
            action: 'payment.initialize',
            actorUserId: userId,
            actorRole: UserRole.BUYER,
            targetType: 'transaction',
            targetId: tx.id,
            after: {
              provider: 'anchor',
              reference: tx.paymentReference,
              accountNumber: paymentData.accountNumber,
              collectionStrategy: paymentData.collectionStrategy,
            },
            outcome: 'ok',
          });
          return { statusCode: 200, body: paymentData as any };
        }
        if (tx.paymentReference) {
          if (tx.paystackAuthorizationUrl) {
            return {
              statusCode: 200,
              body: {
                authorization_url: tx.paystackAuthorizationUrl,
                access_code: tx.paystackAccessCode,
                reference: tx.paymentReference,
              } as any,
            };
          }
          throw new BadRequestException('Payment already initialized');
        }

        const reference = `TT_${randomBytes(10).toString('hex').toUpperCase()}`;
        const amountInKobo = Math.round(Number(tx.amount) * 100);
        const paymentData = await this.paystackService.initializeTransaction(email, amountInKobo, reference);

        tx.paymentReference = reference;
        tx.paystackAuthorizationUrl = (paymentData as any)?.authorization_url ?? null;
        tx.paystackAccessCode = (paymentData as any)?.access_code ?? null;
        tx.paystackInitializedAt = new Date();
        await this.transactionsRepository.save(tx);

        await this.recordEvent(
          tx.id,
          TransactionEventType.PAYMENT_INITIALIZED,
          'Payment initialized with provider',
          { reference, amountInKobo, currency: tx.currency, provider: 'paystack' },
          { userId, role: UserRole.BUYER },
          { from: TransactionStatus.CREATED, to: TransactionStatus.CREATED },
        );
        await this.auditService.record({
          action: 'payment.initialize',
          actorUserId: userId,
          actorRole: UserRole.BUYER,
          targetType: 'transaction',
          targetId: tx.id,
          after: { reference, amountInKobo, currency: tx.currency },
          outcome: 'ok',
        });
        return { statusCode: 200, body: paymentData as any };
      },
    });
  }

  private interpretPaystackVerification(
    tx: Transaction,
    verification: any,
    buyerEmail: string,
  ): { kind: 'ok'; providerTxId: string | null; customerEmail: string | null; paidCurrency: string | null; paidAmount: number; expectedAmount: number } | { kind: 'pending'; providerStatus: string } {
    if (!verification?.status) {
      throw new BadRequestException('Payment verification failed');
    }
    const providerStatus = String(verification?.data?.status ?? '').toLowerCase();
    if (providerStatus !== 'success') {
      if (providerStatus === 'failed' || providerStatus === 'abandoned') {
        throw new BadRequestException(`Payment ${providerStatus}`);
      }
      return { kind: 'pending', providerStatus: providerStatus || 'unknown' };
    }
    const expectedAmount = Math.round(Number(tx.amount) * 100);
    const paidAmount = Number(verification?.data?.amount);
    if (!Number.isFinite(paidAmount) || paidAmount !== expectedAmount) {
      throw new BadRequestException('Payment amount mismatch');
    }
    const paidCurrency = String(verification?.data?.currency || '').toUpperCase();
    const expectedCurrency = String(tx.currency || Currency.NGN).toUpperCase();
    if (paidCurrency && paidCurrency !== expectedCurrency) {
      throw new BadRequestException('Payment currency mismatch');
    }
    const customerEmail = String(verification?.data?.customer?.email || '').toLowerCase();
    if (customerEmail && customerEmail !== String(buyerEmail || '').toLowerCase()) {
      throw new BadRequestException('Payment customer mismatch');
    }
    return {
      kind: 'ok',
      providerTxId: String(verification?.data?.id ?? '') || null,
      customerEmail: customerEmail || null,
      paidCurrency: paidCurrency || null,
      paidAmount,
      expectedAmount,
    };
  }

  async markFundedByReference(reference: string) {
    if (this.activeFundingProvider() === 'anchor') {
      return null;
    }
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Transaction);
      const tx = await repo.findOne({
        where: { paymentReference: reference },
        relations: { buyer: true, seller: true },
        ...(this.supportsRowLock() ? { lock: { mode: 'pessimistic_write' as const } } : {}),
      } as any);
      if (!tx) return null;
      const normalized = normalizeStatus(tx.status);
      if (
        [
          TransactionStatus.FUNDED,
          TransactionStatus.SHIPPED,
          TransactionStatus.DELIVERED,
          TransactionStatus.RELEASE_PENDING,
          TransactionStatus.RELEASED,
          TransactionStatus.REFUND_PENDING,
          TransactionStatus.REFUNDED,
        ].includes(normalized)
      ) {
        return tx;
      }
      if (normalized !== TransactionStatus.CREATED) {
        return tx;
      }
      const verification = await this.paystackService.verifyTransaction(reference);
      const result = this.interpretPaystackVerification(tx, verification, tx.buyer?.email || '');
      if (result.kind !== 'ok') {
        return tx;
      }
      const checks = result;
      const ok = await this.atomicTransition(manager, {
        id: tx.id,
        from: TransactionStatus.CREATED,
        to: TransactionStatus.FUNDED,
        set: {
          paystackVerifiedAt: new Date(),
          paystackTransactionId: checks.providerTxId,
          paystackCustomerEmail: checks.customerEmail,
        } as any,
      });
      const saved = await repo.findOne({ where: { id: tx.id }, relations: { buyer: true, seller: true } });
      if (!saved) return null;
      if (!ok) {
        return saved;
      }
      await this.ledgerService.recordInManager(manager, {
        transactionId: saved.id,
        eventType: 'PAYMENT_FUNDED',
        amountMinor: checks.paidAmount,
        currency: checks.paidCurrency || String(saved.currency || Currency.NGN),
        provider: 'paystack',
        providerRef: reference,
        metadata: { paystackTransactionId: checks.providerTxId },
      });
      await this.recordEvent(
        saved.id,
        TransactionEventType.PAYMENT_VERIFIED,
        'Payment verified via provider webhook',
        { reference, provider: 'paystack', source: 'webhook', paidAmount: checks.paidAmount, currency: checks.paidCurrency },
        null,
        { from: TransactionStatus.CREATED, to: TransactionStatus.FUNDED },
        manager,
      );
      await this.recordEvent(
        saved.id,
        TransactionEventType.ESCROW_FUNDED,
        'Funds secured in escrow',
        { reference, provider: 'paystack', source: 'webhook' },
        null,
        { from: TransactionStatus.CREATED, to: TransactionStatus.FUNDED },
        manager,
      );
      await this.auditService.record({
        action: 'payment.webhook.funded',
        targetType: 'transaction',
        targetId: saved.id,
        before: { status: TransactionStatus.CREATED },
        after: { status: TransactionStatus.FUNDED, reference, providerTxId: checks.providerTxId },
        outcome: 'ok',
      }, manager);
      return saved;
    });
  }

  async verifyPayment(id: string, reference: string, userId: string, idempotencyKey?: string) {
    return this.idempotencyService.run({
      scope: `tx:pay:verify:${userId}:${id}`,
      key: idempotencyKey,
      requestFingerprint: { id, reference },
      handler: async () => {
        if (this.activeFundingProvider() === 'anchor') {
          return this.verifyAnchorPayment(id, reference, userId);
        }
        const verificationResult = await this.dataSource.transaction(async (manager): Promise<{
          transaction: Transaction;
          funded: boolean;
          paymentStatus: string;
        }> => {
          const { tx, repo } = await this.loadForUpdate(manager, id);
          if (tx.buyerId !== userId) {
            throw new ForbiddenException('Only buyer can verify payment');
          }
          const normalized = normalizeStatus(tx.status);
          if (
            [
              TransactionStatus.FUNDED,
              TransactionStatus.SHIPPED,
              TransactionStatus.DELIVERED,
              TransactionStatus.RELEASE_PENDING,
              TransactionStatus.RELEASED,
              TransactionStatus.REFUND_PENDING,
              TransactionStatus.REFUNDED,
            ].includes(normalized)
          ) {
            return { transaction: tx, funded: true, paymentStatus: 'success' };
          }
          if (normalized !== TransactionStatus.CREATED) {
            throw new BadRequestException('Transaction is not eligible for verification');
          }
          if (!tx.paymentReference) {
            throw new BadRequestException('Payment was not initialized for this transaction');
          }
          if (tx.paymentReference !== reference) {
            throw new BadRequestException('Invalid payment reference');
          }
          const verification = await this.paystackService.verifyTransaction(reference);
          const result = this.interpretPaystackVerification(tx, verification, tx.buyer?.email || '');
          if (result.kind !== 'ok') {
            const pending = await repo.findOne({ where: { id: tx.id }, relations: { buyer: true, seller: true } });
            if (!pending) throw new NotFoundException(`Transaction #${id} not found`);
            return { transaction: pending, funded: false, paymentStatus: result.providerStatus };
          }
          const checks = result;
          const ok = await this.atomicTransition(manager, {
            id: tx.id,
            from: TransactionStatus.CREATED,
            to: TransactionStatus.FUNDED,
            set: {
              paystackVerifiedAt: new Date(),
              paystackTransactionId: checks.providerTxId,
              paystackCustomerEmail: checks.customerEmail,
            } as any,
          });
          const updated = await repo.findOne({ where: { id: tx.id }, relations: { buyer: true, seller: true } });
          if (!updated) throw new NotFoundException(`Transaction #${id} not found`);
          if (!ok) {
            const s = normalizeStatus(updated.status);
            if (
              [
                TransactionStatus.FUNDED,
                TransactionStatus.SHIPPED,
                TransactionStatus.DELIVERED,
                TransactionStatus.RELEASE_PENDING,
                TransactionStatus.RELEASED,
                TransactionStatus.REFUND_PENDING,
                TransactionStatus.REFUNDED,
              ].includes(s)
            ) {
              return { transaction: updated, funded: true, paymentStatus: 'success' };
            }
            throw new BadRequestException('Concurrent update detected');
          }
          if (ok) {
            await this.ledgerService.recordInManager(manager, {
              transactionId: updated.id,
              eventType: 'PAYMENT_FUNDED',
              amountMinor: checks.paidAmount,
              currency: checks.paidCurrency || String(updated.currency || Currency.NGN),
              provider: 'paystack',
              providerRef: reference,
              metadata: { paystackTransactionId: checks.providerTxId },
            });
            await this.recordEvent(
              updated.id,
              TransactionEventType.PAYMENT_VERIFIED,
              'Payment verified with provider',
              { reference, provider: 'paystack', source: 'verify', paidAmount: checks.paidAmount, currency: checks.paidCurrency },
              { userId, role: UserRole.BUYER },
              { from: TransactionStatus.CREATED, to: TransactionStatus.FUNDED },
              manager,
            );
            await this.recordEvent(
              updated.id,
              TransactionEventType.ESCROW_FUNDED,
              'Funds secured in escrow',
              { reference, provider: 'paystack', source: 'verify' },
              { userId, role: UserRole.BUYER },
              { from: TransactionStatus.CREATED, to: TransactionStatus.FUNDED },
              manager,
            );
            await this.auditService.record({
              action: 'payment.verify',
              actorUserId: userId,
              actorRole: UserRole.BUYER,
              targetType: 'transaction',
              targetId: updated.id,
              before: { status: TransactionStatus.CREATED },
              after: { status: TransactionStatus.FUNDED, reference, providerTxId: checks.providerTxId },
              outcome: 'ok',
            }, manager);
          }
          return { transaction: updated, funded: true, paymentStatus: 'success' };
        });
        const full = await this.findOne(verificationResult.transaction.id, userId);
        return {
          statusCode: 200,
          body: {
            transaction: full,
            funded: verificationResult.funded,
            paymentStatus: verificationResult.paymentStatus,
          },
        };
      },
    });
  }

  private async verifyAnchorPayment(id: string, reference: string, userId: string) {
    const verificationResult = await this.dataSource.transaction(async (manager): Promise<{
      transaction: Transaction;
      funded: boolean;
      paymentStatus: string;
    }> => {
      const { tx, repo } = await this.loadForUpdate(manager, id);
      if (tx.buyerId !== userId) {
        throw new ForbiddenException('Only buyer can verify payment');
      }
      const normalized = normalizeStatus(tx.status);
      if (
        [
          TransactionStatus.FUNDED,
          TransactionStatus.SHIPPED,
          TransactionStatus.DELIVERED,
          TransactionStatus.RELEASE_PENDING,
          TransactionStatus.RELEASED,
          TransactionStatus.REFUND_PENDING,
          TransactionStatus.REFUNDED,
        ].includes(normalized)
      ) {
        return { transaction: tx, funded: true, paymentStatus: 'success' };
      }
      if (normalized !== TransactionStatus.CREATED) {
        throw new BadRequestException('Transaction is not eligible for verification');
      }
      if (!tx.paymentReference) {
        throw new BadRequestException('Payment was not initialized for this transaction');
      }
      if (tx.paymentReference !== reference) {
        throw new BadRequestException('Invalid payment reference');
      }
      const movementRepo = manager.getRepository(MoneyMovement);
      const movement = await movementRepo.findOne({
        where: {
          transactionId: tx.id,
          provider: 'anchor',
          kind: 'PAYIN',
          reference,
        } as any,
        order: { createdAt: 'DESC' } as any,
      });
      const pending = await repo.findOne({ where: { id: tx.id }, relations: { buyer: true, seller: true } });
      if (!pending) throw new NotFoundException(`Transaction #${id} not found`);
      if (!movement) {
        return { transaction: pending, funded: false, paymentStatus: 'pending' };
      }
      if (movement.status !== 'COMPLETED') {
        return { transaction: pending, funded: false, paymentStatus: String(movement.status || 'pending').toLowerCase() };
      }
      const amountMinor = Number(movement.amountMinor || 0);
      const ok = await this.atomicTransition(manager, {
        id: tx.id,
        from: TransactionStatus.CREATED,
        to: TransactionStatus.FUNDED,
      });
      const updated = await repo.findOne({ where: { id: tx.id }, relations: { buyer: true, seller: true } });
      if (!updated) throw new NotFoundException(`Transaction #${id} not found`);
      if (!ok) {
        const s = normalizeStatus(updated.status);
        if (
          [
            TransactionStatus.FUNDED,
            TransactionStatus.SHIPPED,
            TransactionStatus.DELIVERED,
            TransactionStatus.RELEASE_PENDING,
            TransactionStatus.RELEASED,
            TransactionStatus.REFUND_PENDING,
            TransactionStatus.REFUNDED,
          ].includes(s)
        ) {
          return { transaction: updated, funded: true, paymentStatus: 'success' };
        }
        throw new BadRequestException('Concurrent update detected');
      }
      await this.ledgerService.recordInManager(manager, {
        transactionId: updated.id,
        eventType: 'PAYMENT_FUNDED',
        amountMinor,
        currency: String(movement.currency || updated.currency || Currency.NGN),
        provider: 'anchor',
        providerRef: reference,
        metadata: {
          payinId: movement.providerObjectId,
        },
      });
      await this.recordEvent(
        updated.id,
        TransactionEventType.PAYMENT_VERIFIED,
        'Payment verified with provider',
        { reference, provider: 'anchor', source: 'verify', amountMinor },
        { userId, role: UserRole.BUYER },
        { from: TransactionStatus.CREATED, to: TransactionStatus.FUNDED },
        manager,
      );
      await this.recordEvent(
        updated.id,
        TransactionEventType.ESCROW_FUNDED,
        'Funds secured in escrow',
        { reference, provider: 'anchor', source: 'verify' },
        { userId, role: UserRole.BUYER },
        { from: TransactionStatus.CREATED, to: TransactionStatus.FUNDED },
        manager,
      );
      await this.auditService.record({
        action: 'payment.verify',
        actorUserId: userId,
        actorRole: UserRole.BUYER,
        targetType: 'transaction',
        targetId: updated.id,
        before: { status: TransactionStatus.CREATED },
        after: { status: TransactionStatus.FUNDED, reference, provider: 'anchor', payinId: movement.providerObjectId },
        outcome: 'ok',
      }, manager);
      return { transaction: updated, funded: true, paymentStatus: 'success' };
    });
    const full = await this.findOne(verificationResult.transaction.id, userId);
    return {
      statusCode: 200,
      body: {
        transaction: full,
        funded: verificationResult.funded,
        paymentStatus: verificationResult.paymentStatus,
      },
    };
  }

  async markFundedFromAnchorPayin(input: {
    reference: string;
    payinId: string;
    amountMinor: number;
    currency: string;
    paidAt?: Date | null;
    providerPayload?: Record<string, unknown> | null;
  }) {
    if (!input.reference) return null;
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Transaction);
      const tx = await repo.findOne({
        where: { paymentReference: input.reference },
        relations: { buyer: true, seller: true },
        ...(this.supportsRowLock() ? { lock: { mode: 'pessimistic_write' as const } } : {}),
      } as any);
      if (!tx) return null;
      const normalized = normalizeStatus(tx.status);
      await this.anchorService.upsertMovementFromWebhook({
        transactionId: tx.id,
        kind: 'PAYIN',
        reference: input.reference,
        providerObjectId: input.payinId,
        providerObjectType: 'PayIn',
        amountMinor: input.amountMinor,
        currency: input.currency,
        status: 'COMPLETED',
        metadata: {
          paidAt: input.paidAt ? input.paidAt.toISOString() : null,
          providerPayload: input.providerPayload ?? null,
        },
      });
      if (
        [
          TransactionStatus.FUNDED,
          TransactionStatus.SHIPPED,
          TransactionStatus.DELIVERED,
          TransactionStatus.RELEASE_PENDING,
          TransactionStatus.RELEASED,
          TransactionStatus.REFUND_PENDING,
          TransactionStatus.REFUNDED,
        ].includes(normalized)
      ) {
        return tx;
      }
      if (normalized !== TransactionStatus.CREATED) {
        return tx;
      }
      const ok = await this.atomicTransition(manager, {
        id: tx.id,
        from: TransactionStatus.CREATED,
        to: TransactionStatus.FUNDED,
      });
      const saved = await repo.findOne({ where: { id: tx.id }, relations: { buyer: true, seller: true } });
      if (!saved) return null;
      if (!ok) return saved;
      await this.ledgerService.recordInManager(manager, {
        transactionId: saved.id,
        eventType: 'PAYMENT_FUNDED',
        amountMinor: input.amountMinor,
        currency: input.currency || String(saved.currency || Currency.NGN),
        provider: 'anchor',
        providerRef: input.reference,
        metadata: { payinId: input.payinId },
      });
      await this.recordEvent(
        saved.id,
        TransactionEventType.PAYMENT_VERIFIED,
        'Payment verified via Anchor webhook',
        { reference: input.reference, provider: 'anchor', source: 'webhook', payinId: input.payinId },
        null,
        { from: TransactionStatus.CREATED, to: TransactionStatus.FUNDED },
        manager,
      );
      await this.recordEvent(
        saved.id,
        TransactionEventType.ESCROW_FUNDED,
        'Funds secured in escrow',
        { reference: input.reference, provider: 'anchor', source: 'webhook' },
        null,
        { from: TransactionStatus.CREATED, to: TransactionStatus.FUNDED },
        manager,
      );
      await this.auditService.record({
        action: 'payment.webhook.funded',
        targetType: 'transaction',
        targetId: saved.id,
        before: { status: TransactionStatus.CREATED },
        after: { status: TransactionStatus.FUNDED, reference: input.reference, provider: 'anchor', payinId: input.payinId },
        outcome: 'ok',
      }, manager);
      return saved;
    });
  }

  async reconcileAnchorTransferWebhook(input: { eventType: string; payload: Record<string, any> }) {
    const payment = input.payload?.data?.attributes?.payment || null;
    const transferId = String(payment?.paymentId || payment?.transferId || '').trim();
    const reference = String(payment?.paymentReference || payment?.reference || '').trim();
    if (!transferId && !reference) return;

    if (input.eventType.startsWith('nip.transfer')) {
      let tx = null as Transaction | null;
      if (reference) {
        tx = await this.transactionsRepository.findOne({ where: [{ payoutReference: reference } as any, { refundProviderRefundId: reference } as any] });
      }
      if (!tx && transferId) {
        tx = await this.transactionsRepository.findOne({
          where: [{ payoutProviderTransferCode: transferId } as any, { refundProviderRefundId: transferId } as any],
        });
      }
      if (!tx) return;
      const status = input.eventType.endsWith('successful')
        ? 'COMPLETED'
        : input.eventType.endsWith('reversed')
          ? 'REVERSED'
          : 'FAILED';
      await this.anchorService.upsertMovementFromWebhook({
        transactionId: tx.id,
        kind: normalizeStatus(tx.status) === TransactionStatus.RELEASE_PENDING ? 'PAYOUT' : 'REFUND',
        reference: reference || tx.payoutReference || tx.paymentReference || tx.id,
        providerObjectId: transferId || reference || tx.id,
        providerObjectType: 'NIP_TRANSFER',
        amountMinor: Number(payment?.amount || Math.round(Number(tx.amount) * 100)),
        currency: String(payment?.currency || tx.currency || 'NGN'),
        status: status as any,
        metadata: { eventType: input.eventType },
      });
      await this.outboxService.enqueue({
        type: normalizeStatus(tx.status) === TransactionStatus.RELEASE_PENDING ? 'payout.verify' : 'refund.verify',
        dedupeKey: tx.id,
        payload: { transactionId: tx.id },
      }).catch(() => null);
    }
  }

  async confirmDelivery(id: string, userId: string, idempotencyKey?: string) {
    return this.idempotencyService.run({
      scope: `tx:confirm:${userId}:${id}`,
      key: idempotencyKey,
      requestFingerprint: { id },
      handler: async () => {
        const saved = await this.dataSource.transaction(async (manager) => {
          const { tx, repo } = await this.loadForUpdate(manager, id);
          if (tx.buyerId !== userId) {
            throw new ForbiddenException('Only buyer can confirm delivery');
          }
          const normalized = normalizeStatus(tx.status);
          if (normalized === TransactionStatus.RELEASE_PENDING || normalized === TransactionStatus.RELEASED) return tx;
          if (normalized === TransactionStatus.DISPUTED) {
            throw new BadRequestException('Transaction is disputed');
          }
          await this.disputesService.assertNoActiveDisputeForTransaction(tx.id);
          if (normalized !== TransactionStatus.SHIPPED && normalized !== TransactionStatus.DELIVERED) {
            throw new BadRequestException('Transaction is not in shipped state');
          }
          if (normalized === TransactionStatus.SHIPPED) {
            const deliveredOk = await this.atomicTransition(manager, { id: tx.id, from: TransactionStatus.SHIPPED, to: TransactionStatus.DELIVERED });
            if (deliveredOk) {
              await this.recordEvent(
                tx.id,
                TransactionEventType.DELIVERY_CONFIRMED,
                'Buyer confirmed delivery',
                undefined,
                { userId, role: UserRole.BUYER },
                { from: TransactionStatus.SHIPPED, to: TransactionStatus.DELIVERED },
                manager,
              );
            }
          }
          const payoutReference = tx.payoutReference || `tt_payout_${tx.id.replace(/-/g, '')}`;
          const releaseOk = await this.atomicTransition(manager, {
            id: tx.id,
            from: TransactionStatus.DELIVERED,
            to: TransactionStatus.RELEASE_PENDING,
            set: {
              payoutReference,
              payoutStatus: tx.payoutStatus || 'REQUESTED',
              payoutProvider: tx.payoutProvider || this.activeSettlementProvider(),
            } as any,
          });
          const updated = await repo.findOne({ where: { id: tx.id }, relations: { buyer: true, seller: true } });
          if (!updated) throw new NotFoundException(`Transaction #${id} not found`);
          if (!releaseOk) {
            const s = normalizeStatus(updated.status);
            if (s === TransactionStatus.RELEASE_PENDING || s === TransactionStatus.RELEASED) {
              return updated;
            }
            if (s === TransactionStatus.DISPUTED) {
              throw new BadRequestException('Transaction is disputed');
            }
            throw new BadRequestException('Concurrent update detected');
          }
          if (releaseOk) {
            await this.recordEvent(
              tx.id,
              TransactionEventType.FUNDS_RELEASED,
              'Release approved',
              { custodian: this.activeSettlementProvider() },
              { userId, role: UserRole.BUYER },
              { from: TransactionStatus.DELIVERED, to: TransactionStatus.RELEASE_PENDING },
              manager,
            );
            await this.auditService.record({
              action: 'transaction.release.approved',
              actorUserId: userId,
              actorRole: UserRole.BUYER,
              targetType: 'transaction',
              targetId: tx.id,
              before: { status: TransactionStatus.DELIVERED },
              after: { status: TransactionStatus.RELEASE_PENDING },
              outcome: 'ok',
            }, manager);
          }
          return updated;
        });
        if (normalizeStatus(saved.status) === TransactionStatus.RELEASE_PENDING) {
          await this.outboxService.enqueue({
            type: 'payout.initiate',
            dedupeKey: saved.id,
            payload: { transactionId: saved.id, actorUserId: userId, actorRole: UserRole.BUYER },
          });
        }
        const full = await this.findOne(saved.id, userId);
        return { statusCode: 200, body: full };
      },
    });
  }

  async updateShipping(id: string, trackingId: string, userId: string, idempotencyKey?: string) {
    return this.idempotencyService.run({
      scope: `tx:ship:${userId}:${id}`,
      key: idempotencyKey,
      requestFingerprint: { id, trackingId },
      handler: async () => {
        const saved = await this.dataSource.transaction(async (manager) => {
          const { tx, repo } = await this.loadForUpdate(manager, id);
          if (tx.sellerId !== userId) {
            throw new ForbiddenException('Only seller can update shipping');
          }
          const normalized = normalizeStatus(tx.status);
          if (normalized === TransactionStatus.SHIPPED) {
            if (tx.trackingId && tx.trackingId !== trackingId) {
              throw new BadRequestException('Tracking ID already set');
            }
            return tx;
          }
          if (normalized === TransactionStatus.DISPUTED) {
            throw new BadRequestException('Transaction is disputed');
          }
          await this.disputesService.assertNoActiveDisputeForTransaction(tx.id);
          if (normalized !== TransactionStatus.FUNDED) {
            throw new BadRequestException('Transaction is not funded');
          }
          const ok = await this.atomicTransition(manager, {
            id: tx.id,
            from: TransactionStatus.FUNDED,
            to: TransactionStatus.SHIPPED,
            set: { trackingId } as any,
          });
          const updated = await repo.findOne({ where: { id: tx.id }, relations: { buyer: true, seller: true } });
          if (!updated) throw new NotFoundException(`Transaction #${id} not found`);
          if (!ok) {
            const s = normalizeStatus(updated.status);
            if (s === TransactionStatus.SHIPPED) {
              if (updated.trackingId && updated.trackingId !== trackingId) {
                throw new BadRequestException('Tracking ID already set');
              }
              return updated;
            }
            if (s === TransactionStatus.DISPUTED) {
              throw new BadRequestException('Transaction is disputed');
            }
            throw new BadRequestException('Concurrent update detected');
          }
          if (ok) {
            await this.recordEvent(
              updated.id,
              TransactionEventType.SHIPPING_UPDATED,
              'Seller marked order as shipped',
              { trackingId },
              { userId, role: UserRole.SELLER },
              { from: TransactionStatus.FUNDED, to: TransactionStatus.SHIPPED },
              manager,
            );
            await this.auditService.record({
              action: 'transaction.shipping.update',
              actorUserId: userId,
              actorRole: UserRole.SELLER,
              targetType: 'transaction',
              targetId: updated.id,
              before: { status: TransactionStatus.FUNDED },
              after: { status: TransactionStatus.SHIPPED, trackingId },
              outcome: 'ok',
            }, manager);
          }
          return updated;
        });
        const full = await this.findOne(saved.id, userId);
        return { statusCode: 200, body: full };
      },
    });
  }

  async openDispute(id: string, userId: string, idempotencyKey?: string) {
    return this.idempotencyService.run({
      scope: `tx:dispute:${userId}:${id}`,
      key: idempotencyKey,
      requestFingerprint: { id },
      handler: async () => {
        const saved = await this.dataSource.transaction(async (manager) => {
          const { tx, repo } = await this.loadForUpdate(manager, id);
          if (tx.buyerId !== userId && tx.sellerId !== userId) {
            throw new NotFoundException(`Transaction #${id} not found`);
          }
          const normalized = normalizeStatus(tx.status);
          if (normalized === TransactionStatus.DISPUTED) return tx;
          const actorRole = tx.buyerId === userId ? UserRole.BUYER : UserRole.SELLER;
          await this.disputesService.openForTransactionInManager(manager, tx.id, { userId, role: actorRole });

          const ok = await this.atomicTransition(manager, { id: tx.id, from: normalized, to: TransactionStatus.DISPUTED });
          const updated = await repo.findOne({ where: { id: tx.id }, relations: { buyer: true, seller: true } });
          if (!updated) throw new NotFoundException(`Transaction #${id} not found`);
          if (!ok) {
            const s = normalizeStatus(updated.status);
            if (s === TransactionStatus.DISPUTED) {
              return updated;
            }
            throw new BadRequestException('Concurrent update detected');
          }
          if (ok) {
            await this.recordEvent(
              updated.id,
              TransactionEventType.DISPUTE_OPENED,
              'Dispute opened (sensitive actions are frozen)',
              undefined,
              { userId, role: actorRole },
              { from: normalized, to: TransactionStatus.DISPUTED },
              manager,
            );
            await this.auditService.record({
              action: 'transaction.dispute.open',
              actorUserId: userId,
              actorRole,
              targetType: 'transaction',
              targetId: updated.id,
              before: { status: normalized },
              after: { status: TransactionStatus.DISPUTED },
              outcome: 'ok',
            }, manager);
          }
          return updated;
        });
        const full = await this.findOne(saved.id, userId);
        return { statusCode: 200, body: full };
      },
    });
  }

  async getEvents(id: string, userId: string, viewerRole?: string) {
    const tx = await this.findOne(id, userId, viewerRole);
    const events = await this.transactionEventsRepository.find({
      where: { transactionId: tx.id },
      order: { createdAt: 'ASC' },
    });
    if (events.length > 0) return events;

    const normalized = normalizeStatus(tx.status);
    const backfilled: TransactionEvent[] = [];
    backfilled.push(
      this.transactionEventsRepository.create({
        transactionId: tx.id,
        type: TransactionEventType.TRANSACTION_CREATED,
        title: this.eventTitle(TransactionEventType.TRANSACTION_CREATED),
        description: 'Transaction created',
        metadata: null,
        createdAt: tx.createdAt,
      }),
    );

    if (normalized === TransactionStatus.FUNDED) {
      backfilled.push(
        this.transactionEventsRepository.create({
          transactionId: tx.id,
          type: TransactionEventType.ESCROW_FUNDED,
          title: this.eventTitle(TransactionEventType.ESCROW_FUNDED),
          description: 'Funds secured in escrow',
          metadata: null,
          createdAt: tx.updatedAt ?? tx.createdAt,
        }),
      );
    }
    if (normalized === TransactionStatus.SHIPPED) {
      backfilled.push(
        this.transactionEventsRepository.create({
          transactionId: tx.id,
          type: TransactionEventType.SHIPPING_UPDATED,
          title: this.eventTitle(TransactionEventType.SHIPPING_UPDATED),
          description: tx.trackingId ? `Tracking: ${tx.trackingId}` : 'Shipping updated',
          metadata: tx.trackingId ? { trackingId: tx.trackingId } : null,
          createdAt: tx.updatedAt ?? tx.createdAt,
        }),
      );
    }
    if (normalized === TransactionStatus.DISPUTED) {
      backfilled.push(
        this.transactionEventsRepository.create({
          transactionId: tx.id,
          type: TransactionEventType.DISPUTE_OPENED,
          title: this.eventTitle(TransactionEventType.DISPUTE_OPENED),
          description: 'Dispute opened',
          metadata: null,
          createdAt: tx.updatedAt ?? tx.createdAt,
        }),
      );
    }
    if (normalized === TransactionStatus.RELEASE_PENDING) {
      backfilled.push(
        this.transactionEventsRepository.create({
          transactionId: tx.id,
          type: TransactionEventType.FUNDS_RELEASED,
          title: this.eventTitle(TransactionEventType.FUNDS_RELEASED),
          description: 'Release approved',
          metadata: null,
          createdAt: tx.updatedAt ?? tx.createdAt,
        }),
      );
    }
    if (normalized === TransactionStatus.RELEASED) {
      backfilled.push(
        this.transactionEventsRepository.create({
          transactionId: tx.id,
          type: TransactionEventType.FUNDS_RELEASED,
          title: this.eventTitle(TransactionEventType.FUNDS_RELEASED),
          description: 'Funds released to seller',
          metadata: null,
          createdAt: tx.updatedAt ?? tx.createdAt,
        }),
      );
    }
    return backfilled;
  }

  async listMessages(id: string, userId: string, role: string) {
    const tx = await this.transactionsRepository.findOne({ where: { id } });
    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.buyerId !== userId && tx.sellerId !== userId) {
      throw new NotFoundException('Transaction not found');
    }
    const rows = await this.transactionMessagesRepository.find({
      where: { transactionId: tx.id } as any,
      order: { createdAt: 'ASC' } as any,
      take: 300,
    });
    return rows.map((m) => ({
      id: m.id,
      transactionId: m.transactionId,
      senderRole: m.senderRole,
      body: m.body,
      text: m.body,
      createdAt: m.createdAt,
    }));
  }

  async adminListMessages(id: string) {
    const tx = await this.transactionsRepository.findOne({ where: { id }, select: { id: true } as any });
    if (!tx) throw new NotFoundException('Transaction not found');
    const rows = await this.transactionMessagesRepository.find({
      where: { transactionId: id } as any,
      order: { createdAt: 'ASC' } as any,
      take: 300,
    });
    return rows.map((m) => ({
      id: m.id,
      transactionId: m.transactionId,
      senderRole: m.senderRole,
      body: m.body,
      text: m.body,
      createdAt: m.createdAt,
    }));
  }

  async sendMessage(id: string, userId: string, role: string, text: string, idempotencyKey?: string) {
    const body = String(text || '').trim();
    if (!body) throw new BadRequestException('Message is empty');
    if (body.length > 2000) throw new BadRequestException('Message too long');

    return this.idempotencyService.run({
      scope: `tx:chat:${id}:${userId}`,
      key: idempotencyKey,
      requestFingerprint: { id, userId, bodyHash: createHash('sha256').update(body).digest('hex') },
      handler: async () => {
        const tx = await this.transactionsRepository.findOne({ where: { id } });
        if (!tx) throw new NotFoundException('Transaction not found');
        if (tx.buyerId !== userId && tx.sellerId !== userId) {
          throw new NotFoundException('Transaction not found');
        }
        const normalizedRole = String(role || '').toLowerCase();
        if (normalizedRole !== 'buyer' && normalizedRole !== 'seller') {
          throw new ForbiddenException('Not allowed');
        }
        const msgLike: DeepPartial<TransactionMessage> = {
          transactionId: tx.id,
          senderUserId: userId,
          senderRole: normalizedRole,
          body,
        };
        const msg = this.transactionMessagesRepository.create(msgLike);
        const saved = await this.transactionMessagesRepository.save(msg);
        await this.auditService.record({
          action: 'transaction.chat.message',
          actorUserId: userId,
          actorRole: normalizedRole === 'seller' ? UserRole.SELLER : UserRole.BUYER,
          targetType: 'transaction',
          targetId: tx.id,
          after: { messageId: saved.id },
          outcome: 'ok',
        });
        return { statusCode: 201, body: { id: saved.id } };
      },
    });
  }

  async getReceipt(id: string, userId: string, viewerRole?: string) {
    const tx = await this.findOne(id, userId, viewerRole);
    const secret = process.env.RECEIPT_SIGNING_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('Missing signing secret');
    }
    const normalized = normalizeStatus(tx.status);
    const receiptId = `TTY_${tx.id.slice(0, 8).toUpperCase()}`;
    const raw = [
      tx.id,
      String(tx.paymentReference || ''),
      String(tx.amount),
      String(normalized),
      String(tx.createdAt?.toISOString?.() ?? tx.createdAt),
    ].join('|');
    const receiptHash = createHmac('sha256', secret).update(raw).digest('hex');
    const ref = tx.paymentReference || '';
    const masked = ref ? `${ref.slice(0, 6)}…${ref.slice(-4)}` : null;
    return {
      receiptId,
      receiptHash,
      transactionId: tx.id,
      amount: tx.amount,
      status: normalized,
      paymentReferenceMasked: masked,
      createdAt: tx.createdAt,
      updatedAt: tx.updatedAt,
      buyer: tx.buyer,
      seller: tx.seller,
    };
  }

  async addDeliveryProof(
    id: string,
    userId: string,
    viewerRole: string | undefined,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    note?: string,
  ) {
    const tx = await this.findOne(id, userId, viewerRole);
    if (tx.sellerId !== userId) {
      throw new ForbiddenException('Only seller can upload proof');
    }
    const normalized = normalizeStatus(tx.status);
    if ([TransactionStatus.CREATED, TransactionStatus.REFUNDED].includes(normalized)) {
      throw new BadRequestException('Transaction is not eligible for proof upload');
    }

    const maxBytes = 5 * 1024 * 1024;
    if (!file) throw new BadRequestException('Missing file');
    const fileBuffer: Buffer | null =
      (file as any).buffer && Buffer.isBuffer((file as any).buffer)
        ? (file as any).buffer
        : typeof (file as any).path === 'string'
          ? fs.readFileSync((file as any).path)
          : null;
    if (!fileBuffer) throw new BadRequestException('Missing file');
    if (file.size > maxBytes) throw new BadRequestException('File too large');
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported file type');
    }

    const ext = file.mimetype === 'image/png' ? '.png' : file.mimetype === 'image/webp' ? '.webp' : '.jpg';
    const storedFileName = `${randomBytes(16).toString('hex')}${ext}`;
    const uploadDir = path.resolve(process.cwd(), 'uploads', 'tx-proofs', tx.id);
    fs.mkdirSync(uploadDir, { recursive: true });
    const fullPath = path.join(uploadDir, storedFileName);
    fs.writeFileSync(fullPath, fileBuffer, { flag: 'wx' });
    const sha256 = createHash('sha256').update(fileBuffer).digest('hex');

    const proof = this.transactionProofsRepository.create({
      transactionId: tx.id,
      uploadedByUserId: userId,
      storedFileName,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      sha256,
      note: note ? String(note).slice(0, 500) : null,
    });
    const saved = await this.transactionProofsRepository.save(proof);
    await this.recordEvent(tx.id, TransactionEventType.SHIPPING_UPDATED, 'Delivery proof uploaded', {
      proofId: saved.id,
      mimeType: saved.mimeType,
      size: saved.size,
      sha256,
    }, { userId, role: UserRole.SELLER }, { from: normalizeStatus(tx.status), to: normalizeStatus(tx.status) });
    await this.auditService.record({
      action: 'transaction.proof.upload',
      actorUserId: userId,
      actorRole: UserRole.SELLER,
      targetType: 'transaction_proof',
      targetId: saved.id,
      after: { transactionId: tx.id, sha256, mimeType: saved.mimeType, size: saved.size },
      outcome: 'ok',
    });
    return saved;
  }

  private async initiatePayoutIfNeeded(transactionId: string, actor?: { userId: string; role: string } | null) {
    const tx = await this.transactionsRepository.findOne({
      where: { id: transactionId },
      relations: { seller: true },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        sellerId: true,
        payoutReference: true,
        payoutStatus: true,
        payoutProvider: true,
        payoutProviderTransferCode: true,
        payoutInitiatedAt: true,
        payoutFailureReason: true,
        seller: {
          id: true,
          role: true,
          isVerified: true,
          bankVerifiedAt: true,
          paystackTransferRecipientCode: true,
        } as any,
      } as any,
    });
    if (!tx) return;
    if (normalizeStatus(tx.status) !== TransactionStatus.RELEASE_PENDING) return;

    const status = String(tx.payoutStatus || '').toUpperCase();
    if (status === 'INITIATED' || status === 'SENT') return;
    if (tx.payoutProviderTransferCode) return;

    const seller: any = (tx as any).seller;
    if (!seller || String(seller.role || '').toLowerCase() !== 'seller' || !seller.isVerified) {
      await this.transactionsRepository.update(tx.id, { payoutStatus: 'BLOCKED', payoutFailureReason: 'seller_not_verified' } as any);
      return;
    }
    const recipient = String(seller.paystackTransferRecipientCode || '').trim();
    if (!recipient || !seller.bankVerifiedAt) {
      await this.transactionsRepository.update(tx.id, { payoutStatus: 'BLOCKED', payoutFailureReason: 'missing_bank_account' } as any);
      return;
    }

    const reference = tx.payoutReference || `tt_payout_${tx.id.replace(/-/g, '')}`;
    if (!tx.payoutReference || !tx.payoutStatus) {
      await this.transactionsRepository.update(tx.id, { payoutReference: reference, payoutStatus: 'REQUESTED', payoutProvider: 'paystack' } as any);
    }

    const amountInKobo = Math.max(0, Math.round(Number(tx.amount) * 100));
    if (!Number.isFinite(amountInKobo) || amountInKobo <= 0) {
      await this.transactionsRepository.update(tx.id, { payoutStatus: 'BLOCKED', payoutFailureReason: 'invalid_amount' } as any);
      return;
    }

    try {
      const res = await this.paystackService.initiateTransfer({
        amountInKobo,
        recipientCode: recipient,
        reason: `TrustyTrade payout for ${tx.id}`,
        reference,
        currency: String(tx.currency || 'NGN'),
        idempotencyKey: reference,
      });
      const transferCode = res?.transfer_code ? String(res.transfer_code) : res?.id ? String(res.id) : null;
      await this.transactionsRepository.update(tx.id, {
        payoutStatus: 'INITIATED',
        payoutProvider: 'paystack',
        payoutProviderTransferCode: transferCode,
        payoutInitiatedAt: new Date(),
        payoutFailureReason: null,
      } as any);
      await this.recordEvent(
        tx.id,
        TransactionEventType.PAYOUT_INITIATED,
        'Payout initiated with provider',
        { provider: 'paystack', reference, amountInKobo, transferCode },
        actor ?? null,
        { from: TransactionStatus.RELEASE_PENDING, to: TransactionStatus.RELEASE_PENDING },
      );
      await this.auditService.record({
        action: 'payout.initiated',
        actorUserId: actor?.userId ?? null,
        actorRole: actor?.role ?? null,
        targetType: 'transaction',
        targetId: tx.id,
        after: { provider: 'paystack', reference, amountInKobo, transferCode },
        outcome: 'ok',
      });
    } catch (e: any) {
      const msg = String(e?.message || 'payout_failed').slice(0, 200);
      await this.transactionsRepository.update(tx.id, { payoutStatus: 'FAILED', payoutFailureReason: msg } as any);
      await this.recordEvent(
        tx.id,
        TransactionEventType.PAYOUT_FAILED,
        'Payout failed (seller can retry after updating bank details)',
        { provider: 'paystack', reference, error: msg },
        actor ?? null,
        { from: TransactionStatus.RELEASE_PENDING, to: TransactionStatus.RELEASE_PENDING },
      );
      await this.auditService.record({
        action: 'payout.failed',
        actorUserId: actor?.userId ?? null,
        actorRole: actor?.role ?? null,
        targetType: 'transaction',
        targetId: tx.id,
        after: { provider: 'paystack', reference, error: msg },
        outcome: 'failed',
      });
    }
  }

  async listDeliveryProofs(id: string, userId: string, viewerRole?: string) {
    const tx = await this.findOne(id, userId, viewerRole);
    const proofs = await this.transactionProofsRepository.find({
      where: { transactionId: tx.id },
      order: { createdAt: 'DESC' },
    });
    return proofs.map((p) => ({
      id: p.id,
      createdAt: p.createdAt,
      note: p.note,
      mimeType: p.mimeType,
      size: p.size,
      originalFileName: p.originalFileName,
    }));
  }

  async getProofFile(id: string, proofId: string, userId: string, viewerRole?: string) {
    const tx = await this.findOne(id, userId, viewerRole);
    const proof = await this.transactionProofsRepository.findOne({ where: { id: proofId, transactionId: tx.id } });
    if (!proof) throw new NotFoundException('Proof not found');
    const uploadDir = path.resolve(process.cwd(), 'uploads', 'tx-proofs', tx.id);
    const fullPath = path.join(uploadDir, proof.storedFileName);
    const rel = path.relative(uploadDir, fullPath);
    if (rel.startsWith('..') || path.isAbsolute(rel)) throw new NotFoundException('Proof not found');
    if (!fs.existsSync(fullPath)) throw new NotFoundException('Proof not found');
    return { fullPath, mimeType: proof.mimeType, originalFileName: proof.originalFileName };
  }
}
