import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { User, UserRole } from './users/user.entity';
import { Transaction, TransactionStatus } from './transactions/transaction.entity';
import { PaystackService } from './paystack/paystack.service';
import { OutboxService } from './common/outbox.service';
import { OutboxJob } from './common/outbox-job.entity';

function csrfFromSetCookie(setCookie: string[] | undefined) {
  const cookie = (setCookie || []).find((c) => c.startsWith('csrf_token='));
  if (!cookie) return '';
  return decodeURIComponent(cookie.split(';')[0]!.split('=')[1] || '');
}

describe('payments and outbox hardening', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    process.env.DB_TYPE = 'sqlite';
    process.env.SQLITE_PATH = ':memory:';
    process.env.TYPEORM_SYNCHRONIZE = 'true';
    process.env.ENABLE_SEED = 'false';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app as any);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('keeps payment pending until provider confirms success', async () => {
    const usersRepo = app.get(getRepositoryToken(User));
    const txRepo = app.get(getRepositoryToken(Transaction));
    const paystack = app.get(PaystackService);

    const password = 'password1234';
    const passwordHash = await bcrypt.hash(password, await bcrypt.genSalt());
    const seller = await usersRepo.save(
      usersRepo.create({
        email: 'verified-seller@example.com',
        fullName: 'Verified Seller',
        username: 'verifiedseller',
        passwordHash,
        role: UserRole.SELLER,
        isVerified: true,
        trustyTag: '@verifiedseller',
      }),
    );

    jest.spyOn(paystack, 'initializeTransaction').mockResolvedValue({
      authorization_url: 'https://paystack.test/checkout',
      access_code: 'access-code',
      reference: 'TT_TEST_REF',
    } as any);

    const verifySpy = jest.spyOn(paystack, 'verifyTransaction');
    verifySpy
      .mockResolvedValueOnce({ status: true, data: { status: 'pending' } } as any)
      .mockResolvedValueOnce({
        status: true,
        data: {
          status: 'success',
          id: 'provider-tx-1',
          amount: 250000,
          currency: 'NGN',
          customer: { email: 'buyer@example.com' },
        },
      } as any);

    const buyerAgent = request.agent(app.getHttpServer());
    const buyerReg = await buyerAgent
      .post('/api/auth/register')
      .send({ email: 'buyer@example.com', password, fullName: 'Buyer Person' })
      .expect(201);
    const csrf = csrfFromSetCookie(buyerReg.headers['set-cookie'] as any);

    const created = await buyerAgent
      .post('/api/transactions')
      .set('x-csrf-token', csrf)
      .send({ sellerId: seller.id, amount: 2500, description: 'Laptop' })
      .expect(201);

    const txId = created.body.id as string;
    const init = await buyerAgent
      .post(`/api/transactions/${txId}/pay`)
      .set('x-csrf-token', csrf)
      .send({})
      .expect(200);

    const reference = init.body.reference as string;

    const pendingVerify = await buyerAgent
      .post(`/api/transactions/${txId}/verify`)
      .set('x-csrf-token', csrf)
      .send({ reference })
      .expect(200);

    expect(pendingVerify.body.funded).toBe(false);
    expect(pendingVerify.body.paymentStatus).toBe('pending');
    expect(pendingVerify.body.transaction.status).toBe('CREATED');

    const pendingTx = await txRepo.findOne({ where: { id: txId } });
    expect(pendingTx?.status).toBe(TransactionStatus.CREATED);

    const fundedVerify = await buyerAgent
      .post(`/api/transactions/${txId}/verify`)
      .set('x-csrf-token', csrf)
      .send({ reference })
      .expect(200);

    expect(fundedVerify.body.funded).toBe(true);
    expect(fundedVerify.body.paymentStatus).toBe('success');
    expect(fundedVerify.body.transaction.status).toBe('FUNDED');
  });

  it('reactivates completed outbox jobs when retried with the same dedupe key', async () => {
    const outbox = app.get(OutboxService);
    const jobsRepo = app.get(getRepositoryToken(OutboxJob));

    const first = await outbox.enqueue({
      type: 'refund.verify',
      dedupeKey: 'tx-retry-1',
      payload: { transactionId: 'tx-retry-1' },
    });
    await jobsRepo.update(first.id, { status: 'DONE', attempts: 3 } as any);

    const retried = await outbox.enqueue({
      type: 'refund.verify',
      dedupeKey: 'tx-retry-1',
      payload: { transactionId: 'tx-retry-1', retry: true },
    });

    expect(retried.id).toBe(first.id);
    const refreshed = await jobsRepo.findOne({ where: { id: first.id } as any });
    expect(refreshed?.status).toBe('PENDING');
    expect(refreshed?.attempts).toBe(0);
    expect((refreshed?.payload as any)?.retry).toBe(true);
  });
});
