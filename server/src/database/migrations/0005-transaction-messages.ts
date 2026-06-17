import type { MigrationInterface, QueryRunner } from 'typeorm';

export class TransactionMessages0005 implements MigrationInterface {
  name = 'TransactionMessages0005';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS transaction_messages (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "transactionId" uuid NOT NULL,
        "senderUserId" uuid NOT NULL,
        "senderRole" text NOT NULL,
        body text NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS transaction_messages_tx_created_idx ON transaction_messages ("transactionId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS transaction_messages_sender_idx ON transaction_messages ("senderUserId")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS transaction_messages');
  }
}

