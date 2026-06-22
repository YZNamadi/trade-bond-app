import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type MoneyCounterpartyKind = 'BANK_ACCOUNT' | 'INTERNAL_ACCOUNT';
export type MoneyCounterpartyStatus = 'PENDING' | 'VERIFIED' | 'FAILED' | 'DISABLED';

@Entity('money_counterparties')
@Index(['provider', 'providerCounterpartyId'], { unique: true })
export class MoneyCounterparty {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  provider: string;

  @Column({ type: 'text' })
  kind: MoneyCounterpartyKind;

  @Column({ type: 'text', default: 'PENDING' })
  status: MoneyCounterpartyStatus;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'text', nullable: true })
  displayName: string | null;

  @Column({ type: 'text', nullable: true })
  providerCustomerId: string | null;

  @Column({ type: 'text', nullable: true })
  providerCounterpartyId: string | null;

  @Column({ type: 'text', nullable: true })
  providerDestinationAccountId: string | null;

  @Column({ type: 'text', nullable: true })
  bankCode: string | null;

  @Column({ type: 'text', nullable: true })
  bankName: string | null;

  @Column({ type: 'text', nullable: true })
  accountName: string | null;

  @Column({ type: 'text', nullable: true })
  accountNumberLast4: string | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
