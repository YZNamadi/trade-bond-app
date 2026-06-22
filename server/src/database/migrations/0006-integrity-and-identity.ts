import type { MigrationInterface, QueryRunner } from 'typeorm';

export class IntegrityAndIdentity0006 implements MigrationInterface {
  name = 'IntegrityAndIdentity0006';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE users SET email = LOWER(BTRIM(email)) WHERE email IS NOT NULL`);
    await queryRunner.query(`UPDATE users SET username = LOWER(BTRIM(username)) WHERE username IS NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uq ON users (LOWER(email))`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_uq ON users (LOWER(username)) WHERE username IS NOT NULL`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'seller_onboarding_requests_user_fk') THEN
          ALTER TABLE seller_onboarding_requests
            ADD CONSTRAINT seller_onboarding_requests_user_fk
            FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'seller_onboarding_requests_reviewed_by_fk') THEN
          ALTER TABLE seller_onboarding_requests
            ADD CONSTRAINT seller_onboarding_requests_reviewed_by_fk
            FOREIGN KEY ("reviewedByUserId") REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_buyer_fk') THEN
          ALTER TABLE transactions
            ADD CONSTRAINT transactions_buyer_fk
            FOREIGN KEY ("buyerId") REFERENCES users(id) ON DELETE RESTRICT;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_seller_fk') THEN
          ALTER TABLE transactions
            ADD CONSTRAINT transactions_seller_fk
            FOREIGN KEY ("sellerId") REFERENCES users(id) ON DELETE RESTRICT;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transaction_events_transaction_fk') THEN
          ALTER TABLE transaction_events
            ADD CONSTRAINT transaction_events_transaction_fk
            FOREIGN KEY ("transactionId") REFERENCES transactions(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transaction_proofs_transaction_fk') THEN
          ALTER TABLE transaction_proofs
            ADD CONSTRAINT transaction_proofs_transaction_fk
            FOREIGN KEY ("transactionId") REFERENCES transactions(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transaction_proofs_uploaded_by_fk') THEN
          ALTER TABLE transaction_proofs
            ADD CONSTRAINT transaction_proofs_uploaded_by_fk
            FOREIGN KEY ("uploadedByUserId") REFERENCES users(id) ON DELETE RESTRICT;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auth_sessions_user_fk') THEN
          ALTER TABLE auth_sessions
            ADD CONSTRAINT auth_sessions_user_fk
            FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'disputes_transaction_fk') THEN
          ALTER TABLE disputes
            ADD CONSTRAINT disputes_transaction_fk
            FOREIGN KEY ("transactionId") REFERENCES transactions(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'disputes_buyer_fk') THEN
          ALTER TABLE disputes
            ADD CONSTRAINT disputes_buyer_fk
            FOREIGN KEY ("buyerId") REFERENCES users(id) ON DELETE RESTRICT;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'disputes_seller_fk') THEN
          ALTER TABLE disputes
            ADD CONSTRAINT disputes_seller_fk
            FOREIGN KEY ("sellerId") REFERENCES users(id) ON DELETE RESTRICT;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'disputes_last_actor_fk') THEN
          ALTER TABLE disputes
            ADD CONSTRAINT disputes_last_actor_fk
            FOREIGN KEY ("lastActorUserId") REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dispute_evidence_dispute_fk') THEN
          ALTER TABLE dispute_evidence
            ADD CONSTRAINT dispute_evidence_dispute_fk
            FOREIGN KEY ("disputeId") REFERENCES disputes(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dispute_evidence_transaction_fk') THEN
          ALTER TABLE dispute_evidence
            ADD CONSTRAINT dispute_evidence_transaction_fk
            FOREIGN KEY ("transactionId") REFERENCES transactions(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dispute_evidence_uploaded_by_fk') THEN
          ALTER TABLE dispute_evidence
            ADD CONSTRAINT dispute_evidence_uploaded_by_fk
            FOREIGN KEY ("uploadedByUserId") REFERENCES users(id) ON DELETE RESTRICT;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dispute_events_dispute_fk') THEN
          ALTER TABLE dispute_events
            ADD CONSTRAINT dispute_events_dispute_fk
            FOREIGN KEY ("disputeId") REFERENCES disputes(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transaction_messages_transaction_fk') THEN
          ALTER TABLE transaction_messages
            ADD CONSTRAINT transaction_messages_transaction_fk
            FOREIGN KEY ("transactionId") REFERENCES transactions(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transaction_messages_sender_fk') THEN
          ALTER TABLE transaction_messages
            ADD CONSTRAINT transaction_messages_sender_fk
            FOREIGN KEY ("senderUserId") REFERENCES users(id) ON DELETE RESTRICT;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ledger_entries_transaction_fk') THEN
          ALTER TABLE ledger_entries
            ADD CONSTRAINT ledger_entries_transaction_fk
            FOREIGN KEY ("transactionId") REFERENCES transactions(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS users_username_lower_uq`);
    await queryRunner.query(`DROP INDEX IF EXISTS users_email_lower_uq`);
    await queryRunner.query(`ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_transaction_fk`);
    await queryRunner.query(`ALTER TABLE transaction_messages DROP CONSTRAINT IF EXISTS transaction_messages_sender_fk`);
    await queryRunner.query(`ALTER TABLE transaction_messages DROP CONSTRAINT IF EXISTS transaction_messages_transaction_fk`);
    await queryRunner.query(`ALTER TABLE dispute_events DROP CONSTRAINT IF EXISTS dispute_events_dispute_fk`);
    await queryRunner.query(`ALTER TABLE dispute_evidence DROP CONSTRAINT IF EXISTS dispute_evidence_uploaded_by_fk`);
    await queryRunner.query(`ALTER TABLE dispute_evidence DROP CONSTRAINT IF EXISTS dispute_evidence_transaction_fk`);
    await queryRunner.query(`ALTER TABLE dispute_evidence DROP CONSTRAINT IF EXISTS dispute_evidence_dispute_fk`);
    await queryRunner.query(`ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_last_actor_fk`);
    await queryRunner.query(`ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_seller_fk`);
    await queryRunner.query(`ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_buyer_fk`);
    await queryRunner.query(`ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_transaction_fk`);
    await queryRunner.query(`ALTER TABLE auth_sessions DROP CONSTRAINT IF EXISTS auth_sessions_user_fk`);
    await queryRunner.query(`ALTER TABLE transaction_proofs DROP CONSTRAINT IF EXISTS transaction_proofs_uploaded_by_fk`);
    await queryRunner.query(`ALTER TABLE transaction_proofs DROP CONSTRAINT IF EXISTS transaction_proofs_transaction_fk`);
    await queryRunner.query(`ALTER TABLE transaction_events DROP CONSTRAINT IF EXISTS transaction_events_transaction_fk`);
    await queryRunner.query(`ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_seller_fk`);
    await queryRunner.query(`ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_buyer_fk`);
    await queryRunner.query(`ALTER TABLE seller_onboarding_requests DROP CONSTRAINT IF EXISTS seller_onboarding_requests_reviewed_by_fk`);
    await queryRunner.query(`ALTER TABLE seller_onboarding_requests DROP CONSTRAINT IF EXISTS seller_onboarding_requests_user_fk`);
  }
}
