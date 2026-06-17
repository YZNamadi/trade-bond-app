import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Transaction } from './transaction.entity';

export enum TransactionEventType {
  TRANSACTION_CREATED = 'TRANSACTION_CREATED',
  PAYMENT_INITIALIZED = 'PAYMENT_INITIALIZED',
  PAYMENT_VERIFIED = 'PAYMENT_VERIFIED',
  ESCROW_FUNDED = 'ESCROW_FUNDED',
  SHIPPING_UPDATED = 'SHIPPING_UPDATED',
  DELIVERY_CONFIRMED = 'DELIVERY_CONFIRMED',
  FUNDS_RELEASED = 'FUNDS_RELEASED',
  PAYOUT_INITIATED = 'PAYOUT_INITIATED',
  PAYOUT_FAILED = 'PAYOUT_FAILED',
  DISPUTE_OPENED = 'DISPUTE_OPENED',
}

@Entity('transaction_events')
export class TransactionEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  transactionId: string;

  @ManyToOne(() => Transaction, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transactionId' })
  transaction: Transaction;

  @Column({
    type: 'simple-enum',
    enum: TransactionEventType,
  })
  type: TransactionEventType;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, unknown> | null;

  @Index()
  @Column({ type: 'text', nullable: true })
  requestId: string | null;

  @Column({ type: 'text', nullable: true })
  actorUserId: string | null;

  @Column({ type: 'text', nullable: true })
  actorRole: string | null;

  @Column({ type: 'text', nullable: true })
  fromStatus: string | null;

  @Column({ type: 'text', nullable: true })
  toStatus: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
