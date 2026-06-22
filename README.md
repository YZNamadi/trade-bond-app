# TrustyTrade

TrustyTrade is a buyer-seller escrow marketplace with:

- TanStack Start frontend in `src/`
- NestJS backend in `server/src/`
- Anchor-compatible money domain for accounts, movements, provider events, and reconciliation
- Paystack legacy compatibility for existing flows

## Repository Layout

- `src/`: web application and admin console
- `server/`: API, auth, transactions, disputes, payouts, refunds, and webhooks
- `docs/`: production, rollout, and Anchor integration documentation
- `deploy/`: container and web-server deployment assets

## Local Development

### Frontend + Backend

```bash
npm install
npm --prefix server install
npm run dev
```

### Docker Compose

```bash
cp .env.example .env
cp server/.env.example server/.env
npm run docker:up
```

This starts:

- `web` on `http://localhost:8080`
- `api` on `http://localhost:3001`
- `postgres` on `localhost:5432`
- `redis` on `localhost:6379`

The compose `api` service reads `server/.env`, runs compiled TypeORM migrations before starting the NestJS server, and overrides the database/Redis hostnames for containers.
The compose `web` image reads `VITE_*` values at build time, so update the root `.env` before rebuilding.
Provider-backed payment and payout flows still require valid sandbox credentials in `server/.env`.

## Production Docs

- [Anchor integration blueprint](./docs/anchor-integration-blueprint.md)
- [Production secrets policy](./docs/production-secrets-policy.md)
- [Staging checklist](./docs/staging-checklist.md)
- [Rollout runbook](./docs/rollout-runbook.md)
- [Anchor sandbox certification](./docs/anchor-sandbox-certification.md)

## Build And Test

```bash
npm run build
npm --prefix server test -- --runInBand
npm --prefix server run build
```
