import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('dispute_evidence')
@Index(['disputeId', 'createdAt'])
export class DisputeEvidence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  disputeId: string;

  @Column({ type: 'uuid' })
  transactionId: string;

  @Column({ type: 'uuid' })
  uploadedByUserId: string;

  @Column({ type: 'text' })
  uploadedByRole: string;

  @Column({ type: 'text' })
  storedFileName: string;

  @Column({ type: 'text' })
  originalFileName: string;

  @Column({ type: 'text' })
  mimeType: string;

  @Column({ type: 'int' })
  size: number;

  @Column({ type: 'text' })
  sha256: string;

  @Column({ type: 'text' })
  encryption: string;

  @Column({ type: 'text' })
  encryptionIvB64: string;

  @Column({ type: 'text' })
  encryptionTagB64: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'simple-json', nullable: true })
  annotations: Array<{ at: string; byUserId: string; byRole: string; text: string }> | null;

  @CreateDateColumn()
  createdAt: Date;
}

