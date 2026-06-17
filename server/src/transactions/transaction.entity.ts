import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index, VersionColumn } from 'typeorm';
import { User } from '../users/user.entity';

export enum Currency {
  NGN = 'NGN',
}

export enum TransactionStatus {
  CREATED = 'CREATED',
  FUNDED = 'FUNDED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  RELEASE_PENDING = 'RELEASE_PENDING',
  RELEASED = 'RELEASED',
  DISPUTED = 'DISPUTED',
  REFUND_PENDING = 'REFUND_PENDING',
  REFUNDED = 'REFUNDED',
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  LEGACY_DISPUTED = 'disputed',
  CANCELLED = 'cancelled',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'simple-enum',
    enum: Currency,
    default: Currency.NGN,
  })
  currency: Currency;

  @Column()
  description: string;

  @Column({
    type: 'simple-enum',
    enum: TransactionStatus,
    default: TransactionStatus.CREATED,
  })
  status: TransactionStatus;

  // Paystack reference
  @Index({ unique: true })
  @Column({ nullable: true })
  paymentReference: string;

  @Column({ type: 'text', nullable: true })
  paystackAuthorizationUrl: string | null;

  @Column({ type: 'text', nullable: true })
  paystackAccessCode: string | null;

  @Column({ type: 'datetime', nullable: true })
  paystackInitializedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  paystackVerifiedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  paystackTransactionId: string | null;

  @Column({ type: 'text', nullable: true })
  paystackCustomerEmail: string | null;

  @Index({ unique: true })
  @Column({ type: 'text', nullable: true })
  payoutReference: string | null;

  @Column({ type: 'text', nullable: true })
  payoutStatus: string | null;

  @Column({ type: 'text', nullable: true })
  payoutProvider: string | null;

  @Column({ type: 'text', nullable: true })
  payoutProviderTransferCode: string | null;

  @Column({ type: 'datetime', nullable: true })
  payoutInitiatedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  payoutFailureReason: string | null;

  @Column({ type: 'text', nullable: true })
  refundStatus: string | null;

  @Column({ type: 'text', nullable: true })
  refundProvider: string | null;

  @Column({ type: 'text', nullable: true })
  refundProviderRefundId: string | null;

  @Column({ type: 'datetime', nullable: true })
  refundInitiatedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  refundProcessedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  refundFailureReason: string | null;

  @Column({ nullable: true })
  trackingId: string;

  @ManyToOne(() => User, (user) => user.buyerTransactions)
  @JoinColumn({ name: 'buyerId' })
  buyer: User;

  @Column()
  buyerId: string;

  @ManyToOne(() => User, (user) => user.sellerTransactions)
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  @Column()
  sellerId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @VersionColumn({ default: 1, nullable: true })
  version: number | null;
}
