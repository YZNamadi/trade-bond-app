import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { IdempotencyRecord } from './idempotency.entity';

@Injectable()
export class IdempotencyService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(IdempotencyRecord)
    private recordsRepository: Repository<IdempotencyRecord>,
  ) {}

  private hashRequest(v: unknown) {
    const raw = typeof v === 'string' ? v : JSON.stringify(v ?? null);
    return createHash('sha256').update(raw).digest('hex');
  }

  private advisoryLockId(scope: string, key: string): string {
    const hex = createHash('sha256').update(`${scope}|${key}`).digest('hex').slice(0, 16);
    let v = BigInt(`0x${hex}`);
    const maxSigned = (1n << 63n) - 1n;
    if (v > maxSigned) v = v - (1n << 64n);
    return v.toString(10);
  }

  async run<T>(opts: {
    scope: string;
    key?: string;
    requestFingerprint: unknown;
    handler: () => Promise<{ statusCode: number; body: T }>;
  }): Promise<T> {
    if (!opts.key) {
      const res = await opts.handler();
      return res.body;
    }
    const safeKey = String(opts.key).trim();
    if (safeKey.length < 8 || safeKey.length > 200) {
      throw new BadRequestException('Invalid idempotency key');
    }
    const requestHash = this.hashRequest(opts.requestFingerprint);

    const isPostgres = (this.dataSource.options as any)?.type === 'postgres';
    if (!isPostgres) {
      const existing = await this.recordsRepository.findOne({ where: { scope: opts.scope, key: safeKey } });
      if (existing) {
        if (existing.requestHash !== requestHash) {
          throw new BadRequestException('Idempotency key reuse with different request');
        }
        return JSON.parse(existing.responseBody) as T;
      }
      const res = await opts.handler();
      const record = this.recordsRepository.create({
        scope: opts.scope,
        key: safeKey,
        requestHash,
        statusCode: res.statusCode,
        responseBody: JSON.stringify(res.body ?? null),
      });
      try {
        await this.recordsRepository.save(record);
      } catch {
        const fresh = await this.recordsRepository.findOne({ where: { scope: opts.scope, key: safeKey } });
        if (!fresh) throw new BadRequestException('Idempotency conflict');
        if (fresh.requestHash !== requestHash) throw new BadRequestException('Idempotency key reuse with different request');
        return JSON.parse(fresh.responseBody) as T;
      }
      return res.body;
    }

    const lockId = this.advisoryLockId(opts.scope, safeKey);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      await queryRunner.query('SELECT pg_advisory_lock($1)', [lockId]);
      const repo = queryRunner.manager.getRepository(IdempotencyRecord);
      const existing = await repo.findOne({ where: { scope: opts.scope, key: safeKey } });
      if (existing) {
        if (existing.requestHash !== requestHash) {
          throw new BadRequestException('Idempotency key reuse with different request');
        }
        return JSON.parse(existing.responseBody) as T;
      }
      const res = await opts.handler();
      const record = repo.create({
        scope: opts.scope,
        key: safeKey,
        requestHash,
        statusCode: res.statusCode,
        responseBody: JSON.stringify(res.body ?? null),
      });
      await repo.save(record);
      return res.body;
    } finally {
      await queryRunner.query('SELECT pg_advisory_unlock($1)', [lockId]).catch(() => null);
      await queryRunner.release().catch(() => null);
    }
  }
}
