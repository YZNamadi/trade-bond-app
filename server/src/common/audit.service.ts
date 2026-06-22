import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { getRequestContext } from '../observability/request-context';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
  ) {}

  async record(input: {
    action: string;
    requestId?: string | null;
    actorUserId?: string | null;
    actorRole?: string | null;
    targetType?: string | null;
    targetId?: string | null;
    ip?: string | null;
    userAgent?: string | null;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    outcome?: string | null;
  }, manager?: EntityManager | null) {
    const ctx = getRequestContext();
    const repo = manager ? manager.getRepository(AuditLog) : this.auditRepository;
    const log = repo.create({
      requestId: input.requestId ?? ctx?.requestId ?? null,
      action: input.action,
      actorUserId: input.actorUserId ?? null,
      actorRole: input.actorRole ?? null,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      ip: input.ip ?? ctx?.ip ?? null,
      userAgent: input.userAgent ?? ctx?.userAgent ?? null,
      before: input.before ?? null,
      after: input.after ?? null,
      outcome: input.outcome ?? null,
    });
    await repo.save(log);
  }
}
