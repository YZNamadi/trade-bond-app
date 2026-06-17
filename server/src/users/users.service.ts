import { BadRequestException, ConflictException, Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { User, UserRole } from './user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SellerOnboardingRequest, SellerOnboardingStatus } from './seller-onboarding.entity';
import { ApplySellerDto } from './dto/apply-seller.dto';
import { AuditService } from '../common/audit.service';
import { PaystackService } from '../paystack/paystack.service';

type SafeUser = Omit<User, 'passwordHash' | 'syncTrustyTag'>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(SellerOnboardingRequest)
    private sellerOnboardingRepository: Repository<SellerOnboardingRequest>,
    private auditService: AuditService,
    private paystackService: PaystackService,
  ) {}

  private toSafeUser(user: User) {
    const {
      passwordHash,
      refreshTokenHash,
      bankName,
      accountNumber,
      accountName,
      bankCode,
      bankAccountLast4,
      bankVerifiedAt,
      paystackTransferRecipientCode,
      ...safe
    } = user as any;
    return safe;
  }

  async create(userData: Partial<User>): Promise<User> {
    if (userData.email) {
      const existingUser = await this.findByEmail(userData.email);
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
    }
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findAuthUserById(id: string): Promise<Pick<User, 'id' | 'email' | 'role'> | null> {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: ['id', 'email', 'role'],
    });
    return user ?? null;
  }

  async update(id: string, updateData: Partial<User>): Promise<SafeUser> {
    const hasTrustyUpdate = 'trustyTag' in (updateData as any) || 'trustyTagLower' in (updateData as any);
    if (hasTrustyUpdate) {
      const existing = await this.findById(id);
      if (!existing) throw new Error("User not found");

      if (existing.trustyTag) {
        const nextTrustyTag = (updateData as any).trustyTag as string | undefined;
        const nextLower = (updateData as any).trustyTagLower as string | undefined;
        if (nextTrustyTag && existing.trustyTag !== nextTrustyTag) throw new BadRequestException('TrustyTag cannot be changed');
        if (nextLower && existing.trustyTagLower !== nextLower) throw new BadRequestException('TrustyTag cannot be changed');
        delete (updateData as any).trustyTag;
        delete (updateData as any).trustyTagLower;
      } else {
        if (existing.role !== UserRole.SELLER || !existing.isVerified) {
          throw new BadRequestException('TrustyTag is not available');
        }
        const raw = String((updateData as any).trustyTag || '').trim();
        if (!raw) {
          delete (updateData as any).trustyTag;
          delete (updateData as any).trustyTagLower;
        } else {
          const withAt = raw.startsWith('@') ? raw : `@${raw}`;
          const normalized = withAt.replace(/\s+/g, '');
          (updateData as any).trustyTag = normalized;
          (updateData as any).trustyTagLower = normalized.toLowerCase();
        }
      }
    }
    await this.usersRepository.update(id, updateData);
    const user = await this.findById(id);
    if (!user) throw new Error("User not found");
    return this.toSafeUser(user) as SafeUser;
  }

  async setRefreshTokenHash(userId: string, refreshTokenHash: string | null) {
    await this.usersRepository.update(userId, { refreshTokenHash });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<SafeUser> {
    const updateData: Partial<User> = {};
    if (dto.fullName !== undefined) updateData.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) updateData.phone = dto.phone.trim();
    await this.usersRepository.update(userId, updateData);
    const user = await this.findById(userId);
    if (!user) throw new Error('User not found');
    return this.toSafeUser(user) as SafeUser;
  }

  private normalizeTrustyTag(input: string) {
    const raw = String(input || '').trim();
    const withAt = raw.startsWith('@') ? raw : `@${raw}`;
    return withAt.replace(/\s+/g, '');
  }

  async applyForSeller(userId: string, dto: ApplySellerDto) {
    const user = await this.findById(userId);
    if (!user) throw new Error('User not found');
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Not allowed');
    }
    if (user.role === UserRole.SELLER) {
      throw new BadRequestException('Already a seller');
    }
    const existing = await this.sellerOnboardingRepository.findOne({
      where: { userId, status: SellerOnboardingStatus.PENDING },
    });
    if (existing) {
      return existing;
    }
    const desired = dto.desiredTrustyTag ? this.normalizeTrustyTag(dto.desiredTrustyTag) : null;
    const req = this.sellerOnboardingRepository.create({
      userId,
      status: SellerOnboardingStatus.PENDING,
      desiredTrustyTag: desired,
      bankName: dto.bankName,
      accountNumber: dto.accountNumber,
      accountName: dto.accountName,
      reviewedByUserId: null,
      reviewedAt: null,
      reviewNote: null,
    });
    const saved = await this.sellerOnboardingRepository.save(req);
    await this.auditService.record({
      action: 'seller.onboarding.apply',
      actorUserId: userId,
      actorRole: user.role,
      targetType: 'seller_onboarding_request',
      targetId: saved.id,
      after: { status: saved.status, desiredTrustyTag: saved.desiredTrustyTag },
      outcome: 'ok',
    });
    return saved;
  }

  async listSellerOnboardingRequests(status?: SellerOnboardingStatus) {
    const where = status ? { status } : {};
    const list = await this.sellerOnboardingRepository.find({
      where: where as any,
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return list.map((r) => ({
      id: r.id,
      userId: r.userId,
      status: r.status,
      desiredTrustyTag: r.desiredTrustyTag,
      reviewedByUserId: r.reviewedByUserId,
      reviewedAt: r.reviewedAt,
      reviewNote: r.reviewNote,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      bankName: r.bankName ? String(r.bankName) : null,
      accountName: r.accountName ? String(r.accountName) : null,
      accountNumberLast4: r.accountNumber ? String(r.accountNumber).replace(/[^\d]/g, '').slice(-4) : null,
    }));
  }

  async reviewSellerOnboardingRequest(input: { requestId: string; adminUserId: string; approve: boolean; note?: string | null }) {
    const req = await this.sellerOnboardingRepository.findOne({ where: { id: input.requestId } });
    if (!req) throw new BadRequestException('Request not found');
    if (req.status !== SellerOnboardingStatus.PENDING) {
      return req;
    }
    const nextStatus = input.approve ? SellerOnboardingStatus.APPROVED : SellerOnboardingStatus.REJECTED;
    req.status = nextStatus;
    req.reviewedByUserId = input.adminUserId;
    req.reviewedAt = new Date();
    req.reviewNote = input.note ? String(input.note).slice(0, 500) : null;
    const saved = await this.sellerOnboardingRepository.save(req);

    if (nextStatus === SellerOnboardingStatus.APPROVED) {
      const desired = saved.desiredTrustyTag ? this.normalizeTrustyTag(saved.desiredTrustyTag) : null;
      const desiredLower = desired ? desired.toLowerCase() : null;
      await this.usersRepository.update(saved.userId, {
        role: UserRole.SELLER,
        isVerified: true,
        trustyTag: desired,
        trustyTagLower: desiredLower,
        bankName: saved.bankName,
        accountNumber: saved.accountNumber,
        accountName: saved.accountName,
      } as any);
    }

    await this.auditService.record({
      action: 'seller.onboarding.review',
      actorUserId: input.adminUserId,
      actorRole: UserRole.ADMIN,
      targetType: 'seller_onboarding_request',
      targetId: saved.id,
      after: { status: saved.status },
      outcome: input.approve ? 'approved' : 'rejected',
    });
    return saved;
  }

  async findAllSellers(query: string): Promise<User[]> {
    return this.usersRepository.find({
      where: [
        { role: UserRole.SELLER, isVerified: true, fullName: Like(`%${query}%`) },
        { role: UserRole.SELLER, isVerified: true, username: Like(`%${query}%`) },
        { role: UserRole.SELLER, isVerified: true, email: Like(`%${query}%`) }
      ],
      select: ['id', 'email', 'fullName', 'username', 'phone', 'role', 'isVerified', 'trustyTag', 'createdAt'],
    });
  }

  async findVerifiedSellerByTrustyTag(
    tag: string,
  ): Promise<{ id: string; fullName: string; username: string | null; trustyTag: string | null; createdAt: Date } | null> {
    const key = this.normalizeTrustyTag(tag).toLowerCase();
    const user = await this.usersRepository.findOne({
      where: { role: UserRole.SELLER, isVerified: true, trustyTagLower: key },
      select: ['id', 'fullName', 'username', 'role', 'isVerified', 'trustyTag', 'createdAt'],
    });
    if (!user) return null;
    return {
      id: user.id,
      fullName: user.fullName,
      username: user.username ?? null,
      trustyTag: user.trustyTag ?? null,
      createdAt: user.createdAt,
    };
  }

  async getMyBankAccount(userId: string) {
    const user = await this.findById(userId);
    if (!user) throw new Error('User not found');
    const linked = Boolean(user.paystackTransferRecipientCode && user.bankVerifiedAt && user.bankCode && user.bankAccountLast4);
    return {
      linked,
      bankName: user.bankName ? String(user.bankName) : null,
      bankCode: user.bankCode ? String(user.bankCode) : null,
      accountName: user.accountName ? String(user.accountName) : null,
      accountNumberMasked: user.bankAccountLast4 ? `******${String(user.bankAccountLast4)}` : null,
      verifiedAt: user.bankVerifiedAt ? user.bankVerifiedAt.toISOString() : null,
    };
  }

  async updateMyBankAccount(
    userId: string,
    input: { bankCode: string; accountNumber: string; accountName?: string | undefined | null },
    ctx: { ip: string | null; userAgent: string | null },
  ) {
    const user = await this.findById(userId);
    if (!user) throw new Error('User not found');
    if (user.role !== UserRole.SELLER) {
      throw new ForbiddenException('Only sellers can link bank accounts');
    }
    if (!user.isVerified) {
      throw new BadRequestException('Seller verification required');
    }
    const accountNumber = String(input.accountNumber || '').replace(/[^\d]/g, '');
    const bankCode = String(input.bankCode || '').trim();
    if (accountNumber.length !== 10) {
      throw new BadRequestException('Invalid account number');
    }
    if (!bankCode) {
      throw new BadRequestException('Invalid bank code');
    }

    const banks = await this.paystackService.listBanks('NGN');
    const bank = (banks || []).find((b: any) => String(b?.code || '') === bankCode) || null;
    if (!bank) {
      throw new BadRequestException('Unsupported bank');
    }

    const resolved = await this.paystackService.resolveAccountNumber(accountNumber, bankCode);
    const resolvedName = String(resolved?.account_name || '').trim();
    if (!resolvedName) {
      throw new BadRequestException('Account could not be verified');
    }
    const providedName = input.accountName ? String(input.accountName).trim() : '';
    if (providedName) {
      const a = providedName.toLowerCase().replace(/\s+/g, ' ').trim();
      const b = resolvedName.toLowerCase().replace(/\s+/g, ' ').trim();
      if (a !== b) {
        throw new BadRequestException('Account name does not match bank records');
      }
    }

    const recipient = await this.paystackService.createTransferRecipient({
      name: resolvedName,
      accountNumber,
      bankCode,
      currency: 'NGN',
      idempotencyKey: `tt_recipient_${userId}_${bankCode}_${accountNumber}`,
    });
    const recipientCode = String(recipient?.recipient_code || '').trim();
    if (!recipientCode) {
      throw new BadRequestException('Recipient setup failed');
    }

    const last4 = accountNumber.slice(-4);
    await this.usersRepository.update(userId, {
      bankName: String(bank?.name || ''),
      bankCode,
      accountNumber,
      accountName: resolvedName,
      bankAccountLast4: last4,
      bankVerifiedAt: new Date(),
      paystackTransferRecipientCode: recipientCode,
    } as any);

    await this.auditService.record({
      action: 'seller.bank_account.link',
      actorUserId: userId,
      actorRole: user.role,
      targetType: 'user',
      targetId: userId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      after: { bankCode, accountName: resolvedName, accountLast4: last4 },
      outcome: 'ok',
    });

    return this.getMyBankAccount(userId);
  }
}
