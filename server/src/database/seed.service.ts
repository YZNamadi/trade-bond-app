import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    const enabled = process.env.ENABLE_SEED === 'true';
    const isProd = process.env.NODE_ENV === 'production';
    await this.bootstrapAdminIfConfigured();
    if (!enabled || isProd) return;
    await this.seedUsers();
  }

  private async bootstrapAdminIfConfigured() {
    const allow = String(process.env.BOOTSTRAP_ADMIN || '').toLowerCase() === 'true';
    if (!allow) return;
    const isProd = process.env.NODE_ENV === 'production';
    const email = String(process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
    const password = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || '');
    if (!email || !email.includes('@')) return;
    const resetPasswordDefault = isProd ? 'false' : 'true';
    const resetPassword = String(process.env.BOOTSTRAP_ADMIN_RESET_PASSWORD || resetPasswordDefault).toLowerCase() === 'true';
    const allowMultipleAdmins = String(process.env.BOOTSTRAP_ADMIN_ALLOW_MULTIPLE || 'false').toLowerCase() === 'true';
    const minPasswordLength = isProd ? 14 : 8;

    const existingAdmin = await this.usersRepository.findOne({ where: { role: UserRole.ADMIN } as any });
    if (existingAdmin && !allowMultipleAdmins) {
      const adminEmail = String((existingAdmin as any)?.email || '').trim().toLowerCase();
      if (adminEmail && adminEmail !== email) return;
    }

    const existingUser = await this.usersRepository.findOne({ where: { email } as any });
    if (existingUser) {
      const updates: Partial<User> = {};
      if (existingUser.role !== UserRole.ADMIN) updates.role = UserRole.ADMIN;
      if (existingUser.isVerified !== true) (updates as any).isVerified = true;

      if (resetPassword) {
        if (password.length < minPasswordLength) return;
        const salt = await bcrypt.genSalt();
        const passwordHash = await bcrypt.hash(password, salt);
        (updates as any).passwordHash = passwordHash;
      }

      if (Object.keys(updates).length > 0) {
        await this.usersRepository.update(existingUser.id, updates as any);
      }
      return;
    }

    if (password.length < minPasswordLength) return;
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);
    const user = this.usersRepository.create({
      email,
      fullName: 'Admin',
      username: null as any,
      passwordHash,
      role: UserRole.ADMIN,
      isVerified: true,
      phone: null as any,
    } as any);
    await this.usersRepository.save(user);
  }

  async seedUsers() {
    const users = [
      {
        email: 'chidi@example.com',
        fullName: 'Chidi Okafor',
        username: 'chidi',
        password: 'password123',
        role: UserRole.BUYER,
        phone: '+234 812 345 6789',
      },
      {
        email: 'gadgetking@example.com',
        fullName: 'GadgetKing',
        username: 'gadgetking',
        password: 'password123',
        role: UserRole.SELLER,
        phone: '+234 809 988 7766',
        isVerified: true,
        trustyTag: '@official_gadgets',
      },
      {
        email: 'techhub@example.com',
        fullName: 'TechHub Lagos',
        username: 'techhub_lagos',
        password: 'password123',
        role: UserRole.SELLER,
        phone: '+234 809 111 2222',
        isVerified: true,
        trustyTag: '@techhaven.ng',
      }
    ];

    for (const userData of users) {
      const existingUser = await this.usersRepository.findOne({ where: { email: userData.email } });
      if (!existingUser) {
        const salt = await bcrypt.genSalt();
        const passwordHash = await bcrypt.hash(userData.password, salt);
        
        const user = this.usersRepository.create({
          ...userData,
          passwordHash,
        });
        await this.usersRepository.save(user);
        console.log(`Seeded user: ${userData.email}`);
      } else {
        const next: Partial<User> = {};
        const desiredTrustyTag = (userData as any).trustyTag as string | undefined;
        if (desiredTrustyTag) {
          const raw = String(desiredTrustyTag).trim();
          const withAt = raw.startsWith('@') ? raw : `@${raw}`;
          const normalized = withAt.replace(/\s+/g, '');
          if (!existingUser.trustyTag) {
            (next as any).trustyTag = normalized;
          }
          if (!existingUser.trustyTagLower) {
            (next as any).trustyTagLower = normalized.toLowerCase();
          }
        }
        if (userData.isVerified === true && existingUser.isVerified !== true) {
          next.isVerified = true;
        }
        if (Object.keys(next).length > 0) {
          await this.usersRepository.update(existingUser.id, next);
        }
      }
    }
  }
}
