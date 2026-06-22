import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type MoneyMovementKind =
  | 'PAYIN'
  | 'BOOK_TRANSFER'
  | 'NIP_TRANSFER'
  | 'PAYOUT'
  | 'REFUND'
  | 'FEE_SWEEP'
  | 'REVERSAL';
export type MoneyMovementStatus = 'INITIATED' | 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED' | 'NEEDS_REQUERY';

@Entity('money_movements')
@Index(['provider', 'reference'], { unique: true })
@Index(['provider', 'providerObjectType', 'providerObjectId'], { unique: true })
export class MoneyMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  provider: string;

  @Column({ type: 'text' })
  kind: MoneyMovementKind;

  @Column({ type: 'text' })
  status: MoneyMovementStatus;

  @Column({ type: 'text' })
  currency: string;

  @Column({ type: 'int' })
  amountMinor: number;

  @Column({ type: 'uuid', nullable: true })
  transactionId: string | null;

  @Column({ type: 'uuid', nullable: true })
  sourceAccountId: string | null;

  @Column({ type: 'uuid', nullable: true })
  destinationAccountId: string | null;

  @Column({ type: 'uuid', nullable: true })
  counterpartyId: string | null;

  @Column({ type: 'text' })
  reference: string;

  @Column({ type: 'text', nullable: true })
  providerObjectType: string | null;

  @Column({ type: 'text', nullable: true })
  providerObjectId: string | null;

  @Column({ type: 'text', nullable: true })
  providerTransferId: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  @Column({ type: 'datetime', nullable: true })
  requestedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  failedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  reversedAt: Date | null;

  @Column({ type: 'simple-json', nullable: true })
  providerPayload: Record<string, unknown> | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
