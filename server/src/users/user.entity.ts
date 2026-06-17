import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Index, BeforeInsert, BeforeUpdate } from 'typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { EncryptedTextTransformer } from '../common/field-encryption';

export enum UserRole {
  BUYER = 'buyer',
  SELLER = 'seller',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true, nullable: true })
  username: string;

  @Column()
  passwordHash: string; // Will store bcrypt hash

  @Column()
  fullName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({
    type: 'simple-enum',
    enum: UserRole,
    default: UserRole.BUYER,
  })
  role: UserRole;

  // Seller specific fields
  @Column({ nullable: true, transformer: EncryptedTextTransformer })
  bankName: string;

  @Column({ nullable: true, transformer: EncryptedTextTransformer })
  accountNumber: string;

  @Column({ nullable: true, transformer: EncryptedTextTransformer })
  accountName: string;

  @Column({ type: 'text', nullable: true })
  bankCode: string | null;

  @Column({ type: 'text', nullable: true })
  bankAccountLast4: string | null;

  @Column({ type: 'datetime', nullable: true })
  bankVerifiedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  paystackTransferRecipientCode: string | null;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: 'text', nullable: true })
  trustyTag: string | null;

  @Index({ unique: true })
  @Column({ type: 'text', nullable: true })
  trustyTagLower: string | null;

  @Column({ type: 'text', nullable: true })
  refreshTokenHash: string | null;

  @Column({ type: 'int', default: 0 })
  failedLoginCount: number;

  @Column({ type: 'datetime', nullable: true })
  lockedUntil: Date | null;

  @Column({ type: 'datetime', nullable: true })
  lastLoginAt: Date | null;

  @Column({ type: 'text', nullable: true })
  lastLoginIp: string | null;

  @Column({ type: 'text', nullable: true })
  lastLoginUserAgent: string | null;

  @OneToMany(() => Transaction, (transaction) => transaction.buyer)
  buyerTransactions: Transaction[];

  @OneToMany(() => Transaction, (transaction) => transaction.seller)
  sellerTransactions: Transaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  syncTrustyTag() {
    if (!this.trustyTag) {
      this.trustyTag = null;
      this.trustyTagLower = null;
      return;
    }
    const raw = String(this.trustyTag).trim();
    const withAt = raw.startsWith('@') ? raw : `@${raw}`;
    const normalized = withAt.replace(/\s+/g, '');
    this.trustyTag = normalized;
    this.trustyTagLower = normalized.toLowerCase();
  }
}
