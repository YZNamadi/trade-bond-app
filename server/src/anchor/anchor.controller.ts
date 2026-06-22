import { Controller, Headers, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { RateLimit } from '../rate-limit/rate-limit.decorator';
import { AnchorService } from './anchor.service';
import { TransactionsService } from '../transactions/transactions.service';
import { logInfo, logWarn } from '../observability/logger';

@Controller('anchor')
export class AnchorController {
  constructor(
    private anchorService: AnchorService,
    private transactionsService: TransactionsService,
  ) {}

  @Post('webhook')
  @RateLimit('paystack_webhook')
  async webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Res() res: Response,
    @Headers('x-anchor-signature') signature?: string,
  ) {
    const rawBody = (req as any).rawBody as Buffer | undefined;
    const valid = this.anchorService.isValidWebhookSignature(signature, rawBody);
    if (!valid) {
      logWarn('anchor.webhook.invalid_signature', { ip: (req as any).ip || (req.socket as any)?.remoteAddress || null });
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

    const data = payload?.data || {};
    const eventType = String(data?.type || '').trim();
    const providerEventId = String(data?.id || '').trim();
    if (!providerEventId || !eventType) {
      res.status(400).send('invalid event');
      return;
    }

    const relationship = data?.relationships || {};
    const payInData = relationship?.payIn?.data || null;
    const included = Array.isArray(payload?.included) ? payload.included : [];
    const resourceType = payInData?.type ? String(payInData.type) : null;
    const resourceId = payInData?.id ? String(payInData.id) : null;

    const saved = await this.anchorService.saveProviderEvent({
      providerEventId,
      eventType,
      resourceType,
      resourceId,
      signature: signature || null,
      signatureVerified: true,
      payload: payload,
      included,
    }).catch(() => null);

    if (saved && (saved as any).processedAt) {
      logInfo('anchor.webhook.deduped', { providerEventId, eventType });
      res.status(200).json({ ok: true, deduped: true });
      return;
    }

    res.status(200).json({ ok: true });

    try {
      if (eventType === 'payin.received') {
        let payin = included.find((item: any) => String(item?.type || '') === 'PayIn') || null;
        if (!payin && resourceId) {
          const fetched = await this.anchorService.fetchPayIn(resourceId);
          payin = fetched?.data || null;
        }
        if (payin?.attributes?.reference) {
          await this.transactionsService.markFundedFromAnchorPayin({
            reference: String(payin.attributes.reference),
            payinId: String(payin.id || resourceId || ''),
            amountMinor: Number(payin.attributes.amount || 0),
            currency: String(payin.attributes.currency || 'NGN'),
            paidAt: payin.attributes.paidAt ? new Date(String(payin.attributes.paidAt)) : null,
            providerPayload: payin,
          });
        }
      }

      if (eventType === 'payment.received' || eventType === 'payment.settled') {
        const payment = data?.attributes?.payment || null;
        const paymentId = String(payment?.paymentId || '').trim();
        const paymentReference = String(payment?.paymentReference || '').trim();
        if (eventType === 'payment.settled' && paymentReference) {
          await this.transactionsService.markFundedFromAnchorPayin({
            reference: paymentReference,
            payinId: paymentId,
            amountMinor: Number(payment?.amount || 0),
            currency: String(payment?.currency || 'NGN'),
            paidAt: payment?.paidAt ? new Date(String(payment.paidAt)) : null,
            providerPayload: payment,
          });
        }
      }

      if (
        eventType === 'nip.transfer.successful'
        || eventType === 'nip.transfer.failed'
        || eventType === 'nip.transfer.reversed'
      ) {
        await this.transactionsService.reconcileAnchorTransferWebhook({
          eventType,
          payload,
        });
      }
    } catch {
      return;
    }
  }
}
