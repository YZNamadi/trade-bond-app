import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'text', nullable: true })
  requestId: string | null;

  @Index()
  @Column({ type: 'text' })
  action: string;

  @Index()
  @Column({ type: 'text', nullable: true })
  actorUserId: string | null;

  @Column({ type: 'text', nullable: true })
  actorRole: string | null;

  @Index()
  @Column({ type: 'text', nullable: true })
  targetType: string | null;

  @Index()
  @Column({ type: 'text', nullable: true })
  targetId: string | null;

  @Column({ type: 'text', nullable: true })
  ip: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ type: 'simple-json', nullable: true })
  before: Record<string, unknown> | null;

  @Column({ type: 'simple-json', nullable: true })
  after: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  outcome: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
