import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from 'typeorm';

export enum DisputeStatus {
  NONE = 'NONE',
  OPENED = 'OPENED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  EVIDENCE_SUBMITTED_BY_BUYER = 'EVIDENCE_SUBMITTED_BY_BUYER',
  EVIDENCE_SUBMITTED_BY_SELLER = 'EVIDENCE_SUBMITTED_BY_SELLER',
  AWAITING_ADMIN_REVIEW = 'AWAITING_ADMIN_REVIEW',
  IN_MEDIATION = 'IN_MEDIATION',
  ESCALATED_TO_ARBITRATION = 'ESCALATED_TO_ARBITRATION',
  RESOLVED_FOR_BUYER = 'RESOLVED_FOR_BUYER',
  RESOLVED_FOR_SELLER = 'RESOLVED_FOR_SELLER',
  PARTIAL_REFUND = 'PARTIAL_REFUND',
  REJECTED = 'REJECTED',
  CLOSED = 'CLOSED',
}

export type DisputeDecision =
  | {
      outcome: 'refund';
      justification: string;
      refundAmountMinor?: number | null;
      currency?: string | null;
      decidedByUserId: string;
      decidedAt: string;
    }
  | {
      outcome: 'release';
      justification: string;
      decidedByUserId: string;
      decidedAt: string;
    }
  | {
      outcome: 'partial_refund';
      justification: string;
      refundAmountMinor: number;
      currency?: string | null;
      decidedByUserId: string;
      decidedAt: string;
    }
  | {
      outcome: 'reject';
      justification: string;
      decidedByUserId: string;
      decidedAt: string;
    };

@Entity('disputes')
@Index(['transactionId'], { unique: true })
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  transactionId: string;

  @Column({ type: 'uuid' })
  buyerId: string;

  @Column({ type: 'uuid' })
  sellerId: string;

  @Column({ type: 'simple-enum', enum: DisputeStatus, default: DisputeStatus.OPENED })
  status: DisputeStatus;

  @Column({ type: 'datetime', nullable: true })
  openedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  closedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  lastActorUserId: string | null;

  @Column({ type: 'text', nullable: true })
  lastActorRole: string | null;

  @Column({ type: 'simple-json', nullable: true })
  transactionSnapshot: Record<string, unknown> | null;

  @Column({ type: 'simple-json', nullable: true })
  decision: DisputeDecision | null;

  @VersionColumn({ default: 1, nullable: true })
  version: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
