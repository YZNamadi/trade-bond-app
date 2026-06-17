import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('transaction_proofs')
export class TransactionProof {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  transactionId: string;

  @Index()
  @Column()
  uploadedByUserId: string;

  @Column()
  storedFileName: string;

  @Column()
  originalFileName: string;

  @Column()
  mimeType: string;

  @Column({ type: 'int' })
  size: number;

  @Column({ type: 'text' })
  sha256: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
