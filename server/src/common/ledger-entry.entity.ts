import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type LedgerEventType =
  | 'PAYMENT_FUNDED'
  | 'PAYOUT_INITIATED'
  | 'PAYOUT_CONFIRMED'
  | 'PAYOUT_FAILED'
  | 'REFUND_INITIATED'
  | 'REFUND_CONFIRMED'
  | 'REFUND_FAILED';

@Entity('ledger_entries')
@Index(['transactionId', 'createdAt'])
export class LedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  transactionId: string;

  @Index()
  @Column({ type: 'text' })
  eventType: LedgerEventType;

  @Column({ type: 'int' })
  amountMinor: number;

  @Column({ type: 'text' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  provider: string | null;

  @Column({ type: 'text', nullable: true })
  providerRef: string | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}

