import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('provider_events')
@Index(['provider', 'providerEventId'], { unique: true })
export class ProviderEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  provider: string;

  @Column({ type: 'text' })
  providerEventId: string;

  @Column({ type: 'text' })
  eventType: string;

  @Column({ type: 'text', nullable: true })
  resourceType: string | null;

  @Column({ type: 'text', nullable: true })
  resourceId: string | null;

  @Column({ type: 'text', nullable: true })
  signature: string | null;

  @Column({ type: 'boolean', default: false })
  signatureVerified: boolean;

  @Column({ type: 'text', nullable: true })
  dedupeHash: string | null;

  @Column({ type: 'datetime', nullable: true })
  receivedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  processedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  processingError: string | null;

  @Column({ type: 'simple-json', nullable: true })
  payload: Record<string, unknown> | null;

  @Column({ type: 'simple-json', nullable: true })
  included: Record<string, unknown>[] | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
