# Rollout Runbook

## Purpose

This runbook covers a standard TrustyTrade deployment for the current architecture:

- static frontend build
- NestJS API
- PostgreSQL
- Redis
- Anchor and/or Paystack provider integrations

## Pre-Rollout

Before rollout:

1. confirm the target commit and image tags
2. confirm all required secrets are present in the target environment
3. confirm database backups are current
4. confirm Anchor webhook endpoints and tokens are configured
5. confirm the frontend build uses the correct `VITE_API_URL`
6. confirm a rollback target exists for both frontend and API

## Deployment Sequence

Preferred order:

1. deploy database infrastructure changes if any
2. run compiled API migrations
3. deploy the API
4. verify health and readiness
5. deploy the frontend
6. run smoke tests

## Migration Command

Use the compiled migration path in production-like deployments:

```bash
npm --prefix server run migration:run:prod
```

In Docker Compose, the `api` service already runs this migration command before starting the server.

## Smoke Tests

Immediately after rollout, verify:

1. `GET /api/healthz` returns `{ ok: true }`
2. `GET /api/readyz` confirms database readiness
3. browser login works
4. buyer payment initialization works
5. webhook endpoints accept legitimate provider callbacks
6. admin reconciliation page loads
7. one payout or refund dry-run path is verified in the intended provider environment

## Rollback Guidance

Rollback if any of these occur:

- migrations fail and cannot be corrected quickly
- health or readiness remains unhealthy
- webhook ingestion fails systematically
- payment verification regresses
- payout or refund jobs fail at elevated rates

Rollback sequence:

1. stop traffic to the new frontend if it is causing user-facing issues
2. revert the API deployment to the prior known-good version
3. revert the frontend deployment to the prior known-good version
4. evaluate whether database rollback is safe before running any destructive revert

Do not revert database migrations automatically unless you have confirmed the migration is reversible and no live writes depend on the new schema.

## Incident Checks

If rollout issues appear, inspect:

- API logs for request and webhook failures
- provider event ingestion records
- outbox job backlog and terminal failure reasons
- reconciliation runs and pending movement counts
- database connectivity and migration state

## Post-Rollout

After a successful rollout:

1. monitor health, error rate, and webhook traffic for at least one reconciliation interval
2. verify new audit logs are being written
3. confirm background settlement work continues to drain
4. confirm no unexpected CORS or CSRF failures appear in browser flows
5. record the deployed commit, operator, timestamp, and any follow-up actions
