import { AnchorService } from './anchor.service';

describe('AnchorService', () => {
  const makeService = (config: Record<string, string> = {}) =>
    new AnchorService(
      { get: (key: string) => config[key] } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

  it('validates Anchor webhook signatures using base64(hmac_sha1_hex)', () => {
    const secret = 'anchor-secret';
    const payload = Buffer.from('{"hello":"world"}');
    const signature = Buffer.from(
      require('crypto').createHmac('sha1', secret).update(payload).digest('hex'),
    ).toString('base64');

    const service = makeService({
      ANCHOR_WEBHOOK_TOKEN: secret,
      PAYMENT_PROVIDER: 'anchor',
      ANCHOR_API_KEY: 'test-key',
    });

    expect(service.isValidWebhookSignature(signature, payload)).toBe(true);
    expect(service.isValidWebhookSignature('bad-signature', payload)).toBe(false);
  });

  it('switches to anchor provider only when configured', () => {
    const disabled = makeService({ PAYMENT_PROVIDER: 'paystack' });
    const enabled = makeService({ PAYMENT_PROVIDER: 'anchor', ANCHOR_API_KEY: 'test-key' });

    expect(disabled.isEnabled()).toBe(false);
    expect(enabled.isEnabled()).toBe(true);
    expect(enabled.activeSettlementProvider()).toBe('anchor');
  });
});
