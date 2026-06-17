import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitService } from './rate-limit.service';
import { RATE_LIMIT_POLICY, type RateLimitPolicyName } from './rate-limit.decorator';
import { PaystackService } from '../paystack/paystack.service';

type Policy = { windowMs: number; limit: number; key: (req: any) => string; bypass?: (req: any) => Promise<boolean> | boolean };

function ipOf(req: any) {
  const xf = (req.headers?.['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
  return (xf || req.socket?.remoteAddress || 'unknown').toString();
}

function deviceOf(req: any) {
  return (req.cookies?.device_id as string | undefined) || 'no-device';
}

function userOf(req: any) {
  return (req.user?.userId as string | undefined) || 'anonymous';
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rateLimitService: RateLimitService,
    private paystackService: PaystackService,
  ) {}

  private policies(): Record<RateLimitPolicyName, Policy> {
    return {
      default: {
        windowMs: 60_000,
        limit: Number(process.env.RL_DEFAULT_PER_MIN || 120),
        key: (req) => `ip:${ipOf(req)}`,
      },
      auth_login: {
        windowMs: 60_000,
        limit: 5,
        key: (req) => `auth_login:${ipOf(req)}:${deviceOf(req)}`,
      },
      auth_register: {
        windowMs: 60_000,
        limit: 3,
        key: (req) => `auth_register:${ipOf(req)}`,
      },
      tx_mutation: {
        windowMs: 60_000,
        limit: 20,
        key: (req) => `tx_mut:${userOf(req)}`,
      },
      dispute_action: {
        windowMs: 60_000,
        limit: 20,
        key: (req) => `dispute_act:${userOf(req)}`,
      },
      dispute_evidence: {
        windowMs: 60_000,
        limit: 10,
        key: (req) => `dispute_ev:${userOf(req)}`,
      },
      admin_action: {
        windowMs: 60_000,
        limit: 60,
        key: (req) => `admin:${userOf(req)}`,
      },
      bank_account_link: {
        windowMs: 60_000,
        limit: 6,
        key: (req) => `bank_link:${userOf(req)}:${ipOf(req)}`,
      },
      paystack_webhook: {
        windowMs: 60_000,
        limit: 10,
        key: (req) => `paystack_webhook:${ipOf(req)}`,
        bypass: async (req) => {
          const configured = (process.env.PAYSTACK_WEBHOOK_IP_ALLOWLIST || '').split(',').map((s) => s.trim()).filter(Boolean);
          const allowlist = configured.length > 0 ? configured : ['52.31.139.75', '52.49.173.169', '52.214.14.220'];
          if (!allowlist.includes(ipOf(req))) {
            return false;
          }
          const signature = req.headers?.['x-paystack-signature'] as string | undefined;
          const rawBody = req.rawBody as Buffer | undefined;
          return this.paystackService.isValidWebhookSignature(signature, rawBody);
        },
      },
      paystack_banks: {
        windowMs: 60_000,
        limit: 60,
        key: (req) => `paystack_banks:${userOf(req)}`,
      },
    };
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const req = context.switchToHttp().getRequest<any>();
    const res = context.switchToHttp().getResponse<any>();
    const handler = context.getHandler();
    const klass = context.getClass();
    const policyName =
      (this.reflector.get<RateLimitPolicyName>(RATE_LIMIT_POLICY, handler) ||
        this.reflector.get<RateLimitPolicyName>(RATE_LIMIT_POLICY, klass) ||
        'default') as RateLimitPolicyName;

    const policy = this.policies()[policyName] || this.policies().default;

    if (policyName === 'paystack_webhook') {
      const ok = await policy.bypass?.(req);
      if (!ok) {
        res.status(401).json({ message: 'Invalid webhook signature' });
        return false;
      }
    }

    const decision = await this.rateLimitService.slidingWindow(policy.key(req), policy.windowMs, policy.limit);
    res.setHeader('x-ratelimit-limit', String(policy.limit));
    res.setHeader('x-ratelimit-remaining', String(Math.max(0, policy.limit - decision.totalHits)));
    res.setHeader('x-ratelimit-reset', String(decision.resetMs));
    if (!decision.allowed) {
      res.status(429).json({ message: 'Too many requests' });
      return false;
    }
    return true;
  }
}
