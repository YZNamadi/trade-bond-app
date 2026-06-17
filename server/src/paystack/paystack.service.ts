import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

@Injectable()
export class PaystackService {
  constructor(private configService: ConfigService) {}

  private secretKey() {
    return this.configService.get<string>('PAYSTACK_SECRET_KEY') || '';
  }

  private timeoutMs() {
    return Number(this.configService.get<string>('PAYSTACK_TIMEOUT_MS') || 10000);
  }

  private async fetchJson(url: string, init: RequestInit, opts?: { retries?: number }) {
    const timeoutMs = this.timeoutMs();
    const retries = Math.max(0, Number(opts?.retries ?? 1));
    let attempt = 0;
    while (true) {
      attempt += 1;
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { ...init, signal: controller.signal });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = (data as any)?.message || `Paystack request failed: ${res.status}`;
          if (attempt <= retries && res.status >= 500) {
            continue;
          }
          throw new Error(msg);
        }
        return data;
      } catch (e: any) {
        if (attempt <= retries && (e?.name === 'AbortError' || e?.code === 'ECONNRESET')) {
          continue;
        }
        throw e;
      } finally {
        clearTimeout(t);
      }
    }
  }

  async initializeTransaction(email: string, amount: number, reference: string) {
    const secret = this.secretKey();
    if (!secret) {
      throw new Error('PAYSTACK_SECRET_KEY is required');
    }

    const data = await this.fetchJson(
      'https://api.paystack.co/transaction/initialize',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount,
          reference,
        }),
      },
      { retries: 1 },
    );
    return (data as any).data;
  }

  async verifyTransaction(reference: string) {
    const secret = this.secretKey();
    if (!secret) {
      throw new Error('PAYSTACK_SECRET_KEY is required');
    }

    return this.fetchJson(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secret}`,
        },
      },
      { retries: 1 },
    );
  }

  async listBanks(currency: 'NGN' | string = 'NGN') {
    const secret = this.secretKey();
    if (!secret) {
      throw new Error('PAYSTACK_SECRET_KEY is required');
    }
    const res = await this.fetchJson(
      `https://api.paystack.co/bank?currency=${encodeURIComponent(currency)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secret}`,
        },
      },
      { retries: 1 },
    );
    return (res as any)?.data ?? [];
  }

  async resolveAccountNumber(accountNumber: string, bankCode: string) {
    const secret = this.secretKey();
    if (!secret) {
      throw new Error('PAYSTACK_SECRET_KEY is required');
    }
    const res = await this.fetchJson(
      `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secret}`,
        },
      },
      { retries: 1 },
    );
    return (res as any)?.data;
  }

  async createTransferRecipient(input: { name: string; accountNumber: string; bankCode: string; currency?: 'NGN' | string; idempotencyKey?: string }) {
    const secret = this.secretKey();
    if (!secret) {
      throw new Error('PAYSTACK_SECRET_KEY is required');
    }
    const currency = input.currency || 'NGN';
    const res = await this.fetchJson(
      'https://api.paystack.co/transferrecipient',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json',
          ...(input.idempotencyKey ? { 'Idempotency-Key': input.idempotencyKey } : {}),
        } as any,
        body: JSON.stringify({
          type: 'nuban',
          name: input.name,
          account_number: input.accountNumber,
          bank_code: input.bankCode,
          currency,
        }),
      },
      { retries: 1 },
    );
    return (res as any)?.data;
  }

  async initiateTransfer(input: {
    amountInKobo: number;
    recipientCode: string;
    reason?: string;
    reference: string;
    currency?: 'NGN' | string;
    idempotencyKey?: string;
  }) {
    const secret = this.secretKey();
    if (!secret) {
      throw new Error('PAYSTACK_SECRET_KEY is required');
    }
    const res = await this.fetchJson(
      'https://api.paystack.co/transfer',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json',
          ...(input.idempotencyKey ? { 'Idempotency-Key': input.idempotencyKey } : {}),
        } as any,
        body: JSON.stringify({
          source: 'balance',
          amount: input.amountInKobo,
          recipient: input.recipientCode,
          reason: input.reason || undefined,
          reference: input.reference,
          currency: input.currency || 'NGN',
        }),
      },
      { retries: 1 },
    );
    return (res as any)?.data;
  }

  async verifyTransfer(reference: string) {
    const secret = this.secretKey();
    if (!secret) {
      throw new Error('PAYSTACK_SECRET_KEY is required');
    }
    return this.fetchJson(
      `https://api.paystack.co/transfer/verify/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secret}`,
        },
      },
      { retries: 1 },
    );
  }

  async refundTransaction(input: { transaction: string; amountInKobo?: number; idempotencyKey?: string }) {
    const secret = this.secretKey();
    if (!secret) {
      throw new Error('PAYSTACK_SECRET_KEY is required');
    }
    const res = await this.fetchJson(
      'https://api.paystack.co/refund',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json',
          ...(input.idempotencyKey ? { 'Idempotency-Key': input.idempotencyKey } : {}),
        } as any,
        body: JSON.stringify({
          transaction: input.transaction,
          amount: input.amountInKobo ?? undefined,
        }),
      },
      { retries: 1 },
    );
    return (res as any)?.data;
  }

  async fetchRefund(id: string | number) {
    const secret = this.secretKey();
    if (!secret) {
      throw new Error('PAYSTACK_SECRET_KEY is required');
    }
    const rid = String(id).trim();
    return this.fetchJson(
      `https://api.paystack.co/refund/${encodeURIComponent(rid)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secret}`,
        },
      },
      { retries: 1 },
    );
  }

  async listRefunds(params?: { transaction?: string; currency?: string; page?: number; perPage?: number }) {
    const secret = this.secretKey();
    if (!secret) {
      throw new Error('PAYSTACK_SECRET_KEY is required');
    }
    const q = new URLSearchParams();
    if (params?.transaction) q.set('transaction', String(params.transaction));
    if (params?.currency) q.set('currency', String(params.currency));
    if (params?.page) q.set('page', String(params.page));
    if (params?.perPage) q.set('perPage', String(params.perPage));
    const suffix = q.toString() ? `?${q.toString()}` : '';
    return this.fetchJson(
      `https://api.paystack.co/refund${suffix}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secret}`,
        },
      },
      { retries: 1 },
    );
  }

  isValidWebhookSignature(signature: string | undefined, rawBody: Buffer | string | undefined) {
    const secret = this.secretKey();
    if (!secret) return false;
    if (!signature || !rawBody) return false;
    const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
    const hash = createHmac('sha512', secret).update(payload).digest('hex');
    return hash === signature;
  }
}
