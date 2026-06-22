import type { MigrationInterface, QueryRunner } from 'typeorm';

export class TransactionAmountMinorUnits0008 implements MigrationInterface {
  name = 'TransactionAmountMinorUnits0008';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'transactions'
            AND column_name = 'amount'
            AND data_type = 'numeric'
        ) THEN
          ALTER TABLE transactions ADD COLUMN IF NOT EXISTS amount_next integer;
          UPDATE transactions
            SET amount_next = ROUND(CAST(amount AS numeric) * 100)::integer
            WHERE amount_next IS NULL;
          ALTER TABLE transactions ALTER COLUMN amount_next SET NOT NULL;
          ALTER TABLE transactions DROP COLUMN amount;
          ALTER TABLE transactions RENAME COLUMN amount_next TO amount;
        END IF;
      END $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'transactions'
            AND column_name = 'amount'
            AND data_type = 'integer'
        ) THEN
          ALTER TABLE transactions ADD COLUMN IF NOT EXISTS amount_prev numeric(10,2);
          UPDATE transactions
            SET amount_prev = ROUND(CAST(amount AS numeric), 0) / 100.0
            WHERE amount_prev IS NULL;
          ALTER TABLE transactions ALTER COLUMN amount_prev SET NOT NULL;
          ALTER TABLE transactions DROP COLUMN amount;
          ALTER TABLE transactions RENAME COLUMN amount_prev TO amount;
        END IF;
      END $$;
    `);
  }
}
