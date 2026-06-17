import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('paystack_webhook_events')
@Index(['providerEventId'], { unique: true })
export class PaystackWebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  providerEventId: string;

  @Index()
  @Column({ type: 'text', nullable: true })
  reference: string | null;

  @Column({ type: 'text', nullable: true })
  eventType: string | null;

  @CreateDateColumn()
  receivedAt: Date;
}

