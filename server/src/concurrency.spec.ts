import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AppModule } from './app.module';
import { User, UserRole } from './users/user.entity';
import { Transaction, TransactionStatus } from './transactions/transaction.entity';

function csrfFromSetCookie(setCookie: string[] | undefined) {
  const cookie = (setCookie || []).find((c) => c.startsWith('csrf_token='));
  if (!cookie) return '';
  return decodeURIComponent(cookie.split(';')[0]!.split('=')[1] || '');
}

describe('concurrency safety', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    process.env.DB_TYPE = 'sqlite';
    process.env.SQLITE_PATH = ':memory:';
    process.env.TYPEORM_SYNCHRONIZE = 'true';
    process.env.ENABLE_SEED = 'false';
    process.env.RL_DEFAULT_PER_MIN = '1000';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('prevents conflicting shipping updates', async () => {
    const usersRepo = app.get(getRepositoryToken(User));
    const txRepo = app.get(getRepositoryToken(Transaction));

    const password = 'password1234';
    const passwordHash = await bcrypt.hash(password, await bcrypt.genSalt());

    const admin = await usersRepo.save(
      usersRepo.create({
        email: 'admin@example.com',
        fullName: 'Admin',
        username: 'admin',
        passwordHash,
        role: UserRole.ADMIN,
        isVerified: true,
      }),
    );

    const seller = await usersRepo.save(
      usersRepo.create({
        email: 'seller@example.com',
        fullName: 'Seller',
        username: 'seller',
        passwordHash,
        role: UserRole.SELLER,
        isVerified: true,
        trustyTag: '@seller',
      }),
    );

    expect(admin.id).toBeTruthy();
    expect(seller.id).toBeTruthy();

    const buyerAgent = request.agent(app.getHttpServer());
    const buyerReg = await buyerAgent
      .post('/api/auth/register')
      .send({ email: 'buyer@example.com', password, fullName: 'Buyer' })
      .expect(201);
    const buyerCsrf = csrfFromSetCookie(buyerReg.headers['set-cookie'] as any);

    const created = await buyerAgent
      .post('/api/transactions')
      .set('x-csrf-token', buyerCsrf)
      .send({ sellerId: seller.id, amount: 1000, description: 'Test' })
      .expect(201);

    const txId = created.body?.id as string;
    expect(txId).toBeTruthy();

    await txRepo.update(txId, { status: TransactionStatus.FUNDED });

    const sellerAgent = request.agent(app.getHttpServer());
    const sellerLogin = await sellerAgent
      .post('/api/auth/login')
      .send({ email: seller.email, password })
      .expect(201);
    const sellerCsrf = csrfFromSetCookie(sellerLogin.headers['set-cookie'] as any);

    const r1 = sellerAgent
      .patch(`/api/transactions/${txId}/shipping`)
      .set('x-csrf-token', sellerCsrf)
      .send({ trackingId: 'TRK-111111' });

    const r2 = sellerAgent
      .patch(`/api/transactions/${txId}/shipping`)
      .set('x-csrf-token', sellerCsrf)
      .send({ trackingId: 'TRK-222222' });

    const [a, b] = await Promise.all([r1, r2]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([400, 200]);
  });
});

