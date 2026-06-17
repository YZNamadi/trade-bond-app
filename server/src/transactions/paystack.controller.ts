import { Controller, Get, Headers, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PaystackService } from '../paystack/paystack.service';
import { TransactionsService } from './transactions.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaystackWebhookEvent } from '../paystack/paystack-webhook-event.entity';
import { createHash } from 'crypto';
import { RateLimit } from '../rate-limit/rate-limit.decorator';
import { logInfo, logWarn } from '../observability/logger';
import { AuthGuard } from '@nestjs/passport';
import { OutboxService } from '../common/outbox.service';
import { Transaction } from './transaction.entity';

@Controller('paystack')
export class PaystackController {
  constructor(
    private paystackService: PaystackService,
    private transactionsService: TransactionsService,
    private outboxService: OutboxService,
    @InjectRepository(PaystackWebhookEvent)
    private webhookEventsRepository: Repository<PaystackWebhookEvent>,
    @InjectRepository(Transaction)
    private txRepo: Repository<Transaction>,
  ) {}

  @Get('banks')
  @UseGuards(AuthGuard('jwt'))
  @RateLimit('paystack_banks')
  async banks() {
    const banks = await this.paystackService.listBanks('NGN');
    const seen = new Set<string>();
    const out: Array<{ name: string; code: string; slug: string | null }> = [];
    for (const b of banks || []) {
      const code = String(b?.code || '').trim();
      const name = String(b?.name || '').trim();
      if (!code || !name) continue;
      if (seen.has(code)) continue;
      seen.add(code);
      out.push({
        name,
        code,
        slug: b?.slug ? String(b.slug) : null,
      });
    }
    return out;
  }

  @Post('webhook')
  @RateLimit('paystack_webhook')
  async webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Res() res: Response,
    @Headers('x-paystack-signature') signature?: string,
  ) {
    const rawBody = (req as any).rawBody as Buffer | undefined;
    const valid = this.paystackService.isValidWebhookSignature(signature, rawBody);
    if (!valid) {
      logWarn('paystack.webhook.invalid_signature', { ip: (req as any).ip || (req.socket as any)?.remoteAddress || null });
      res.status(401).send('invalid signature');
      return;
    }

    let payload: any;
    try {
      payload = rawBody ? JSON.parse(rawBody.toString('utf8')) : req.body;
    } catch {
      res.status(400).send('invalid body');
      return;
    }

    const event = payload?.event as string | undefined;
    const reference =
      (payload?.data?.reference as string | undefined) ||
      (payload?.data?.transaction?.reference as string | undefined) ||
      undefined;
    const providerIdRaw = payload?.data?.id;
    const providerId = typeof providerIdRaw === 'string' || typeof providerIdRaw === 'number' ? String(providerIdRaw) : null;
    const fallback = createHash('sha256').update(rawBody || Buffer.from(JSON.stringify(payload || {}))).digest('hex');
    const providerEventId = `${event || 'unknown'}:${providerId || fallback}`;
    let inserted = true;
    try {
      await this.webhookEventsRepository.insert({
        providerEventId,
        reference: reference || null,
        eventType: event || null,
      });
    } catch {
      inserted = false;
    }
    if (!inserted) {
      logInfo('paystack.webhook.deduped', { providerEventId, event, reference });
      res.status(200).json({ ok: true, deduped: true });
      return;
    }

    res.status(200).json({ ok: true });

    try {
      if (event === 'charge.success' && reference) {
        logInfo('paystack.webhook.charge_success', { providerEventId, reference });
        await this.outboxService.enqueue({
          type: 'payment.verify',
          dedupeKey: `paystack:${reference}`,
          payload: { reference },
        });
      }

      if ((event === 'transfer.success' || event === 'transfer.failed') && reference) {
        const tx = await this.txRepo.findOne({ where: { payoutReference: reference } as any, select: { id: true } as any });
        if (tx) {
          await this.outboxService.enqueue({
            type: 'payout.verify',
            dedupeKey: tx.id,
            payload: { transactionId: tx.id },
          });
        }
      }

      if (event === 'refund.processed' || event === 'refund.failed' || event === 'refund.needs-attention') {
        const refundId = payload?.data?.id;
        const refundIdStr = typeof refundId === 'string' || typeof refundId === 'number' ? String(refundId) : null;
        let tx: { id: string } | null = null;
        if (refundIdStr) {
          tx = await this.txRepo.findOne({ where: { refundProviderRefundId: refundIdStr } as any, select: { id: true } as any });
        }
        if (!tx && reference) {
          tx = await this.txRepo.findOne({ where: { paymentReference: reference } as any, select: { id: true } as any });
        }
        if (tx) {
          await this.outboxService.enqueue({
            type: 'refund.verify',
            dedupeKey: tx.id,
            payload: { transactionId: tx.id },
          });
        }
      }
    } catch {
      return;
    }

    return;
  }
}
