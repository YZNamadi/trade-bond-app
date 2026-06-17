import { SetMetadata } from '@nestjs/common';

export type RateLimitPolicyName =
  | 'auth_login'
  | 'auth_register'
  | 'tx_mutation'
  | 'dispute_action'
  | 'dispute_evidence'
  | 'admin_action'
  | 'bank_account_link'
  | 'paystack_webhook'
  | 'paystack_banks'
  | 'default';

export const RATE_LIMIT_POLICY = 'rate_limit_policy';

export function RateLimit(policy: RateLimitPolicyName) {
  return SetMetadata(RATE_LIMIT_POLICY, policy);
}
