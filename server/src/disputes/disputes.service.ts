import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { execFileSync } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { Dispute, DisputeDecision, DisputeStatus } from './dispute.entity';
import { DisputeEvidence } from './dispute-evidence.entity';
import { DisputeEvent } from './dispute-event.entity';
import { Transaction, TransactionStatus } from '../transactions/transaction.entity';
import { IdempotencyService } from '../common/idempotency.service';
import { AuditService } from '../common/audit.service';
import { getRequestContext } from '../observability/request-context';
import { UserRole } from '../users/user.entity';
import type { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { OutboxService } from '../common/outbox.service';

type Actor = { userId: string; role: UserRole | 'buyer' | 'seller' | 'admin' | string; deviceId?: string | null };

const TERMINAL: DisputeStatus[] = [
  DisputeStatus.RESOLVED_FOR_BUYER,
  DisputeStatus.RESOLVED_FOR_SELLER,
  DisputeStatus.PARTIAL_REFUND,
  DisputeStatus.REJECTED,
  DisputeStatus.CLOSED,
];

function isTerminal(s: DisputeStatus) {
  return TERMINAL.includes(s);
}

function evidenceEncryptionKey(): Buffer {
  const raw = process.env.EVIDENCE_ENCRYPTION_KEY_BASE64 || '';
  const isProd = process.env.NODE_ENV === 'production';
  if (!raw) {
    if (isProd) throw new ServiceUnavailableException('Evidence storage key not configured');
    return createHash('sha256').update('dev-only-evidence-key').digest();
  }
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) {
    throw new ServiceUnavailableException('Evidence storage key is invalid');
  }
  return buf;
}

function evidenceRootDir(): string {
  const configured = process.env.EVIDENCE_STORAGE_DIR;
  const root = configured ? path.resolve(configured) : path.resolve(process.cwd(), 'uploads', 'dispute-evidence');
  fs.mkdirSync(root, { recursive: true });
  return root;
}

function virusScanOrFail(buffer: Buffer): void {
  const isProd = process.env.NODE_ENV === 'production';
  const required = (process.env.EVIDENCE_REQUIRE_VIRUS_SCAN || (isProd ? 'true' : 'false')) === 'true';
  const mode = (process.env.EVIDENCE_VIRUS_SCAN_MODE || (required ? 'required' : 'none')).toLowerCase();
  if (!required) return;
  if (mode === 'none') {
    throw new ServiceUnavailableException('Virus scanning is required');
  }
  const cmd = mode === 'clamdscan' ? 'clamdscan' : mode === 'clamscan' ? 'clamscan' : '';
  if (!cmd) {
    throw new ServiceUnavailableException('Virus scanner not configured');
  }
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-evidence-'));
  const tmpFile = path.join(tmpDir, 'upload.bin');
  try {
    fs.writeFileSync(tmpFile, buffer, { flag: 'wx' });
  } catch (e: any) {
    const status = typeof e?.status === 'number' ? e.status : null;
    if (status === 1) throw new BadRequestException('Evidence rejected');
    throw new ServiceUnavailableException('Virus scanner unavailable');
  }
  try {
    const out = execFileSync(cmd, ['--no-summary', tmpFile], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const ok = /: OK\s*$/m.test(out) || out.includes('OK');
    if (!ok) throw new BadRequestException('Evidence rejected');
  } catch (e: any) {
    const status = typeof e?.status === 'number' ? e.status : null;
    if (status === 1) throw new BadRequestException('Evidence rejected');
    throw new ServiceUnavailableException('Virus scanner unavailable');
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

function allowedEvidenceMime(mime: string) {
  const allow = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'video/mp4',
    'text/plain',
    'application/json',
  ];
  return allow.includes(mime);
}

function normalizeRole(role: string): 'buyer' | 'seller' | 'admin' {
  if (role === UserRole.ADMIN || role === 'admin') return 'admin';
  if (role === UserRole.SELLER || role === 'seller') return 'seller';
  return 'buyer';
}

function disputeWindowMs(tx: Transaction): number | null {
  const hours = Number(process.env.DISPUTE_WINDOW_HOURS || 72);
  if (!Number.isFinite(hours) || hours <= 0) return null;
  const base = tx.updatedAt instanceof Date ? tx.updatedAt.getTime() : Date.now();
  return base + hours * 60 * 60 * 1000;
}

@Injectable()
export class DisputesService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(Dispute) private disputesRepo: Repository<Dispute>,
    @InjectRepository(DisputeEvidence) private evidenceRepo: Repository<DisputeEvidence>,
    @InjectRepository(DisputeEvent) private eventsRepo: Repository<DisputeEvent>,
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    private idempotencyService: IdempotencyService,
    private auditService: AuditService,
    private outboxService: OutboxService,
  ) {}

  async listForUser(userId: string) {
    const disputes = await this.disputesRepo.find({
      where: [{ buyerId: userId }, { sellerId: userId }],
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return disputes.map((d) => ({
      id: d.id,
      transactionId: d.transactionId,
      status: d.status,
      openedAt: d.openedAt,
      closedAt: d.closedAt,
      updatedAt: d.updatedAt,
    }));
  }

  async listForAdmin(status?: 'OPEN' | 'CLOSED') {
    const list = await this.disputesRepo.find({
      order: { updatedAt: 'DESC' },
      take: 200,
    });
    const filtered = status
      ? list.filter((d) => (status === 'CLOSED' ? isTerminal(d.status) : !isTerminal(d.status)))
      : list;
    return filtered.map((d) => ({
      id: d.id,
      transactionId: d.transactionId,
      status: d.status,
      openedAt: d.openedAt,
      closedAt: d.closedAt,
      updatedAt: d.updatedAt,
    }));
  }

  async hydrateForAdmin(disputeId: string) {
    const d = await this.disputesRepo.findOne({ where: { id: disputeId } });
    if (!d) throw new NotFoundException('Dispute not found');
    const [events, evidence] = await Promise.all([
      this.eventsRepo.find({ where: { disputeId: d.id }, order: { seq: 'ASC' } }),
      this.evidenceRepo.find({ where: { disputeId: d.id }, order: { createdAt: 'DESC' } }),
    ]);
    return {
      id: d.id,
      transactionId: d.transactionId,
      status: d.status,
      openedAt: d.openedAt,
      closedAt: d.closedAt,
      updatedAt: d.updatedAt,
      decision: d.decision,
      transactionSnapshot: d.transactionSnapshot,
      evidence: evidence.map((e) => ({
        id: e.id,
        createdAt: e.createdAt,
        note: e.note,
        mimeType: e.mimeType,
        size: e.size,
        originalFileName: e.originalFileName,
      })),
      events: events.map((ev) => ({
        id: ev.id,
        seq: ev.seq,
        type: ev.type,
        fromStatus: ev.fromStatus,
        toStatus: ev.toStatus,
        actorUserId: ev.actorUserId,
        actorRole: ev.actorRole,
        requestId: ev.requestId,
        createdAt: ev.createdAt,
        before: ev.before,
        after: ev.after,
        metadata: ev.metadata,
        hash: ev.hash,
        prevHash: ev.prevHash,
      })),
    };
  }

  async getEvidenceFileForAdmin(disputeId: string, evidenceId: string) {
    const d = await this.disputesRepo.findOne({ where: { id: disputeId } });
    if (!d) throw new NotFoundException('Dispute not found');
    const evidence = await this.evidenceRepo.findOne({ where: { id: evidenceId, disputeId: d.id } });
    if (!evidence) throw new NotFoundException('Evidence not found');
    const buf = this.decryptToBuffer(evidence);
    const sha = createHash('sha256').update(buf).digest('hex');
    if (sha !== evidence.sha256) throw new BadRequestException('Evidence integrity check failed');
    return { buffer: buf, mimeType: evidence.mimeType, originalFileName: evidence.originalFileName };
  }

  async getByTransactionForUser(transactionId: string, userId: string) {
    const d = await this.disputesRepo.findOne({ where: { transactionId } });
    if (!d) throw new NotFoundException('Dispute not found');
    if (d.buyerId !== userId && d.sellerId !== userId) throw new NotFoundException('Dispute not found');
    return this.hydrate(d.id, userId);
  }

  async hydrate(disputeId: string, userId: string) {
    const d = await this.disputesRepo.findOne({ where: { id: disputeId } });
    if (!d) throw new NotFoundException('Dispute not found');
    if (d.buyerId !== userId && d.sellerId !== userId) throw new NotFoundException('Dispute not found');
    const [events, evidence] = await Promise.all([
      this.eventsRepo.find({ where: { disputeId: d.id }, order: { seq: 'ASC' } }),
      this.evidenceRepo.find({ where: { disputeId: d.id }, order: { createdAt: 'DESC' } }),
    ]);
    return {
      id: d.id,
      transactionId: d.transactionId,
      buyerId: d.buyerId,
      sellerId: d.sellerId,
      status: d.status,
      openedAt: d.openedAt,
      closedAt: d.closedAt,
      updatedAt: d.updatedAt,
      version: d.version,
      decision: d.decision,
      evidence: evidence.map((e) => ({
        id: e.id,
        createdAt: e.createdAt,
        uploadedByUserId: e.uploadedByUserId,
        uploadedByRole: e.uploadedByRole,
        note: e.note,
        mimeType: e.mimeType,
        size: e.size,
        originalFileName: e.originalFileName,
        sha256: e.sha256,
        annotations: e.annotations ?? [],
      })),
      events: events.map((ev) => ({
        id: ev.id,
        seq: ev.seq,
        type: ev.type,
        fromStatus: ev.fromStatus,
        toStatus: ev.toStatus,
        actorUserId: ev.actorUserId,
        actorRole: ev.actorRole,
        requestId: ev.requestId,
        createdAt: ev.createdAt,
        before: ev.before,
        after: ev.after,
        metadata: ev.metadata,
        hash: ev.hash,
        prevHash: ev.prevHash,
      })),
    };
  }

  async openForTransaction(transactionId: string, actor: Actor, idempotencyKey?: string) {
    const role = normalizeRole(actor.role);
    return this.idempotencyService.run({
      scope: `dispute:open:${actor.userId}:${transactionId}`,
      key: idempotencyKey,
      requestFingerprint: { transactionId },
      handler: async () => {
        const dispute = await this.dataSource.transaction((manager) => this.openForTransactionInManager(manager, transactionId, actor));
        return { statusCode: 200, body: dispute };
      },
    });
  }

  async openForTransactionInManager(manager: EntityManager, transactionId: string, actor: Actor) {
    const role = normalizeRole(actor.role);
    const txRepo = manager.getRepository(Transaction);
    const disputeRepo = manager.getRepository(Dispute);
    const eventsRepo = manager.getRepository(DisputeEvent);

    const lock = this.supportsRowLock() ? ({ mode: 'pessimistic_write' } as const) : undefined;
    const tx = await txRepo.findOne({ where: { id: transactionId }, ...(lock ? { lock } : {}) });
    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.buyerId !== actor.userId && tx.sellerId !== actor.userId && role !== 'admin') {
      throw new NotFoundException('Transaction not found');
    }
    const txStatus = tx.status as TransactionStatus;
    if (txStatus === TransactionStatus.REFUND_PENDING || txStatus === TransactionStatus.REFUNDED) {
      throw new BadRequestException('Transaction cannot be disputed');
    }
    if (txStatus === TransactionStatus.CREATED) throw new BadRequestException('Escrow must be funded before disputing');
    if (txStatus === TransactionStatus.RELEASE_PENDING || txStatus === TransactionStatus.RELEASED) {
      const cutoff = disputeWindowMs(tx);
      if (cutoff && Date.now() > cutoff) {
        throw new BadRequestException('Dispute window has expired');
      }
    }

    const existing = await disputeRepo.findOne({ where: { transactionId: tx.id }, ...(lock ? { lock } : {}) });
    if (existing) {
      if (isTerminal(existing.status)) {
        throw new BadRequestException('Dispute already closed');
      }
      return existing;
    }

    const snapshot: Record<string, unknown> = {
      id: tx.id,
      amount: String(tx.amount),
      currency: tx.currency,
      description: tx.description,
      status: txStatus,
      paymentReference: tx.paymentReference || null,
      trackingId: tx.trackingId || null,
      buyerId: tx.buyerId,
      sellerId: tx.sellerId,
      createdAt: tx.createdAt?.toISOString?.() ?? null,
      updatedAt: tx.updatedAt?.toISOString?.() ?? null,
    };

    const dispute = disputeRepo.create({
      transactionId: tx.id,
      buyerId: tx.buyerId,
      sellerId: tx.sellerId,
      status: DisputeStatus.OPENED,
      openedAt: new Date(),
      closedAt: null,
      lastActorUserId: actor.userId,
      lastActorRole: role,
      transactionSnapshot: snapshot,
      decision: null,
    });
    const created = await disputeRepo.save(dispute);

    if (txStatus !== TransactionStatus.DISPUTED) {
      await txRepo.update({ id: tx.id }, { status: TransactionStatus.DISPUTED } as any);
    }

    await this.appendEvent(eventsRepo, created.id, {
      type: 'DISPUTE_OPENED',
      fromStatus: null,
      toStatus: DisputeStatus.OPENED,
      actor,
      before: null,
      after: { status: DisputeStatus.OPENED, transactionId: tx.id },
      metadata: { transactionStatus: txStatus },
    });

    await this.auditService.record({
      action: 'dispute.open',
      actorUserId: actor.userId,
      actorRole: role === 'admin' ? UserRole.ADMIN : role === 'seller' ? UserRole.SELLER : UserRole.BUYER,
      targetType: 'dispute',
      targetId: created.id,
      before: { status: null },
      after: { status: DisputeStatus.OPENED, transactionId: tx.id },
      outcome: 'ok',
    }, manager);

    return created;
  }

  async submitEvidence(
    disputeId: string,
    actor: Actor,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number } | null,
    note: string | undefined,
    idempotencyKey?: string,
  ) {
    const role = normalizeRole(actor.role);
    if (!file) throw new BadRequestException('Missing file');
    if (!allowedEvidenceMime(file.mimetype)) throw new BadRequestException('Unsupported file type');
    const maxBytes = Number(process.env.EVIDENCE_MAX_BYTES || 25 * 1024 * 1024);
    if (file.size > maxBytes) throw new BadRequestException('File too large');

    const buf = Buffer.isBuffer((file as any).buffer) ? (file as any).buffer : null;
    if (!buf) throw new BadRequestException('Missing file');
    virusScanOrFail(buf);

    const sha256 = createHash('sha256').update(buf).digest('hex');

    return this.idempotencyService.run({
      scope: `dispute:evidence:${actor.userId}:${disputeId}:${sha256}`,
      key: idempotencyKey,
      requestFingerprint: { disputeId, sha256 },
      handler: async () => {
        const saved = await this.dataSource.transaction(async (manager) => {
          const disputeRepo = manager.getRepository(Dispute);
          const evidenceRepo = manager.getRepository(DisputeEvidence);
          const eventsRepo = manager.getRepository(DisputeEvent);
          const txRepo = manager.getRepository(Transaction);
          const lock = this.supportsRowLock() ? ({ mode: 'pessimistic_write' } as const) : undefined;

          const dispute = await disputeRepo.findOne({ where: { id: disputeId }, ...(lock ? { lock } : {}) });
          if (!dispute) throw new NotFoundException('Dispute not found');
          if (isTerminal(dispute.status)) throw new BadRequestException('Dispute is closed');

          if (role !== 'admin' && dispute.buyerId !== actor.userId && dispute.sellerId !== actor.userId) {
            throw new NotFoundException('Dispute not found');
          }
          const isBuyer = dispute.buyerId === actor.userId;
          const isSeller = dispute.sellerId === actor.userId;
          if (role !== 'admin' && !isBuyer && !isSeller) throw new NotFoundException('Dispute not found');

          const tx = await txRepo.findOne({ where: { id: dispute.transactionId }, ...(lock ? { lock } : {}) });
          if (!tx) throw new NotFoundException('Transaction not found');
          const txStatusFrom = tx.status;
          if (tx.status !== TransactionStatus.DISPUTED) {
            await txRepo.update({ id: tx.id }, { status: TransactionStatus.DISPUTED } as any);
          }

          const enc = this.encryptAndStore(buf, sha256);

          const evidence = evidenceRepo.create({
            disputeId: dispute.id,
            transactionId: dispute.transactionId,
            uploadedByUserId: actor.userId,
            uploadedByRole: role,
            storedFileName: enc.storedFileName,
            originalFileName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            sha256,
            encryption: enc.encryption,
            encryptionIvB64: enc.ivB64,
            encryptionTagB64: enc.tagB64,
            note: note ? String(note).slice(0, 500) : null,
            annotations: null,
          });
          const created = await evidenceRepo.save(evidence);

          const nextStatus =
            role === 'admin'
              ? dispute.status
              : isBuyer
                ? DisputeStatus.EVIDENCE_SUBMITTED_BY_BUYER
                : DisputeStatus.EVIDENCE_SUBMITTED_BY_SELLER;

          const { updated, fromStatus } = await this.tryTransitionDispute(disputeRepo, dispute, nextStatus, actor);

          await this.appendEvent(eventsRepo, dispute.id, {
            type: 'EVIDENCE_UPLOADED',
            fromStatus,
            toStatus: updated.status,
            actor,
            before: { status: fromStatus },
            after: { status: updated.status, evidenceId: created.id, sha256, mimeType: created.mimeType, size: created.size },
            metadata: { originalFileName: created.originalFileName },
          });

          await this.auditService.record({
            action: 'dispute.evidence.upload',
            actorUserId: actor.userId,
            actorRole: role === 'admin' ? UserRole.ADMIN : role === 'seller' ? UserRole.SELLER : UserRole.BUYER,
            targetType: 'dispute_evidence',
            targetId: created.id,
            after: { disputeId: dispute.id, transactionId: dispute.transactionId, sha256, mimeType: created.mimeType, size: created.size },
            outcome: 'ok',
          }, manager);

          return created;
        });
        return { statusCode: 200, body: saved };
      },
    });
  }

  async addNote(disputeId: string, actor: Actor, text: string, evidenceId?: string) {
    const role = normalizeRole(actor.role);
    if (!text || !text.trim()) throw new BadRequestException('Missing text');
    const trimmed = text.trim().slice(0, 2000);
    const evId = evidenceId ? String(evidenceId).trim() : undefined;

    const saved = await this.dataSource.transaction(async (manager) => {
      const disputeRepo = manager.getRepository(Dispute);
      const eventsRepo = manager.getRepository(DisputeEvent);
      const evidenceRepo = manager.getRepository(DisputeEvidence);
      const lock = this.supportsRowLock() ? ({ mode: 'pessimistic_write' } as const) : undefined;

      const dispute = await disputeRepo.findOne({ where: { id: disputeId }, ...(lock ? { lock } : {}) });
      if (!dispute) throw new NotFoundException('Dispute not found');
      if (isTerminal(dispute.status)) throw new BadRequestException('Dispute is closed');

      if (role !== 'admin' && dispute.buyerId !== actor.userId && dispute.sellerId !== actor.userId) {
        throw new NotFoundException('Dispute not found');
      }

      if (evId) {
        const e = await evidenceRepo.findOne({ where: { id: evId, disputeId: dispute.id } });
        if (!e) throw new NotFoundException('Evidence not found');
        const annotations = Array.isArray(e.annotations) ? e.annotations : [];
        annotations.push({ at: new Date().toISOString(), byUserId: actor.userId, byRole: role, text: trimmed });
        e.annotations = annotations;
        await evidenceRepo.save(e);
      }

      dispute.lastActorUserId = actor.userId;
      dispute.lastActorRole = role;
      await disputeRepo.save(dispute);

      await this.appendEvent(eventsRepo, dispute.id, {
        type: 'NOTE_ADDED',
        fromStatus: dispute.status,
        toStatus: dispute.status,
        actor,
        before: null,
        after: { evidenceId: evId ?? null, text: trimmed },
        metadata: null,
      });

      await this.auditService.record({
        action: 'dispute.note.add',
        actorUserId: actor.userId,
        actorRole: role === 'admin' ? UserRole.ADMIN : role === 'seller' ? UserRole.SELLER : UserRole.BUYER,
        targetType: 'dispute',
        targetId: dispute.id,
        after: { evidenceId: evId ?? null },
        outcome: 'ok',
      }, manager);

      return true;
    });
    return { ok: saved };
  }

  async assertNoActiveDisputeForTransaction(transactionId: string) {
    const d = await this.disputesRepo.findOne({ where: { transactionId } });
    if (!d) return;
    if (!isTerminal(d.status)) {
      throw new BadRequestException('Transaction has an active dispute');
    }
  }

  async adminResolve(disputeId: string, actor: Actor, dto: ResolveDisputeDto, idempotencyKey?: string) {
    const role = normalizeRole(actor.role);
    if (role !== 'admin') throw new ForbiddenException('Admin only');

    const resolved = await this.idempotencyService.run({
      scope: `dispute:resolve:${disputeId}:${actor.userId}`,
      key: idempotencyKey,
      requestFingerprint: { disputeId, outcome: dto.outcome },
      handler: async () => {
        const saved = await this.dataSource.transaction(async (manager) => {
          const disputeRepo = manager.getRepository(Dispute);
          const eventsRepo = manager.getRepository(DisputeEvent);
          const txRepo = manager.getRepository(Transaction);
          const lock = this.supportsRowLock() ? ({ mode: 'pessimistic_write' } as const) : undefined;

          const dispute = await disputeRepo.findOne({ where: { id: disputeId }, ...(lock ? { lock } : {}) });
          if (!dispute) throw new NotFoundException('Dispute not found');
          if (isTerminal(dispute.status)) return dispute;

          const tx = await txRepo.findOne({ where: { id: dispute.transactionId }, ...(lock ? { lock } : {}) });
          if (!tx) throw new NotFoundException('Transaction not found');
          const txStatusFrom = tx.status;
          const txAmountMinor = Math.round(Number(tx.amount) * 100);
          if (tx.status !== TransactionStatus.DISPUTED) {
            await txRepo.update({ id: tx.id }, { status: TransactionStatus.DISPUTED } as any);
          }

          const nowIso = new Date().toISOString();
          let decision: DisputeDecision;
          let nextDisputeStatus: DisputeStatus;
          let nextTxStatus: TransactionStatus | null = null;

          if (dto.outcome === 'refund') {
            const refundAmountMinor = dto.refundAmountMinor ?? txAmountMinor;
            if (!Number.isFinite(refundAmountMinor) || refundAmountMinor <= 0 || refundAmountMinor > txAmountMinor) {
              throw new BadRequestException('Invalid refundAmountMinor');
            }
            nextDisputeStatus = DisputeStatus.RESOLVED_FOR_BUYER;
            nextTxStatus = TransactionStatus.REFUND_PENDING;
            decision = {
              outcome: 'refund',
              justification: dto.justification,
              refundAmountMinor,
              currency: dto.currency ?? tx.currency ?? null,
              decidedByUserId: actor.userId,
              decidedAt: nowIso,
            };
          } else if (dto.outcome === 'partial_refund') {
            if (!dto.refundAmountMinor) throw new BadRequestException('Missing refundAmountMinor');
            if (!Number.isFinite(dto.refundAmountMinor) || dto.refundAmountMinor <= 0 || dto.refundAmountMinor > txAmountMinor) {
              throw new BadRequestException('Invalid refundAmountMinor');
            }
            nextDisputeStatus = DisputeStatus.PARTIAL_REFUND;
            nextTxStatus = TransactionStatus.REFUND_PENDING;
            decision = {
              outcome: 'partial_refund',
              justification: dto.justification,
              refundAmountMinor: dto.refundAmountMinor,
              currency: dto.currency ?? tx.currency ?? null,
              decidedByUserId: actor.userId,
              decidedAt: nowIso,
            };
          } else if (dto.outcome === 'release') {
            nextDisputeStatus = DisputeStatus.RESOLVED_FOR_SELLER;
            nextTxStatus = TransactionStatus.RELEASE_PENDING;
            decision = {
              outcome: 'release',
              justification: dto.justification,
              decidedByUserId: actor.userId,
              decidedAt: nowIso,
            };
          } else {
            nextDisputeStatus = DisputeStatus.REJECTED;
            nextTxStatus = txStatusFrom;
            decision = {
              outcome: 'reject',
              justification: dto.justification,
              decidedByUserId: actor.userId,
              decidedAt: nowIso,
            };
          }

          const fromStatus = dispute.status;
          const disputeVersion = dispute.version ?? 0;
          const disputeUpdate = await disputeRepo
            .createQueryBuilder()
            .update(Dispute)
            .set({
              status: nextDisputeStatus,
              decision,
              closedAt: new Date(),
              lastActorUserId: actor.userId,
              lastActorRole: role,
              version: () => 'COALESCE(version, 0) + 1',
            } as any)
            .where('id = :id AND status = :from AND (version = :version OR version IS NULL)', { id: dispute.id, from: fromStatus, version: disputeVersion })
            .execute();
          if (!disputeUpdate.affected) {
            const fresh = await disputeRepo.findOne({ where: { id: dispute.id } });
            if (!fresh) throw new NotFoundException('Dispute not found');
            if (fresh.status === nextDisputeStatus) return fresh;
            throw new BadRequestException('Concurrent dispute update detected');
          }
          const updated = await disputeRepo.findOne({ where: { id: dispute.id } });
          if (!updated) throw new NotFoundException('Dispute not found');

          if (nextTxStatus) {
            const txVersion = typeof (tx as any).version === 'number' ? (tx as any).version : 1;
            const res = await txRepo
              .createQueryBuilder()
              .update(Transaction)
              .set({ status: nextTxStatus, version: () => 'COALESCE(version, 0) + 1' } as any)
              .where('id = :id AND status = :from AND (version = :version OR version IS NULL)', { id: tx.id, from: TransactionStatus.DISPUTED, version: txVersion })
              .execute();
            if (!res.affected) {
              const freshTx = await txRepo.findOne({ where: { id: tx.id } });
              if (!freshTx) throw new NotFoundException('Transaction not found');
              if (freshTx.status !== nextTxStatus) throw new BadRequestException('Concurrent transaction update detected');
            }
          }

          await this.appendEvent(eventsRepo, dispute.id, {
            type: 'DISPUTE_RESOLVED',
            fromStatus,
            toStatus: updated.status,
            actor,
            before: { status: fromStatus, decision: null },
            after: { status: updated.status, decision },
            metadata: { txStatusFrom, txStatusTo: nextTxStatus },
          });

          await this.auditService.record({
            action: 'dispute.resolve',
            actorUserId: actor.userId,
            actorRole: UserRole.ADMIN,
            targetType: 'dispute',
            targetId: updated.id,
            before: { status: fromStatus },
            after: { status: updated.status, outcome: dto.outcome },
            outcome: 'ok',
          }, manager);

          return updated;
        });
        return { statusCode: 200, body: saved };
      },
    });

    const txId = (resolved as any)?.transactionId as string | undefined;
    if (txId) {
      if (dto.outcome === 'release') {
        await this.outboxService.enqueue({
          type: 'payout.initiate',
          dedupeKey: txId,
          payload: { transactionId: txId, actorUserId: actor.userId, actorRole: 'admin' },
        });
      }
      if (dto.outcome === 'refund' || dto.outcome === 'partial_refund') {
        await this.outboxService.enqueue({
          type: 'refund.initiate',
          dedupeKey: txId,
          payload: {
            transactionId: txId,
            amountInKobo: dto.outcome === 'partial_refund' ? dto.refundAmountMinor : dto.refundAmountMinor ?? null,
            actorUserId: actor.userId,
            actorRole: 'admin',
          },
        });
      }
    }
    return resolved;
  }

  private encryptAndStore(plain: Buffer, sha256: string) {
    const key = evidenceEncryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
    const tag = cipher.getAuthTag();

    const root = evidenceRootDir();
    let storedFileName = '';
    for (let i = 0; i < 5; i += 1) {
      const candidate = `${sha256}-${randomBytes(8).toString('hex')}.bin`;
      const fullPath = path.join(root, candidate);
      try {
        fs.writeFileSync(fullPath, ciphertext, { flag: 'wx' });
        storedFileName = candidate;
        break;
      } catch (e: any) {
        if (e?.code === 'EEXIST') continue;
        throw e;
      }
    }
    if (!storedFileName) {
      throw new ServiceUnavailableException('Evidence storage unavailable');
    }

    return {
      encryption: 'aes-256-gcm',
      ivB64: iv.toString('base64'),
      tagB64: tag.toString('base64'),
      storedFileName,
    };
  }

  decryptToBuffer(evidence: DisputeEvidence): Buffer {
    const root = evidenceRootDir();
    const fullPath = path.join(root, evidence.storedFileName);
    const rel = path.relative(root, fullPath);
    if (rel.startsWith('..') || path.isAbsolute(rel)) throw new NotFoundException('Evidence not found');
    if (!fs.existsSync(fullPath)) throw new NotFoundException('Evidence not found');
    const ciphertext = fs.readFileSync(fullPath);
    const key = evidenceEncryptionKey();
    const iv = Buffer.from(evidence.encryptionIvB64, 'base64');
    const tag = Buffer.from(evidence.encryptionTagB64, 'base64');
    if (evidence.encryption !== 'aes-256-gcm') throw new NotFoundException('Evidence not found');
    const decipher = createDecipheriv('aes-256-gcm', key, iv) as any;
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  async getEvidenceFile(disputeId: string, evidenceId: string, userId: string) {
    const d = await this.disputesRepo.findOne({ where: { id: disputeId } });
    if (!d) throw new NotFoundException('Dispute not found');
    if (d.buyerId !== userId && d.sellerId !== userId) throw new NotFoundException('Dispute not found');
    const e = await this.evidenceRepo.findOne({ where: { id: evidenceId, disputeId: d.id } });
    if (!e) throw new NotFoundException('Evidence not found');
    const buf = this.decryptToBuffer(e);
    const sha = createHash('sha256').update(buf).digest('hex');
    if (sha !== e.sha256) throw new BadRequestException('Evidence integrity check failed');
    return { buffer: buf, mimeType: e.mimeType, originalFileName: e.originalFileName };
  }

  private supportsRowLock(): boolean {
    return String((this.dataSource.options as any)?.type) === 'postgres';
  }

  private allowedTransitionsFor(role: 'buyer' | 'seller' | 'admin', from: DisputeStatus): DisputeStatus[] {
    const baseUser: Record<DisputeStatus, DisputeStatus[]> = {
      [DisputeStatus.NONE]: [DisputeStatus.OPENED],
      [DisputeStatus.OPENED]: [DisputeStatus.EVIDENCE_SUBMITTED_BY_BUYER, DisputeStatus.EVIDENCE_SUBMITTED_BY_SELLER, DisputeStatus.UNDER_REVIEW, DisputeStatus.AWAITING_ADMIN_REVIEW],
      [DisputeStatus.UNDER_REVIEW]: [DisputeStatus.EVIDENCE_SUBMITTED_BY_BUYER, DisputeStatus.EVIDENCE_SUBMITTED_BY_SELLER, DisputeStatus.AWAITING_ADMIN_REVIEW, DisputeStatus.IN_MEDIATION],
      [DisputeStatus.EVIDENCE_SUBMITTED_BY_BUYER]: [DisputeStatus.EVIDENCE_SUBMITTED_BY_SELLER, DisputeStatus.AWAITING_ADMIN_REVIEW, DisputeStatus.IN_MEDIATION],
      [DisputeStatus.EVIDENCE_SUBMITTED_BY_SELLER]: [DisputeStatus.EVIDENCE_SUBMITTED_BY_BUYER, DisputeStatus.AWAITING_ADMIN_REVIEW, DisputeStatus.IN_MEDIATION],
      [DisputeStatus.AWAITING_ADMIN_REVIEW]: [DisputeStatus.UNDER_REVIEW, DisputeStatus.IN_MEDIATION, DisputeStatus.ESCALATED_TO_ARBITRATION],
      [DisputeStatus.IN_MEDIATION]: [DisputeStatus.ESCALATED_TO_ARBITRATION, DisputeStatus.AWAITING_ADMIN_REVIEW],
      [DisputeStatus.ESCALATED_TO_ARBITRATION]: [DisputeStatus.AWAITING_ADMIN_REVIEW],
      [DisputeStatus.RESOLVED_FOR_BUYER]: [DisputeStatus.CLOSED],
      [DisputeStatus.RESOLVED_FOR_SELLER]: [DisputeStatus.CLOSED],
      [DisputeStatus.PARTIAL_REFUND]: [DisputeStatus.CLOSED],
      [DisputeStatus.REJECTED]: [DisputeStatus.CLOSED],
      [DisputeStatus.CLOSED]: [],
    };
    if (role === 'admin') {
      return Array.from(new Set([
        ...(baseUser[from] || []),
        DisputeStatus.UNDER_REVIEW,
        DisputeStatus.AWAITING_ADMIN_REVIEW,
        DisputeStatus.IN_MEDIATION,
        DisputeStatus.ESCALATED_TO_ARBITRATION,
        DisputeStatus.RESOLVED_FOR_BUYER,
        DisputeStatus.RESOLVED_FOR_SELLER,
        DisputeStatus.PARTIAL_REFUND,
        DisputeStatus.REJECTED,
        DisputeStatus.CLOSED,
      ])).filter((s) => s !== from);
    }
    if (role === 'buyer') {
      if (from === DisputeStatus.OPENED || from === DisputeStatus.UNDER_REVIEW || from === DisputeStatus.EVIDENCE_SUBMITTED_BY_SELLER) {
        return [DisputeStatus.EVIDENCE_SUBMITTED_BY_BUYER, ...baseUser[from]];
      }
    }
    if (role === 'seller') {
      if (from === DisputeStatus.OPENED || from === DisputeStatus.UNDER_REVIEW || from === DisputeStatus.EVIDENCE_SUBMITTED_BY_BUYER) {
        return [DisputeStatus.EVIDENCE_SUBMITTED_BY_SELLER, ...baseUser[from]];
      }
    }
    return baseUser[from] || [];
  }

  private async tryTransitionDispute(disputeRepo: Repository<Dispute>, dispute: Dispute, to: DisputeStatus, actor: Actor) {
    const role = normalizeRole(actor.role);
    const from = dispute.status;
    if (from === to) return { updated: dispute, fromStatus: from };
    const allowed = this.allowedTransitionsFor(role, from);
    if (!allowed.includes(to)) {
      throw new BadRequestException('Invalid dispute transition');
    }
    const version = dispute.version ?? 0;
    const res = await disputeRepo.createQueryBuilder()
      .update(Dispute)
      .set({
        status: to,
        lastActorUserId: actor.userId,
        lastActorRole: role,
        version: () => 'COALESCE(version, 0) + 1',
      } as any)
      .where('id = :id AND status = :from AND (version = :version OR version IS NULL)', { id: dispute.id, from, version })
      .execute();
    if (!res.affected) {
      const fresh = await disputeRepo.findOne({ where: { id: dispute.id } });
      if (!fresh) throw new NotFoundException('Dispute not found');
      if (fresh.status === to) return { updated: fresh, fromStatus: from };
      throw new BadRequestException('Concurrent dispute update detected');
    }
    const updated = await disputeRepo.findOne({ where: { id: dispute.id } });
    if (!updated) throw new NotFoundException('Dispute not found');
    return { updated, fromStatus: from };
  }

  private async appendEvent(
    eventsRepo: Repository<DisputeEvent>,
    disputeId: string,
    input: {
      type: string;
      fromStatus: DisputeStatus | string | null;
      toStatus: DisputeStatus | string | null;
      actor: Actor;
      before: Record<string, unknown> | null;
      after: Record<string, unknown> | null;
      metadata: Record<string, unknown> | null;
    },
  ) {
    const ctx = getRequestContext();
    const last = await eventsRepo.findOne({ where: { disputeId }, order: { seq: 'DESC' } });
    const seq = (last?.seq ?? 0) + 1;
    const prevHash = last?.hash ?? null;
    const ts = new Date();
    const tsIso = ts.toISOString();
    const payload = [
      prevHash ?? '',
      disputeId,
      String(seq),
      input.type,
      input.fromStatus ?? '',
      input.toStatus ?? '',
      input.actor.userId ?? '',
      normalizeRole(input.actor.role) ?? '',
      ctx?.requestId ?? '',
      JSON.stringify(input.before ?? null),
      JSON.stringify(input.after ?? null),
      JSON.stringify(input.metadata ?? null),
      tsIso,
    ].join('|');
    const hash = createHash('sha256').update(payload).digest('hex');
    const ev = eventsRepo.create({
      disputeId,
      seq,
      type: input.type,
      fromStatus: input.fromStatus ? String(input.fromStatus) : null,
      toStatus: input.toStatus ? String(input.toStatus) : null,
      actorUserId: input.actor.userId ?? null,
      actorRole: normalizeRole(input.actor.role) ?? null,
      requestId: ctx?.requestId ?? null,
      ip: ctx?.ip ?? null,
      deviceId: input.actor.deviceId ?? null,
      userAgent: ctx?.userAgent ?? null,
      before: input.before,
      after: input.after,
      metadata: input.metadata,
      prevHash,
      hash,
      createdAt: ts,
    });
    await eventsRepo.save(ev);
    return ev;
  }
}
