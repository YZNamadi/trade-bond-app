import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AuthSession } from './auth-session.entity';
import { RegisterDto } from './dto/register.dto';
import { User, UserRole } from '../users/user.entity';
import { AuditService } from '../common/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectRepository(AuthSession)
    private authSessionsRepository: Repository<AuthSession>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private auditService: AuditService,
  ) {}

  private isLocked(user: User) {
    if (!user.lockedUntil) return false;
    return new Date(user.lockedUntil).getTime() > Date.now();
  }

  async validateUser(email: string, pass: string, ctx?: { ip: string | null; userAgent: string | null }): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    if (this.isLocked(user)) {
      await this.auditService.record({
        action: 'auth.login.locked',
        actorUserId: user.id,
        actorRole: user.role,
        targetType: 'user',
        targetId: user.id,
        ip: ctx?.ip ?? null,
        userAgent: ctx?.userAgent ?? null,
        outcome: 'denied',
      });
      throw new UnauthorizedException('Account temporarily locked');
    }
    const ok = await bcrypt.compare(pass, user.passwordHash);
    if (!ok) {
      const failed = (user.failedLoginCount || 0) + 1;
      const lockThreshold = Number(process.env.AUTH_LOCK_THRESHOLD || 8);
      const lockMinutes = Number(process.env.AUTH_LOCK_MINUTES || 15);
      const lockedUntil = failed >= lockThreshold ? new Date(Date.now() + lockMinutes * 60 * 1000) : null;
      await this.usersRepository.update(user.id, {
        failedLoginCount: failed,
        lockedUntil,
      });
      await this.auditService.record({
        action: 'auth.login.failed',
        actorUserId: user.id,
        actorRole: user.role,
        targetType: 'user',
        targetId: user.id,
        ip: ctx?.ip ?? null,
        userAgent: ctx?.userAgent ?? null,
        outcome: lockedUntil ? 'locked' : 'denied',
      });
      return null;
    }
    await this.usersRepository.update(user.id, {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: ctx?.ip || null,
      lastLoginUserAgent: ctx?.userAgent || null,
    });
    await this.auditService.record({
      action: 'auth.login.success',
      actorUserId: user.id,
      actorRole: user.role,
      targetType: 'user',
      targetId: user.id,
      ip: ctx?.ip ?? null,
      userAgent: ctx?.userAgent ?? null,
      outcome: 'ok',
    });
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
      ...result
    } = user as any;
    return result;
  }

  private signAccessToken(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return this.jwtService.sign(payload, { expiresIn: '15m' });
  }

  private signRefreshToken(user: any, sessionId: string) {
    const payload = { sub: user.id, sid: sessionId, typ: 'refresh' };
    return this.jwtService.sign(payload, { expiresIn: '30d' });
  }

  private async hashToken(token: string) {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(token, salt);
  }

  async login(user: any, ctx: { deviceId: string; ip: string | null; userAgent: string | null }) {
    const accessToken = this.signAccessToken(user);
    const session = this.authSessionsRepository.create({
      userId: user.id,
      deviceId: ctx.deviceId,
      refreshTokenHash: '',
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      revokedAt: null,
    });
    const savedSession = await this.authSessionsRepository.save(session);
    const refreshToken = this.signRefreshToken(user, savedSession.id);
    const refreshTokenHash = await this.hashToken(refreshToken);
    await this.authSessionsRepository.update(savedSession.id, { refreshTokenHash });
    await this.auditService.record({
      action: 'auth.session.created',
      actorUserId: user.id,
      actorRole: user.role,
      targetType: 'auth_session',
      targetId: savedSession.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      outcome: 'ok',
    });
    return { accessToken, refreshToken, user };
  }

  async register(body: RegisterDto, ctx: { deviceId: string; ip: string | null; userAgent: string | null }) {
    const existingUser = await this.usersService.findByEmail(body.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    if (body.username) {
      const existingUsername = await this.usersService.findByUsername(body.username);
      if (existingUsername) {
        throw new ConflictException('Username already exists');
      }
    }

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(body.password, salt);
    
    const newUser = await this.usersService.create({
      email: body.email,
      fullName: (body.fullName || body.name || '').trim(),
      username: body.username,
      passwordHash,
      role: UserRole.BUYER,
      isVerified: false,
    });

    const { passwordHash: _, ...result } = newUser;
    const { accessToken, refreshToken, user } = await this.login(result, ctx);
    await this.auditService.record({
      action: 'auth.register.success',
      actorUserId: user.id,
      actorRole: user.role,
      targetType: 'user',
      targetId: user.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      outcome: 'ok',
    });
    return { accessToken, refreshToken, user };
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) return null;
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

  private decodeRefresh(refreshToken: string): { userId: string; sessionId: string } {
    const decoded: any = this.jwtService.verify(refreshToken);
    const userId = decoded?.sub as string | undefined;
    const sessionId = decoded?.sid as string | undefined;
    if (!decoded || decoded.typ !== 'refresh' || !userId || !sessionId) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return { userId, sessionId };
  }

  async refresh(refreshToken: string, ctx: { deviceId: string; ip: string | null; userAgent: string | null }) {
    const decoded = this.decodeRefresh(refreshToken);
    const session = await this.authSessionsRepository.findOne({ where: { id: decoded.sessionId, userId: decoded.userId } });
    if (!session || session.revokedAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (session.deviceId !== ctx.deviceId) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const ok = await bcrypt.compare(refreshToken, session.refreshTokenHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(decoded.userId);
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }
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
      ...safeUser
    } = user as any;
    const accessToken = this.signAccessToken(safeUser);
    const nextRefreshToken = this.signRefreshToken(safeUser, decoded.sessionId);
    const nextHash = await this.hashToken(nextRefreshToken);
    await this.authSessionsRepository.update(decoded.sessionId, {
      refreshTokenHash: nextHash,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    await this.auditService.record({
      action: 'auth.session.refresh',
      actorUserId: safeUser.id,
      actorRole: safeUser.role,
      targetType: 'auth_session',
      targetId: decoded.sessionId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      outcome: 'ok',
    });
    return { accessToken, refreshToken: nextRefreshToken, user: safeUser };
  }

  async logout(userId: string) {
    await this.authSessionsRepository.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
    const user = await this.usersService.findAuthUserById(userId);
    await this.auditService.record({
      action: 'auth.logout',
      actorUserId: userId,
      actorRole: user?.role ?? null,
      targetType: 'user',
      targetId: userId,
      outcome: 'ok',
    });
  }

  decodeRefreshTokenSubject(refreshToken: string): string | null {
    try {
      return this.decodeRefresh(refreshToken).userId;
    } catch {
      return null;
    }
  }
}
