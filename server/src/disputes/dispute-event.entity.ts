import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('dispute_events')
@Index(['disputeId', 'seq'], { unique: true })
@Index(['disputeId', 'createdAt'])
export class DisputeEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  disputeId: string;

  @Column({ type: 'int' })
  seq: number;

  @Column({ type: 'text' })
  type: string;

  @Column({ type: 'text', nullable: true })
  fromStatus: string | null;

  @Column({ type: 'text', nullable: true })
  toStatus: string | null;

  @Column({ type: 'uuid', nullable: true })
  actorUserId: string | null;

  @Column({ type: 'text', nullable: true })
  actorRole: string | null;

  @Column({ type: 'text', nullable: true })
  requestId: string | null;

  @Column({ type: 'text', nullable: true })
  ip: string | null;

  @Column({ type: 'text', nullable: true })
  deviceId: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ type: 'simple-json', nullable: true })
  before: Record<string, unknown> | null;

  @Column({ type: 'simple-json', nullable: true })
  after: Record<string, unknown> | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  prevHash: string | null;

  @Column({ type: 'text' })
  hash: string;

  @CreateDateColumn()
  createdAt: Date;
}

