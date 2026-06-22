import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type MoneyAccountScope = 'PLATFORM' | 'USER' | 'TRANSACTION';
export type MoneyAccountKind =
  | 'FBO_ROOT'
  | 'REVENUE_ROOT'
  | 'ESCROW_BUCKET'
  | 'SELLER_SETTLEMENT'
  | 'BUYER_REFUND'
  | 'CUSTOMER_DEPOSIT'
  | 'CUSTOMER_SUBACCOUNT'
  | 'RESERVED_ACCOUNT';
export type MoneyAccountStatus = 'PENDING' | 'ACTIVE' | 'FROZEN' | 'CLOSED';

@Entity('money_accounts')
@Index(['provider', 'providerAccountId'], { unique: true })
@Index(['provider', 'providerSubAccountId'], { unique: true })
@Index(['provider', 'providerReservedAccountId'], { unique: true })
export class MoneyAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  provider: string;

  @Column({ type: 'text' })
  scope: MoneyAccountScope;

  @Column({ type: 'text' })
  kind: MoneyAccountKind;

  @Column({ type: 'text', default: 'PENDING' })
  status: MoneyAccountStatus;

  @Column({ type: 'text' })
  currency: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'uuid', nullable: true })
  transactionId: string | null;

  @Column({ type: 'text', nullable: true })
  displayName: string | null;

  @Column({ type: 'text', nullable: true })
  providerCustomerId: string | null;

  @Column({ type: 'text', nullable: true })
  providerAccountId: string | null;

  @Column({ type: 'text', nullable: true })
  providerSubAccountId: string | null;

  @Column({ type: 'text', nullable: true })
  providerReservedAccountId: string | null;

  @Column({ type: 'text', nullable: true })
  providerAccountNumberId: string | null;

  @Column({ type: 'text', nullable: true })
  providerVirtualNubanId: string | null;

  @Column({ type: 'text', nullable: true })
  accountNumberMasked: string | null;

  @Column({ type: 'simple-json', nullable: true })
  capabilities: Record<string, unknown> | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
