# Staging Checklist

## Goal

Use this checklist before certifying a staging environment as production-like.

## Infrastructure

- PostgreSQL is used instead of SQLite.
- Redis is enabled and reachable from the API.
- `TYPEORM_SYNCHRONIZE=false` in staging.
- Compiled migrations run successfully before application startup.
- API health endpoint `/api/healthz` returns healthy.
- API readiness endpoint `/api/readyz` verifies database connectivity.
- Frontend is built from the same commit as the API.
- `VITE_API_URL` points at the staging API origin.

## Configuration

- `NODE_ENV=production` in the API container or process.
- `CORS_ORIGINS` matches the deployed staging origins.
- `TRUST_PROXY=true` is set when behind a load balancer or ingress.
- `JWT_SECRET`, `RECEIPT_SIGNING_SECRET`, and `DATA_ENCRYPTION_KEY` are non-placeholder values.
- `EVIDENCE_ENCRYPTION_KEY_BASE64` is set.
- `EVIDENCE_REQUIRE_VIRUS_SCAN=true` and the selected scanner is installed and working.
- `ENABLE_OUTBOX_WORKER=true` unless a dedicated worker process handles settlement jobs.
- `ENABLE_RECONCILIATION=true` unless reconciliation is run separately.

## Provider Setup

- `PAYMENT_PROVIDER` and `SETTLEMENT_PROVIDER` match the intended staging provider strategy.
- Anchor sandbox credentials are valid if Anchor flows are enabled.
- `ANCHOR_WEBHOOK_TOKEN` is configured and matches the webhook sender.
- `ANCHOR_PAYOUT_ACCOUNT_ID` and `ANCHOR_PAYOUT_ACCOUNT_TYPE` point to a valid sandbox source account.
- Paystack credentials are sandbox-only if Paystack flows remain enabled.

## Data Controls

- Staging data is synthetic or scrubbed.
- No production secrets or production customer data are copied into staging.
- Admin bootstrap credentials are rotated after environment initialization.
- Evidence storage paths are isolated from production.

## Functional Certification

- user registration and login succeed
- CSRF-protected browser flows succeed
- buyer payment initialization succeeds
- payment verification only marks funded transactions as funded
- seller payout path creates settlement work correctly
- dispute creation and resolution work
- refund path validates amounts correctly
- Anchor webhook ingestion succeeds with signature validation
- reconciliation overview, movements, events, and runs load in the admin console

## Operational Certification

- API logs include request correlation data.
- Failed background work is observable and retryable.
- Database backups are configured for staging if the environment is long-lived.
- Alerts exist for API health failure, DB connectivity failure, and repeated webhook failures.
- Operator access is limited to named maintainers.

## Release Gate

Staging is ready only when:

- all critical flows pass
- no blocking diagnostics remain
- backend tests pass
- backend build passes
- frontend build passes
- migrations are reproducible from a clean database
