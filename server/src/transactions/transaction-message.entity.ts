import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('transaction_messages')
@Index(['transactionId', 'createdAt'])
export class TransactionMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  transactionId: string;

  @Index()
  @Column({ type: 'uuid' })
  senderUserId: string;

  @Column({ type: 'text' })
  senderRole: string;

  @Column({ type: 'text' })
  body: string;

  @CreateDateColumn()
  createdAt: Date;
}
