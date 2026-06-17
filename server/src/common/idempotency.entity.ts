import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('idempotency_records')
@Index(['scope', 'key'], { unique: true })
export class IdempotencyRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  scope: string;

  @Column()
  key: string;

  @Column({ type: 'text' })
  requestHash: string;

  @Column({ type: 'int' })
  statusCode: number;

  @Column({ type: 'text' })
  responseBody: string;

  @CreateDateColumn()
  createdAt: Date;
}

