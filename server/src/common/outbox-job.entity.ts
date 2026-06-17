import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type OutboxJobStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';

@Entity('outbox_jobs')
@Index(['status', 'nextRunAt'])
@Index(['type', 'dedupeKey'], { unique: true })
export class OutboxJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  type: string;

  @Column({ type: 'text', nullable: true })
  dedupeKey: string | null;

  @Column({ type: 'simple-json' })
  payload: Record<string, any>;

  @Column({ type: 'text', default: 'PENDING' })
  status: OutboxJobStatus;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'int', default: 10 })
  maxAttempts: number;

  @Column({ type: 'datetime' })
  nextRunAt: Date;

  @Column({ type: 'datetime', nullable: true })
  lockedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  lockedBy: string | null;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

