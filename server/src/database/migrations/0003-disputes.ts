import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Disputes0003 implements MigrationInterface {
  name = 'Disputes0003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS disputes (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "transactionId" uuid NOT NULL UNIQUE,
        "buyerId" uuid NOT NULL,
        "sellerId" uuid NOT NULL,
        status text NOT NULL DEFAULT 'OPENED',
        "openedAt" timestamptz,
        "closedAt" timestamptz,
        "lastActorUserId" uuid,
        "lastActorRole" text,
        "transactionSnapshot" jsonb,
        decision jsonb,
        version int NOT NULL DEFAULT 1,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS disputes_buyerid_idx ON disputes ("buyerId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS disputes_sellerid_idx ON disputes ("sellerId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS disputes_status_idx ON disputes (status)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS dispute_events (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "disputeId" uuid NOT NULL,
        seq int NOT NULL,
        type text NOT NULL,
        "fromStatus" text,
        "toStatus" text,
        "actorUserId" uuid,
        "actorRole" text,
        "requestId" text,
        ip text,
        "deviceId" text,
        "userAgent" text,
        before jsonb,
        after jsonb,
        metadata jsonb,
        "prevHash" text,
        hash text NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT dispute_events_dispute_seq_uq UNIQUE ("disputeId", seq)
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS dispute_events_dispute_created_idx ON dispute_events ("disputeId","createdAt")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS dispute_evidence (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "disputeId" uuid NOT NULL,
        "transactionId" uuid NOT NULL,
        "uploadedByUserId" uuid NOT NULL,
        "uploadedByRole" text NOT NULL,
        "storedFileName" text NOT NULL,
        "originalFileName" text NOT NULL,
        "mimeType" text NOT NULL,
        size int NOT NULL,
        sha256 text NOT NULL,
        encryption text NOT NULL,
        "encryptionIvB64" text NOT NULL,
        "encryptionTagB64" text NOT NULL,
        note text,
        annotations jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS dispute_evidence_dispute_created_idx ON dispute_evidence ("disputeId","createdAt")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS dispute_evidence');
    await queryRunner.query('DROP TABLE IF EXISTS dispute_events');
    await queryRunner.query('DROP TABLE IF EXISTS disputes');
  }
}

