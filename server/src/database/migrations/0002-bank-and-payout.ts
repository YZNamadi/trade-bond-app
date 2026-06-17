import type { MigrationInterface, QueryRunner } from 'typeorm';

export class BankAndPayout0002 implements MigrationInterface {
  name = 'BankAndPayout0002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "bankCode" text`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "bankAccountLast4" text`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "bankVerifiedAt" timestamptz`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "paystackTransferRecipientCode" text`);

    await queryRunner.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "payoutReference" text`);
    await queryRunner.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "payoutStatus" text`);
    await queryRunner.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "payoutProvider" text`);
    await queryRunner.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "payoutProviderTransferCode" text`);
    await queryRunner.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "payoutInitiatedAt" timestamptz`);
    await queryRunner.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "payoutFailureReason" text`);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS transactions_payoutreference_uq ON transactions ("payoutReference") WHERE "payoutReference" IS NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS transactions_payoutreference_uq`);

    await queryRunner.query(`ALTER TABLE transactions DROP COLUMN IF EXISTS "payoutFailureReason"`);
    await queryRunner.query(`ALTER TABLE transactions DROP COLUMN IF EXISTS "payoutInitiatedAt"`);
    await queryRunner.query(`ALTER TABLE transactions DROP COLUMN IF EXISTS "payoutProviderTransferCode"`);
    await queryRunner.query(`ALTER TABLE transactions DROP COLUMN IF EXISTS "payoutProvider"`);
    await queryRunner.query(`ALTER TABLE transactions DROP COLUMN IF EXISTS "payoutStatus"`);
    await queryRunner.query(`ALTER TABLE transactions DROP COLUMN IF EXISTS "payoutReference"`);

    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS "paystackTransferRecipientCode"`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS "bankVerifiedAt"`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS "bankAccountLast4"`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS "bankCode"`);
  }
}

