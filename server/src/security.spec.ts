import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

describe('security hardening', () => {
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

  it('registers buyers only and rejects unknown fields', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'a@example.com', password: 'password1234', fullName: 'Alice', role: 'admin' })
      .expect(400);

    const agent = request.agent(app.getHttpServer());
    const reg = await agent
      .post('/api/auth/register')
      .send({ email: 'b@example.com', password: 'password1234', fullName: 'Bob' })
      .expect(201);

    expect(reg.body?.user?.role).toBe('buyer');
    await agent.get('/api/auth/profile').expect(200);
  });

  it('prevents privilege escalation via profile update', async () => {
    const agent = request.agent(app.getHttpServer());
    const reg = await agent
      .post('/api/auth/register')
      .send({ email: 'c@example.com', password: 'password1234', fullName: 'Carol' })
      .expect(201);

    const cookies = reg.headers['set-cookie'] as string[] | undefined;
    const csrfCookie = (cookies || []).find((c) => c.startsWith('csrf_token='));
    const csrf = csrfCookie ? decodeURIComponent(csrfCookie.split(';')[0]!.split('=')[1]!) : null;

    await agent
      .patch('/api/users/me/profile')
      .set('x-csrf-token', csrf || '')
      .send({ fullName: 'Carol Updated', role: 'admin' })
      .expect(400);
  });
});
