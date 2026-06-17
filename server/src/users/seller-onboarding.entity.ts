import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { EncryptedTextTransformer } from '../common/field-encryption';

export enum SellerOnboardingStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('seller_onboarding_requests')
export class SellerOnboardingRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Column({
    type: 'simple-enum',
    enum: SellerOnboardingStatus,
    default: SellerOnboardingStatus.PENDING,
  })
  status: SellerOnboardingStatus;

  @Column({ type: 'text', nullable: true })
  desiredTrustyTag: string | null;

  @Column({ type: 'text', nullable: true, transformer: EncryptedTextTransformer })
  bankName: string | null;

  @Column({ type: 'text', nullable: true, transformer: EncryptedTextTransformer })
  accountNumber: string | null;

  @Column({ type: 'text', nullable: true, transformer: EncryptedTextTransformer })
  accountName: string | null;

  @Column({ type: 'text', nullable: true })
  reviewedByUserId: string | null;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  reviewNote: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

