import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Init0001 implements MigrationInterface {
  name = 'Init0001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        email text NOT NULL UNIQUE,
        username text UNIQUE,
        "passwordHash" text NOT NULL,
        "fullName" text NOT NULL,
        phone text,
        role text NOT NULL DEFAULT 'buyer',
        "bankName" text,
        "accountNumber" text,
        "accountName" text,
        "isVerified" boolean NOT NULL DEFAULT false,
        "trustyTag" text,
        "trustyTagLower" text UNIQUE,
        "refreshTokenHash" text,
        "failedLoginCount" int NOT NULL DEFAULT 0,
        "lockedUntil" timestamptz,
        "lastLoginAt" timestamptz,
        "lastLoginIp" text,
        "lastLoginUserAgent" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS seller_onboarding_requests (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        status text NOT NULL DEFAULT 'PENDING',
        "desiredTrustyTag" text,
        "bankName" text,
        "accountNumber" text,
        "accountName" text,
        "reviewedByUserId" uuid,
        "reviewedAt" timestamptz,
        "reviewNote" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS seller_onboarding_requests_userid_idx ON seller_onboarding_requests ("userId")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        amount numeric(10,2) NOT NULL,
        currency text NOT NULL DEFAULT 'NGN',
        description text NOT NULL,
        status text NOT NULL DEFAULT 'CREATED',
        "paymentReference" text UNIQUE,
        "paystackAuthorizationUrl" text,
        "paystackAccessCode" text,
        "paystackInitializedAt" timestamptz,
        "paystackVerifiedAt" timestamptz,
        "paystackTransactionId" text,
        "paystackCustomerEmail" text,
        "trackingId" text,
        "buyerId" uuid NOT NULL,
        "sellerId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        version int NOT NULL DEFAULT 1
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS transactions_buyerid_idx ON transactions ("buyerId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS transactions_sellerid_idx ON transactions ("sellerId")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS transaction_events (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "transactionId" uuid NOT NULL,
        type text NOT NULL,
        title text NOT NULL,
        description text,
        metadata jsonb,
        "requestId" text,
        "actorUserId" text,
        "actorRole" text,
        "fromStatus" text,
        "toStatus" text,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS transaction_events_txid_idx ON transaction_events ("transactionId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS transaction_events_requestid_idx ON transaction_events ("requestId")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS transaction_proofs (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "transactionId" uuid NOT NULL,
        "uploadedByUserId" uuid NOT NULL,
        "storedFileName" text NOT NULL,
        "originalFileName" text NOT NULL,
        "mimeType" text NOT NULL,
        size int NOT NULL,
        sha256 text NOT NULL,
        note text,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS transaction_proofs_txid_idx ON transaction_proofs ("transactionId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS transaction_proofs_uploader_idx ON transaction_proofs ("uploadedByUserId")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "deviceId" text NOT NULL,
        "refreshTokenHash" text NOT NULL,
        ip text,
        "userAgent" text,
        "revokedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS auth_sessions_userid_idx ON auth_sessions ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS auth_sessions_deviceid_idx ON auth_sessions ("deviceId")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS idempotency_records (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        scope text NOT NULL,
        key text NOT NULL,
        "requestHash" text NOT NULL,
        "statusCode" int NOT NULL,
        "responseBody" text NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT idempotency_records_scope_key_unique UNIQUE (scope, key)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "requestId" text,
        action text NOT NULL,
        "actorUserId" text,
        "actorRole" text,
        "targetType" text,
        "targetId" text,
        ip text,
        "userAgent" text,
        before jsonb,
        after jsonb,
        outcome text,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs (action)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit_logs ("actorUserId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS audit_logs_target_idx ON audit_logs ("targetType","targetId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS audit_logs_requestid_idx ON audit_logs ("requestId")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS paystack_webhook_events (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "providerEventId" text NOT NULL UNIQUE,
        reference text,
        "eventType" text,
        "receivedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS paystack_webhook_events_reference_idx ON paystack_webhook_events (reference)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS paystack_webhook_events');
    await queryRunner.query('DROP TABLE IF EXISTS audit_logs');
    await queryRunner.query('DROP TABLE IF EXISTS idempotency_records');
    await queryRunner.query('DROP TABLE IF EXISTS auth_sessions');
    await queryRunner.query('DROP TABLE IF EXISTS transaction_proofs');
    await queryRunner.query('DROP TABLE IF EXISTS transaction_events');
    await queryRunner.query('DROP TABLE IF EXISTS transactions');
    await queryRunner.query('DROP TABLE IF EXISTS seller_onboarding_requests');
    await queryRunner.query('DROP TABLE IF EXISTS users');
  }
}
