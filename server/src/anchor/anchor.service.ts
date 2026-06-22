import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';
import { MoneyAccount } from '../money/money-account.entity';
import { MoneyCounterparty } from '../money/money-counterparty.entity';
import { MoneyMovement } from '../money/money-movement.entity';
import { ProviderEvent } from '../money/provider-event.entity';
import { MoneyService } from '../money/money.service';

type AnchorResource = {
  id: string;
  type: string;
  attributes?: Record<string, any>;
  relationships?: Record<string, any>;
};

@Injectable()
export class AnchorService {
  constructor(
    private configService: ConfigService,
    private moneyService: MoneyService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(MoneyAccount)
    private moneyAccountsRepository: Repository<MoneyAccount>,
    @InjectRepository(MoneyCounterparty)
    private moneyCounterpartiesRepository: Repository<MoneyCounterparty>,
    @InjectRepository(MoneyMovement)
    private moneyMovementsRepository: Repository<MoneyMovement>,
    @InjectRepository(ProviderEvent)
    private providerEventsRepository: Repository<ProviderEvent>,
  ) {}

  isEnabled() {
    return this.activeProvider() === 'anchor' && !!this.apiKey();
  }

  activeProvider() {
    return String(
      this.configService.get<string>('PAYMENT_PROVIDER')
        || this.configService.get<string>('MONEY_PROVIDER')
        || 'paystack',
    ).trim().toLowerCase();
  }

  activeSettlementProvider() {
    return String(
      this.configService.get<string>('SETTLEMENT_PROVIDER')
        || this.activeProvider(),
    ).trim().toLowerCase();
  }

  collectionMode() {
    return String(
      this.configService.get<string>('ANCHOR_COLLECTION_MODE') || 'pay_with_transfer',
    ).trim().toLowerCase();
  }

  private apiKey() {
    return String(this.configService.get<string>('ANCHOR_API_KEY') || '').trim();
  }

  private webhookToken() {
    return String(this.configService.get<string>('ANCHOR_WEBHOOK_TOKEN') || '').trim();
  }

  private timeoutMs() {
    return Number(this.configService.get<string>('ANCHOR_TIMEOUT_MS') || 15000);
  }

  private baseUrl() {
    const configured = String(this.configService.get<string>('ANCHOR_BASE_URL') || '').trim();
    if (configured) return configured.replace(/\/+$/, '');
    const env = String(this.configService.get<string>('ANCHOR_ENV') || 'sandbox').trim().toLowerCase();
    return env === 'live' ? 'https://api.getanchor.co' : 'https://api.sandbox.getanchor.co';
  }

  payoutSourceAccountId() {
    return String(this.configService.get<string>('ANCHOR_PAYOUT_ACCOUNT_ID') || '').trim();
  }

  payoutSourceAccountType() {
    const raw = String(this.configService.get<string>('ANCHOR_PAYOUT_ACCOUNT_TYPE') || 'DepositAccount').trim();
    return raw || 'DepositAccount';
  }

  private async fetchJson<T = any>(url: string, init: RequestInit, opts?: { retries?: number; idempotencyKey?: string }) {
    const timeoutMs = this.timeoutMs();
    const retries = Math.max(0, Number(opts?.retries ?? 1));
    let attempt = 0;
    while (true) {
      attempt += 1;
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          ...init,
          headers: {
            accept: 'application/json',
            'x-anchor-key': this.apiKey(),
            ...(opts?.idempotencyKey ? { 'Idempotency-Key': opts.idempotencyKey } : {}),
            ...(init.headers || {}),
          },
          signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = (data as any)?.errors?.[0]?.detail
            || (data as any)?.message
            || `Anchor request failed: ${res.status}`;
          if (attempt <= retries && res.status >= 500) continue;
          throw new Error(msg);
        }
        return data as T;
      } catch (e: any) {
        if (attempt <= retries && (e?.name === 'AbortError' || e?.code === 'ECONNRESET')) continue;
        throw e;
      } finally {
        clearTimeout(t);
      }
    }
  }

  private async getJson<T = any>(path: string) {
    if (!this.apiKey()) throw new Error('ANCHOR_API_KEY is required');
    return this.fetchJson<T>(`${this.baseUrl()}${path}`, { method: 'GET' }, { retries: 1 });
  }

  private async postJson<T = any>(path: string, body: Record<string, unknown>, idempotencyKey?: string) {
    if (!this.apiKey()) throw new Error('ANCHOR_API_KEY is required');
    return this.fetchJson<T>(
      `${this.baseUrl()}${path}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      { retries: 1, idempotencyKey },
    );
  }

  isValidWebhookSignature(signature: string | undefined, rawBody: Buffer | string | undefined) {
    const token = this.webhookToken();
    if (!token || !signature || !rawBody) return false;
    const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
    const hexDigest = createHmac('sha1', token).update(payload).digest('hex');
    const expected = Buffer.from(hexDigest).toString('base64');
    return expected === signature;
  }

  async listBanks() {
    const res = await this.getJson<{ data?: AnchorResource[] }>('/api/v1/banks');
    return res?.data ?? [];
  }

  async verifyAccountNumber(bankCode: string, accountNumber: string) {
    return this.getJson<{ data?: AnchorResource }>(
      `/api/v1/payments/verify-account/${encodeURIComponent(bankCode)}/${encodeURIComponent(accountNumber)}`,
    );
  }

  private splitName(fullName: string) {
    const clean = String(fullName || '').trim().replace(/\s+/g, ' ');
    const parts = clean ? clean.split(' ') : [];
    return {
      firstName: parts[0] || 'Trusty',
      lastName: parts.slice(1).join(' ') || 'User',
    };
  }

  private buildDefaultAddress() {
    return {
      addressLine_1: String(this.configService.get<string>('ANCHOR_DEFAULT_ADDRESS_LINE1') || '1 TrustyTrade Street'),
      addressLine_2: String(this.configService.get<string>('ANCHOR_DEFAULT_ADDRESS_LINE2') || 'Victoria Island'),
      city: String(this.configService.get<string>('ANCHOR_DEFAULT_CITY') || 'Lagos'),
      state: String(this.configService.get<string>('ANCHOR_DEFAULT_STATE') || 'Lagos'),
      postalCode: String(this.configService.get<string>('ANCHOR_DEFAULT_POSTAL_CODE') || '101241'),
      country: String(this.configService.get<string>('ANCHOR_DEFAULT_COUNTRY') || 'NG'),
    };
  }

  private async findExistingCustomerId(userId: string) {
    const allAccounts = await this.moneyAccountsRepository.find({
      where: { provider: 'anchor', userId } as any,
      order: { createdAt: 'DESC' } as any,
      take: 20,
    });
    const fromAccount = allAccounts.find((item) => item.providerCustomerId)?.providerCustomerId;
    if (fromAccount) return fromAccount;
    const counterparty = await this.moneyCounterpartiesRepository.findOne({
      where: { provider: 'anchor', userId } as any,
      order: { createdAt: 'DESC' } as any,
    });
    return counterparty?.providerCustomerId || null;
  }

  async ensureCustomer(userOrId: User | string) {
    const user = typeof userOrId === 'string'
      ? await this.usersRepository.findOne({ where: { id: userOrId } as any })
      : userOrId;
    if (!user) throw new Error('User not found');

    const existingCustomerId = await this.findExistingCustomerId(user.id);
    if (existingCustomerId) {
      return { customerId: existingCustomerId, customerType: 'IndividualCustomer' as const };
    }

    const name = this.splitName(user.fullName || user.email || 'TrustyTrade User');
    const payload = {
      data: {
        type: 'IndividualCustomer',
        attributes: {
          fullName: name,
          address: this.buildDefaultAddress(),
          email: String(user.email || '').trim().toLowerCase(),
          phoneNumber: String(user.phone || this.configService.get<string>('ANCHOR_DEFAULT_PHONE') || '07000000000'),
          metadata: {
            trustyTradeUserId: user.id,
            trustyTradeRole: user.role,
          },
        },
      },
    };
    const res = await this.postJson<{ data?: AnchorResource }>('/api/v1/customers', payload, `tt_anchor_customer_${user.id}`);
    const customer = res?.data;
    if (!customer?.id) throw new Error('Anchor customer creation failed');
    return { customerId: customer.id, customerType: String(customer.type || 'IndividualCustomer') as 'IndividualCustomer' };
  }

  async createReservedAccount(customerId: string, customerType: 'IndividualCustomer' | 'BusinessCustomer' = 'IndividualCustomer') {
    const provider = String(this.configService.get<string>('ANCHOR_RESERVED_ACCOUNT_PROVIDER') || 'ninepsb').trim();
    const payload = {
      data: {
        type: 'ReservedAccount',
        attributes: { provider },
        relationships: {
          customer: {
            data: {
              id: customerId,
              type: customerType,
            },
          },
        },
      },
    };
    const res = await this.postJson<{ data?: AnchorResource }>('/pay/reserved-account', payload, `tt_anchor_ra_${customerId}`);
    return res?.data;
  }

  async ensureReservedAccount(userOrId: User | string) {
    const user = typeof userOrId === 'string'
      ? await this.usersRepository.findOne({ where: { id: userOrId } as any })
      : userOrId;
    if (!user) throw new Error('User not found');

    const existing = await this.moneyAccountsRepository.findOne({
      where: {
        provider: 'anchor',
        userId: user.id,
        kind: 'RESERVED_ACCOUNT',
      } as any,
      order: { createdAt: 'DESC' } as any,
    });
    if (existing?.providerReservedAccountId && existing.accountNumberMasked) return existing;

    const customer = await this.ensureCustomer(user);
    const reserved = await this.createReservedAccount(customer.customerId, customer.customerType);
    if (!reserved?.id) throw new Error('Anchor reserved account creation failed');
    const bank = reserved.attributes?.bank ?? {};
    const accountNumber = String(reserved.attributes?.accountNumber || '').trim();
    const saved = this.moneyAccountsRepository.create({
      provider: 'anchor',
      scope: 'USER',
      kind: 'RESERVED_ACCOUNT',
      status: 'ACTIVE',
      currency: 'NGN',
      userId: user.id,
      displayName: String(reserved.attributes?.accountName || user.fullName || user.email),
      providerCustomerId: customer.customerId,
      providerReservedAccountId: reserved.id,
      accountNumberMasked: accountNumber ? `******${accountNumber.slice(-4)}` : null,
      metadata: {
        bankName: bank?.name ? String(bank.name) : null,
        provider: bank?.provider ? String(bank.provider) : null,
        accountNumber,
      },
    });
    return this.moneyAccountsRepository.save(saved);
  }

  async createPayWithTransfer(transaction: Transaction, buyer: User) {
    const customerReference = `tt_tx_${transaction.id.replace(/-/g, '')}`;
    const payload = {
      data: {
        type: 'PayWithTransfer',
        attributes: {
          reference: customerReference,
          customer: {
            fullName: String(buyer.fullName || buyer.email || 'TrustyTrade Buyer'),
            email: String(buyer.email || '').trim().toLowerCase(),
          },
          expiryTime: Number(this.configService.get<string>('ANCHOR_PWT_EXPIRY_SECONDS') || 3600),
          provider: String(this.configService.get<string>('ANCHOR_PWT_PROVIDER') || 'ninepsb'),
          amount: Math.max(0, Math.round(Number(transaction.amount) * 100)),
          metadata: {
            trustyTradeTransactionId: transaction.id,
            buyerId: buyer.id,
            sellerId: transaction.sellerId,
          },
        },
      },
    };
    const res = await this.postJson<{ data?: AnchorResource }>(
      '/pay/pay-with-transfer',
      payload,
      `tt_anchor_pwt_${transaction.id}`,
    );
    if (!res?.data?.id) throw new Error('Anchor pay-with-transfer creation failed');
    return res.data;
  }

  async initializeCollection(transaction: Transaction, buyer: User) {
    await this.moneyService.ensureEscrowBucket(transaction);
    if (this.collectionMode() !== 'pay_with_transfer') {
      const reserved = await this.ensureReservedAccount(buyer);
      const meta = reserved.metadata as Record<string, any> | null;
      return {
        provider: 'anchor',
        collectionStrategy: 'RESERVED_ACCOUNT',
        reference: transaction.paymentReference,
        accountNumber: meta?.accountNumber ?? null,
        accountName: reserved.displayName,
        bankName: meta?.bankName ?? null,
        reservedAccountId: reserved.providerReservedAccountId,
      };
    }

    const pwt = await this.createPayWithTransfer(transaction, buyer);
    return {
      provider: 'anchor',
      collectionStrategy: 'PAY_WITH_TRANSFER',
      payWithTransferId: pwt.id,
      reference: String(pwt.attributes?.reference || ''),
      customerReference: String(pwt.attributes?.customerReference || ''),
      accountNumber: String(pwt.attributes?.accountNumber || ''),
      accountName: String(pwt.attributes?.accountName || ''),
      bankName: String(pwt.attributes?.bank?.name || ''),
      expiresAt: pwt.attributes?.expiry?.expiryDate || null,
      raw: pwt,
    };
  }

  async fetchPayIn(payinId: string) {
    return this.getJson<{ data?: AnchorResource }>(`/pay/payin/${encodeURIComponent(payinId)}`);
  }

  async fetchPayment(paymentId: string) {
    return this.getJson<{ data?: AnchorResource }>(`/api/v1/payments/${encodeURIComponent(paymentId)}`);
  }

  async createCounterparty(input: {
    userId: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    providerCustomerId?: string | null;
  }) {
    const payload = {
      data: {
        type: 'CounterParty',
        attributes: {
          bankCode: input.bankCode,
          accountName: input.accountName,
          accountNumber: input.accountNumber,
          verifyName: true,
        },
      },
    };
    const res = await this.postJson<{ data?: AnchorResource }>(
      '/api/v1/counterparties',
      payload,
      `tt_anchor_cp_${input.userId}_${input.bankCode}_${input.accountNumber}`,
    );
    const cp = res?.data;
    if (!cp?.id) throw new Error('Anchor counterparty creation failed');
    const saved = this.moneyCounterpartiesRepository.create({
      provider: 'anchor',
      kind: 'BANK_ACCOUNT',
      status: 'VERIFIED',
      userId: input.userId,
      displayName: String(cp.attributes?.accountName || input.accountName),
      providerCustomerId: input.providerCustomerId ?? null,
      providerCounterpartyId: cp.id,
      bankCode: String(cp.attributes?.bank?.nipCode || input.bankCode),
      bankName: String(cp.attributes?.bank?.name || ''),
      accountName: String(cp.attributes?.accountName || input.accountName),
      accountNumberLast4: String(cp.attributes?.accountNumber || input.accountNumber).slice(-4),
      metadata: cp.attributes || null,
    });
    return this.moneyCounterpartiesRepository.save(saved);
  }

  async ensureCounterpartyForUser(userId: string) {
    const existing = await this.moneyCounterpartiesRepository.findOne({
      where: { provider: 'anchor', userId } as any,
      order: { createdAt: 'DESC' } as any,
    });
    if (existing?.providerCounterpartyId) return existing;
    const user = await this.usersRepository.findOne({ where: { id: userId } as any });
    if (!user) throw new Error('User not found');
    const accountNumber = String(user.accountNumber || '').replace(/[^\d]/g, '');
    const bankCode = String(user.bankCode || '').trim();
    const accountName = String(user.accountName || user.fullName || '').trim();
    if (!accountNumber || !bankCode || !accountName) {
      throw new Error('Missing bank account details');
    }
    const customer = await this.ensureCustomer(user);
    return this.createCounterparty({
      userId,
      bankCode,
      accountNumber,
      accountName,
      providerCustomerId: customer.customerId,
    });
  }

  async initiateNipTransfer(input: {
    reference: string;
    amountMinor: number;
    currency: string;
    reason: string;
    counterpartyId: string;
  }) {
    const sourceAccountId = this.payoutSourceAccountId();
    if (!sourceAccountId) throw new Error('ANCHOR_PAYOUT_ACCOUNT_ID is required');
    const payload = {
      data: {
        type: 'NIPTransfer',
        attributes: {
          amount: input.amountMinor,
          currency: input.currency,
          reason: input.reason,
          reference: input.reference,
        },
        relationships: {
          account: {
            data: {
              id: sourceAccountId,
              type: this.payoutSourceAccountType(),
            },
          },
          counterParty: {
            data: {
              id: input.counterpartyId,
              type: 'CounterParty',
            },
          },
        },
      },
    };
    return this.postJson<{ data?: AnchorResource }>(
      '/api/v1/transfers',
      payload,
      input.reference,
    );
  }

  async verifyTransfer(transferId: string) {
    return this.getJson<{ data?: AnchorResource }>(`/api/v1/transfers/verify/${encodeURIComponent(transferId)}`);
  }

  async upsertMovementFromWebhook(input: {
    transactionId: string;
    kind: 'PAYIN' | 'PAYOUT' | 'REFUND';
    reference: string;
    providerObjectId: string;
    providerObjectType: string;
    amountMinor: number;
    currency: string;
    status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
    metadata?: Record<string, unknown> | null;
  }) {
    const existing = await this.moneyMovementsRepository.findOne({
      where: {
        provider: 'anchor',
        providerObjectType: input.providerObjectType,
        providerObjectId: input.providerObjectId,
      } as any,
    });
    if (existing) {
      await this.moneyMovementsRepository.update(existing.id, {
        status: input.status,
        amountMinor: input.amountMinor,
        currency: input.currency,
        reference: input.reference,
        completedAt: input.status === 'COMPLETED' ? new Date() : existing.completedAt,
        failedAt: input.status === 'FAILED' ? new Date() : existing.failedAt,
        reversedAt: input.status === 'REVERSED' ? new Date() : existing.reversedAt,
        metadata: { ...(existing.metadata || {}), ...(input.metadata || {}) },
      } as any);
      return this.moneyMovementsRepository.findOne({ where: { id: existing.id } as any });
    }
    const row = this.moneyMovementsRepository.create({
      provider: 'anchor',
      kind: input.kind,
      status: input.status,
      currency: input.currency,
      amountMinor: input.amountMinor,
      transactionId: input.transactionId,
      sourceAccountId: null,
      destinationAccountId: null,
      counterpartyId: null,
      reference: input.reference,
      providerObjectType: input.providerObjectType,
      providerObjectId: input.providerObjectId,
      providerTransferId: input.kind === 'PAYIN' ? null : input.providerObjectId,
      reason: null,
      failureReason: null,
      requestedAt: new Date(),
      completedAt: input.status === 'COMPLETED' ? new Date() : null,
      failedAt: input.status === 'FAILED' ? new Date() : null,
      reversedAt: input.status === 'REVERSED' ? new Date() : null,
      providerPayload: null,
      metadata: input.metadata ?? null,
    });
    return this.moneyMovementsRepository.save(row);
  }

  async saveProviderEvent(input: {
    providerEventId: string;
    eventType: string;
    resourceType?: string | null;
    resourceId?: string | null;
    signature?: string | null;
    signatureVerified: boolean;
    payload: Record<string, unknown>;
    included?: Record<string, unknown>[] | null;
  }) {
    const existing = await this.providerEventsRepository.findOne({
      where: { provider: 'anchor', providerEventId: input.providerEventId } as any,
    });
    if (existing) return existing;
    return this.moneyService.recordProviderEvent({
      provider: 'anchor',
      providerEventId: input.providerEventId,
      eventType: input.eventType,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
      signature: input.signature ?? null,
      signatureVerified: input.signatureVerified,
      dedupeHash: input.providerEventId,
      payload: input.payload,
      included: input.included ?? null,
    });
  }
}
