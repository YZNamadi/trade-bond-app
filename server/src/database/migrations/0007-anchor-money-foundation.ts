import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AnchorMoneyFoundation0007 implements MigrationInterface {
  name = 'AnchorMoneyFoundation0007';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS money_accounts (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        provider text NOT NULL,
        scope text NOT NULL,
        kind text NOT NULL,
        status text NOT NULL DEFAULT 'PENDING',
        currency text NOT NULL,
        "userId" uuid,
        "transactionId" uuid,
        "displayName" text,
        "providerCustomerId" text,
        "providerAccountId" text,
        "providerSubAccountId" text,
        "providerReservedAccountId" text,
        "providerAccountNumberId" text,
        "providerVirtualNubanId" text,
        "accountNumberMasked" text,
        capabilities jsonb,
        metadata jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS money_accounts_provider_account_uq ON money_accounts (provider, "providerAccountId") WHERE "providerAccountId" IS NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS money_accounts_provider_subaccount_uq ON money_accounts (provider, "providerSubAccountId") WHERE "providerSubAccountId" IS NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS money_accounts_provider_reserved_uq ON money_accounts (provider, "providerReservedAccountId") WHERE "providerReservedAccountId" IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS money_accounts_scope_kind_idx ON money_accounts (scope, kind)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS money_counterparties (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        provider text NOT NULL,
        kind text NOT NULL,
        status text NOT NULL DEFAULT 'PENDING',
        "userId" uuid,
        "displayName" text,
        "providerCustomerId" text,
        "providerCounterpartyId" text,
        "providerDestinationAccountId" text,
        "bankCode" text,
        "bankName" text,
        "accountName" text,
        "accountNumberLast4" text,
        metadata jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS money_counterparties_provider_counterparty_uq ON money_counterparties (provider, "providerCounterpartyId") WHERE "providerCounterpartyId" IS NOT NULL`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS money_movements (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        provider text NOT NULL,
        kind text NOT NULL,
        status text NOT NULL,
        currency text NOT NULL,
        "amountMinor" int NOT NULL,
        "transactionId" uuid,
        "sourceAccountId" uuid,
        "destinationAccountId" uuid,
        "counterpartyId" uuid,
        reference text NOT NULL,
        "providerObjectType" text,
        "providerObjectId" text,
        "providerTransferId" text,
        reason text,
        "failureReason" text,
        "requestedAt" timestamptz,
        "completedAt" timestamptz,
        "failedAt" timestamptz,
        "reversedAt" timestamptz,
        "providerPayload" jsonb,
        metadata jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS money_movements_provider_reference_uq ON money_movements (provider, reference)`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS money_movements_provider_object_uq ON money_movements (provider, "providerObjectType", "providerObjectId") WHERE "providerObjectId" IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS money_movements_tx_status_idx ON money_movements ("transactionId", status)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS provider_events (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        provider text NOT NULL,
        "providerEventId" text NOT NULL,
        "eventType" text NOT NULL,
        "resourceType" text,
        "resourceId" text,
        signature text,
        "signatureVerified" boolean NOT NULL DEFAULT false,
        "dedupeHash" text,
        "receivedAt" timestamptz,
        "processedAt" timestamptz,
        "processingError" text,
        payload jsonb,
        included jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS provider_events_provider_event_uq ON provider_events (provider, "providerEventId")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reconciliation_runs (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        provider text NOT NULL,
        "runType" text NOT NULL,
        status text NOT NULL,
        "startedAt" timestamptz,
        "completedAt" timestamptz,
        "findingsCount" int NOT NULL DEFAULT 0,
        "mismatchAmountMinor" int NOT NULL DEFAULT 0,
        cursor text,
        error text,
        summary jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS reconciliation_runs_provider_type_created_idx ON reconciliation_runs (provider, "runType", "createdAt")`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'money_accounts_user_fk') THEN
          ALTER TABLE money_accounts ADD CONSTRAINT money_accounts_user_fk
          FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'money_accounts_transaction_fk') THEN
          ALTER TABLE money_accounts ADD CONSTRAINT money_accounts_transaction_fk
          FOREIGN KEY ("transactionId") REFERENCES transactions(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'money_counterparties_user_fk') THEN
          ALTER TABLE money_counterparties ADD CONSTRAINT money_counterparties_user_fk
          FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'money_movements_transaction_fk') THEN
          ALTER TABLE money_movements ADD CONSTRAINT money_movements_transaction_fk
          FOREIGN KEY ("transactionId") REFERENCES transactions(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'money_movements_source_account_fk') THEN
          ALTER TABLE money_movements ADD CONSTRAINT money_movements_source_account_fk
          FOREIGN KEY ("sourceAccountId") REFERENCES money_accounts(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'money_movements_destination_account_fk') THEN
          ALTER TABLE money_movements ADD CONSTRAINT money_movements_destination_account_fk
          FOREIGN KEY ("destinationAccountId") REFERENCES money_accounts(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'money_movements_counterparty_fk') THEN
          ALTER TABLE money_movements ADD CONSTRAINT money_movements_counterparty_fk
          FOREIGN KEY ("counterpartyId") REFERENCES money_counterparties(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE money_movements DROP CONSTRAINT IF EXISTS money_movements_counterparty_fk`);
    await queryRunner.query(`ALTER TABLE money_movements DROP CONSTRAINT IF EXISTS money_movements_destination_account_fk`);
    await queryRunner.query(`ALTER TABLE money_movements DROP CONSTRAINT IF EXISTS money_movements_source_account_fk`);
    await queryRunner.query(`ALTER TABLE money_movements DROP CONSTRAINT IF EXISTS money_movements_transaction_fk`);
    await queryRunner.query(`ALTER TABLE money_counterparties DROP CONSTRAINT IF EXISTS money_counterparties_user_fk`);
    await queryRunner.query(`ALTER TABLE money_accounts DROP CONSTRAINT IF EXISTS money_accounts_transaction_fk`);
    await queryRunner.query(`ALTER TABLE money_accounts DROP CONSTRAINT IF EXISTS money_accounts_user_fk`);
    await queryRunner.query(`DROP TABLE IF EXISTS reconciliation_runs`);
    await queryRunner.query(`DROP TABLE IF EXISTS provider_events`);
    await queryRunner.query(`DROP TABLE IF EXISTS money_movements`);
    await queryRunner.query(`DROP TABLE IF EXISTS money_counterparties`);
    await queryRunner.query(`DROP TABLE IF EXISTS money_accounts`);
  }
}
