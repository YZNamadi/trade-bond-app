import { DataSource } from 'typeorm';
import { User } from '../users/user.entity';
import { SellerOnboardingRequest } from '../users/seller-onboarding.entity';
import { Transaction } from '../transactions/transaction.entity';
import { TransactionEvent } from '../transactions/transaction-event.entity';
import { TransactionProof } from '../transactions/transaction-proof.entity';
import { TransactionMessage } from '../transactions/transaction-message.entity';
import { AuthSession } from '../auth/auth-session.entity';
import { IdempotencyRecord } from '../common/idempotency.entity';
import { AuditLog } from '../common/audit-log.entity';
import { PaystackWebhookEvent } from '../paystack/paystack-webhook-event.entity';
import { Dispute } from '../disputes/dispute.entity';
import { DisputeEvidence } from '../disputes/dispute-evidence.entity';
import { DisputeEvent } from '../disputes/dispute-event.entity';
import { OutboxJob } from '../common/outbox-job.entity';
import { LedgerEntry } from '../common/ledger-entry.entity';
import { Init0001 } from './migrations/0001-init';
import { BankAndPayout0002 } from './migrations/0002-bank-and-payout';
import { Disputes0003 } from './migrations/0003-disputes';
import { OutboxAndLedger0004 } from './migrations/0004-outbox-and-ledger';
import { TransactionMessages0005 } from './migrations/0005-transaction-messages';
import { IntegrityAndIdentity0006 } from './migrations/0006-integrity-and-identity';
import { AnchorMoneyFoundation0007 } from './migrations/0007-anchor-money-foundation';
import { MoneyAccount } from '../money/money-account.entity';
import { MoneyCounterparty } from '../money/money-counterparty.entity';
import { MoneyMovement } from '../money/money-movement.entity';
import { ProviderEvent } from '../money/provider-event.entity';
import { ReconciliationRun } from '../money/reconciliation-run.entity';

const type = (process.env.DB_TYPE || 'sqlite').toLowerCase();
const isProd = process.env.NODE_ENV === 'production';
const synchronize = process.env.TYPEORM_SYNCHRONIZE === 'true' && !isProd;

const entities = [
  User,
  SellerOnboardingRequest,
  Transaction,
  TransactionEvent,
  TransactionProof,
  TransactionMessage,
  Dispute,
  DisputeEvidence,
  DisputeEvent,
  AuthSession,
  IdempotencyRecord,
  AuditLog,
  OutboxJob,
  LedgerEntry,
  PaystackWebhookEvent,
  MoneyAccount,
  MoneyCounterparty,
  MoneyMovement,
  ProviderEvent,
  ReconciliationRun,
];

export const AppDataSource = new DataSource(
  type === 'postgres'
    ? {
        type: 'postgres',
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT || 5432),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'trustytrade',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        entities,
        migrations: [Init0001, BankAndPayout0002, Disputes0003, OutboxAndLedger0004, TransactionMessages0005, IntegrityAndIdentity0006, AnchorMoneyFoundation0007],
        synchronize,
      }
    : {
        type: 'sqlite',
        database: process.env.SQLITE_PATH || 'db.sqlite',
        entities,
        migrations: [],
        synchronize,
      },
);
