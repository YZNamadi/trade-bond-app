import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type ReconciliationRunType = 'BALANCE_SNAPSHOT' | 'PENDING_TRANSFER_REQUERY' | 'WEBHOOK_GAP_SCAN' | 'STATEMENT_IMPORT';
export type ReconciliationRunStatus = 'STARTED' | 'COMPLETED' | 'FAILED';

@Entity('reconciliation_runs')
@Index(['provider', 'runType', 'createdAt'])
export class ReconciliationRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  provider: string;

  @Column({ type: 'text' })
  runType: ReconciliationRunType;

  @Column({ type: 'text' })
  status: ReconciliationRunStatus;

  @Column({ type: 'datetime', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'int', default: 0 })
  findingsCount: number;

  @Column({ type: 'int', default: 0 })
  mismatchAmountMinor: number;

  @Column({ type: 'text', nullable: true })
  cursor: string | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'simple-json', nullable: true })
  summary: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
