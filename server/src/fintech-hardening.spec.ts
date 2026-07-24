import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createHmac } from 'crypto';
import * as bcrypt from 'bcrypt';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { User, UserRole } from './users/user.entity';
import { SellerOnboardingRequest, SellerOnboardingStatus } from './users/seller-onboarding.entity';
import { Transaction, TransactionStatus } from './transactions/transaction.entity';
import { ProviderEvent } from './money/provider-event.entity';
import { TransactionsService } from './transactions/transactions.service';
import { UsersService } from './users/users.service';

function signAnchor(body: string, token: string) {
  const hexDigest = createHmac('sha1', token).update(Buffer.from(body)).digest('hex');
  return Buffer.from(hexDigest).toString('base64');
}

describe('fintech hardening regressions', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    process.env.DB_TYPE = 'sqlite';
    process.env.SQLITE_PATH = ':memory:';
    process.env.TYPEORM_SYNCHRONIZE = 'true';
    process.env.ENABLE_SEED = 'false';
    process.env.ANCHOR_WEBHOOK_TOKEN = 'anchor-test-token';

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

  it('dedupes Anchor webhook replay after the provider event is marked processed', async () => {
    const usersRepo = app.get(getRepositoryToken(User));
    const txRepo = app.get(getRepositoryToken(Transaction));
    const eventsRepo = app.get(getRepositoryToken(ProviderEvent));
    const passwordHash = await bcrypt.hash('password1234', await bcrypt.genSalt());

    const buyer = await usersRepo.save(
      usersRepo.create({
        email: 'anchor-buyer@example.com',
        fullName: 'Anchor Buyer',
        username: 'anchorbuyer',
        passwordHash,
        role: UserRole.BUYER,
      }),
    );

    const seller = await usersRepo.save(
      usersRepo.create({
        email: 'anchor-seller@example.com',
        fullName: 'Anchor Seller',
        username: 'anchorseller',
        passwordHash,
        role: UserRole.SELLER,
        isVerified: true,
        trustyTag: '@anchorseller',
        trustyTagLower: '@anchorseller',
      }),
    );

    const tx = await txRepo.save(
      txRepo.create({
        buyerId: buyer.id,
        sellerId: seller.id,
        amount: 2500,
        currency: 'NGN',
        description: 'Anchor webhook funding',
        status: TransactionStatus.CREATED,
        paymentReference: 'anchor-payin-ref-1',
      } as any),
    );

    const payload = {
      data: {
        id: 'evt_anchor_1',
        type: 'payin.received',
        relationships: {
          payIn: {
            data: { id: 'payin_1', type: 'PayIn' },
          },
        },
      },
      included: [
        {
          id: 'payin_1',
          type: 'PayIn',
          attributes: {
            reference: 'anchor-payin-ref-1',
            amount: 250000,
            currency: 'NGN',
            paidAt: new Date().toISOString(),
          },
        },
      ],
    };
    const body = JSON.stringify(payload);
    const signature = signAnchor(body, process.env.ANCHOR_WEBHOOK_TOKEN || '');

    await request(app.getHttpServer())
      .post('/api/anchor/webhook')
      .set('content-type', 'application/json')
      .set('x-anchor-signature', signature)
      .send(body)
      .expect(200, { ok: true });

    const funded = await txRepo.findOne({ where: { id: tx.id } });
    expect(funded?.status).toBe(TransactionStatus.FUNDED);

    const recorded = await eventsRepo.findOne({
      where: { provider: 'anchor', providerEventId: 'evt_anchor_1' } as any,
    });
    expect(recorded?.processedAt).toBeTruthy();
    expect(recorded?.processingError).toBeNull();

    await request(app.getHttpServer())
      .post('/api/anchor/webhook')
      .set('content-type', 'application/json')
      .set('x-anchor-signature', signature)
      .send(body)
      .expect(200, { ok: true, deduped: true });

    const eventCount = await eventsRepo.count({
      where: { provider: 'anchor', providerEventId: 'evt_anchor_1' } as any,
    });
    expect(eventCount).toBe(1);
  });

  it('rejects Anchor funding when the amount does not match the transaction before any FUNDED transition', async () => {
    const usersRepo = app.get(getRepositoryToken(User));
    const txRepo = app.get(getRepositoryToken(Transaction));
    const transactionsService = app.get(TransactionsService);
    const passwordHash = await bcrypt.hash('password1234', await bcrypt.genSalt());

    const buyer = await usersRepo.save(
      usersRepo.create({
        email: 'anchor-mismatch-buyer@example.com',
        fullName: 'Mismatch Buyer',
        username: 'mismatchbuyer',
        passwordHash,
        role: UserRole.BUYER,
      }),
    );

    const seller = await usersRepo.save(
      usersRepo.create({
        email: 'anchor-mismatch-seller@example.com',
        fullName: 'Mismatch Seller',
        username: 'mismatchseller',
        passwordHash,
        role: UserRole.SELLER,
        isVerified: true,
        trustyTag: '@mismatchseller',
        trustyTagLower: '@mismatchseller',
      }),
    );

    const tx = await txRepo.save(
      txRepo.create({
        buyerId: buyer.id,
        sellerId: seller.id,
        amount: 2500,
        currency: 'NGN',
        description: 'Anchor mismatch test',
        status: TransactionStatus.CREATED,
        paymentReference: 'anchor-payin-ref-mismatch',
      } as any),
    );

    await expect(
      transactionsService.markFundedFromAnchorPayin({
        reference: 'anchor-payin-ref-mismatch',
        payinId: 'payin_mismatch',
        amountMinor: 200000,
        currency: 'NGN',
      }),
    ).rejects.toThrow('Payment amount mismatch');

    const refreshed = await txRepo.findOne({ where: { id: tx.id } });
    expect(refreshed?.status).toBe(TransactionStatus.CREATED);
  });

  it('keeps seller onboarding pending when approval fails inside the transaction', async () => {
    const usersRepo = app.get(getRepositoryToken(User));
    const onboardingRepo = app.get(getRepositoryToken(SellerOnboardingRequest));
    const usersService = app.get(UsersService);
    const passwordHash = await bcrypt.hash('password1234', await bcrypt.genSalt());

    await usersRepo.save(
      usersRepo.create({
        email: 'existing-seller@example.com',
        fullName: 'Existing Seller',
        username: 'existingseller',
        passwordHash,
        role: UserRole.SELLER,
        isVerified: true,
        trustyTag: '@takenhandle',
        trustyTagLower: '@takenhandle',
      }),
    );

    const buyer = await usersRepo.save(
      usersRepo.create({
        email: 'onboarding-buyer@example.com',
        fullName: 'Onboarding Buyer',
        username: 'onboardingbuyer',
        passwordHash,
        role: UserRole.BUYER,
      }),
    );

    const requestRow = await onboardingRepo.save(
      onboardingRepo.create({
        userId: buyer.id,
        status: SellerOnboardingStatus.PENDING,
        desiredTrustyTag: '@takenhandle',
        bankName: 'Test Bank',
        accountNumber: '0123456789',
        accountName: 'Onboarding Buyer',
      }),
    );

    await expect(
      usersService.reviewSellerOnboardingRequest({
        requestId: requestRow.id,
        adminUserId: 'admin-user-id',
        approve: true,
      }),
    ).rejects.toBeTruthy();

    const refreshedRequest = await onboardingRepo.findOne({ where: { id: requestRow.id } });
    const refreshedUser = await usersRepo.findOne({ where: { id: buyer.id } });

    expect(refreshedRequest?.status).toBe(SellerOnboardingStatus.PENDING);
    expect(refreshedRequest?.reviewedAt).toBeNull();
    expect(refreshedUser?.role).toBe(UserRole.BUYER);
    expect(refreshedUser?.trustyTag).toBeFalsy();
  });
});
