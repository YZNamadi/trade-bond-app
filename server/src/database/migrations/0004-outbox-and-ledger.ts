import type { MigrationInterface, QueryRunner } from 'typeorm';

export class OutboxAndLedger0004 implements MigrationInterface {
  name = 'OutboxAndLedger0004';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS outbox_jobs (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        type text NOT NULL,
        "dedupeKey" text,
        payload jsonb NOT NULL,
        status text NOT NULL DEFAULT 'PENDING',
        attempts int NOT NULL DEFAULT 0,
        "maxAttempts" int NOT NULL DEFAULT 10,
        "nextRunAt" timestamptz NOT NULL DEFAULT now(),
        "lockedAt" timestamptz,
        "lockedBy" text,
        "lastError" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS outbox_jobs_status_nextrun_idx ON outbox_jobs (status, "nextRunAt")`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS outbox_jobs_type_dedupe_uq ON outbox_jobs (type, "dedupeKey") WHERE "dedupeKey" IS NOT NULL`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ledger_entries (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "transactionId" uuid NOT NULL,
        "eventType" text NOT NULL,
        "amountMinor" int NOT NULL,
        currency text NOT NULL,
        provider text,
        "providerRef" text,
        metadata jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS ledger_entries_transaction_created_idx ON ledger_entries ("transactionId","createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS ledger_entries_eventtype_idx ON ledger_entries ("eventType")`);

    await queryRunner.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "refundStatus" text`);
    await queryRunner.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "refundProvider" text`);
    await queryRunner.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "refundProviderRefundId" text`);
    await queryRunner.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "refundInitiatedAt" timestamptz`);
    await queryRunner.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "refundProcessedAt" timestamptz`);
    await queryRunner.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "refundFailureReason" text`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE transactions DROP COLUMN IF EXISTS "refundFailureReason"`);
    await queryRunner.query(`ALTER TABLE transactions DROP COLUMN IF EXISTS "refundProcessedAt"`);
    await queryRunner.query(`ALTER TABLE transactions DROP COLUMN IF EXISTS "refundInitiatedAt"`);
    await queryRunner.query(`ALTER TABLE transactions DROP COLUMN IF EXISTS "refundProviderRefundId"`);
    await queryRunner.query(`ALTER TABLE transactions DROP COLUMN IF EXISTS "refundProvider"`);
    await queryRunner.query(`ALTER TABLE transactions DROP COLUMN IF EXISTS "refundStatus"`);
    await queryRunner.query('DROP TABLE IF EXISTS ledger_entries');
    await queryRunner.query('DROP TABLE IF EXISTS outbox_jobs');
  }
}

