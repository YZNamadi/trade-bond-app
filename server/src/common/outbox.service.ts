import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { LessThanOrEqual, Repository } from 'typeorm';
import { OutboxJob, type OutboxJobStatus } from './outbox-job.entity';

function now() {
  return new Date();
}

function backoffMs(attempt: number) {
  const base = 1000;
  const exp = Math.min(10, Math.max(0, attempt));
  const jitter = Math.floor(Math.random() * 250);
  return base * (2 ** exp) + jitter;
}

@Injectable()
export class OutboxService {
  private workerId = process.env.WORKER_ID || `${process.pid}:${randomUUID()}`;

  constructor(
    @InjectRepository(OutboxJob)
    private jobsRepository: Repository<OutboxJob>,
  ) {}

  async enqueue(input: { type: string; dedupeKey?: string | null; payload: Record<string, any>; runAt?: Date; maxAttempts?: number }) {
    const dedupeKey = input.dedupeKey ? String(input.dedupeKey).slice(0, 200) : null;
    const maxAttempts = Math.max(1, Math.min(50, Number(input.maxAttempts ?? 10)));
    const nextRunAt = input.runAt ?? now();
    const job = this.jobsRepository.create({
      type: input.type,
      dedupeKey,
      payload: input.payload,
      status: 'PENDING' as OutboxJobStatus,
      attempts: 0,
      maxAttempts,
      nextRunAt,
      lockedAt: null,
      lockedBy: null,
      lastError: null,
    });
    if (dedupeKey) {
      const res = await this.jobsRepository
        .createQueryBuilder()
        .insert()
        .into(OutboxJob)
        .values(job as any)
        .orIgnore()
        .execute();
      if (res.identifiers?.length) return job;
      const existing = await this.jobsRepository.findOne({ where: { type: input.type, dedupeKey } as any });
      if (existing) {
        // Allow explicit retries and reconciliation to reactivate terminal jobs while
        // keeping active jobs deduplicated.
        if (existing.status === 'DONE' || existing.status === 'FAILED') {
          await this.jobsRepository.update(existing.id, {
            payload: input.payload,
            status: 'PENDING' as OutboxJobStatus,
            attempts: 0,
            maxAttempts,
            nextRunAt,
            lockedAt: null,
            lockedBy: null,
            lastError: null,
          } as any);
          const refreshed = await this.jobsRepository.findOne({ where: { id: existing.id } as any });
          if (refreshed) return refreshed;
        }
        return existing;
      }
      throw new Error('Outbox enqueue failed');
    }
    await this.jobsRepository.insert(job as any);
    return job;
  }

  async takeNext(batchSize: number) {
    const take = Math.max(1, Math.min(50, Math.floor(batchSize || 10)));
    const cutoff = now();
    const lockTtlMs = Number(process.env.OUTBOX_LOCK_TTL_MS || 60_000);
    if (Number.isFinite(lockTtlMs) && lockTtlMs > 0) {
      const staleBefore = new Date(Date.now() - lockTtlMs);
      await this.jobsRepository
        .createQueryBuilder()
        .update(OutboxJob)
        .set({ status: 'PENDING' as any, lockedAt: null, lockedBy: null } as any)
        .where('status = :status AND lockedAt IS NOT NULL AND lockedAt < :staleBefore', {
          status: 'PROCESSING',
          staleBefore,
        })
        .execute();
    }
    const candidates = await this.jobsRepository.find({
      where: { status: 'PENDING' as any, nextRunAt: LessThanOrEqual(cutoff) } as any,
      order: { nextRunAt: 'ASC', createdAt: 'ASC' } as any,
      take,
    });
    const claimed: OutboxJob[] = [];
    for (const job of candidates) {
      const res = await this.jobsRepository
        .createQueryBuilder()
        .update(OutboxJob)
        .set({ status: 'PROCESSING' as any, lockedAt: cutoff, lockedBy: this.workerId } as any)
        .where('id = :id AND status = :status', { id: job.id, status: 'PENDING' })
        .execute();
      if (res.affected === 1) {
        const fresh = await this.jobsRepository.findOne({ where: { id: job.id } as any });
        if (fresh) claimed.push(fresh);
      }
    }
    return claimed;
  }

  async markDone(jobId: string) {
    await this.jobsRepository.update(jobId, { status: 'DONE' as any, lockedAt: null, lockedBy: null } as any);
  }

  async markFailed(jobId: string, err: unknown, attempts: number, maxAttempts: number) {
    const msg = err instanceof Error ? err.message : String(err);
    if (attempts + 1 >= maxAttempts) {
      await this.jobsRepository.update(jobId, {
        status: 'FAILED' as any,
        attempts: attempts + 1,
        lockedAt: null,
        lockedBy: null,
        lastError: msg.slice(0, 500),
      } as any);
      return;
    }
    const next = new Date(Date.now() + backoffMs(attempts));
    await this.jobsRepository.update(jobId, {
      status: 'PENDING' as any,
      attempts: attempts + 1,
      lockedAt: null,
      lockedBy: null,
      nextRunAt: next,
      lastError: msg.slice(0, 500),
    } as any);
  }
}
