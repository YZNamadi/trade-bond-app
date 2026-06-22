# Production Secrets Policy

## Scope

This policy covers all secrets required to operate TrustyTrade in staging and production:

- frontend build-time variables
- backend runtime environment variables
- database and Redis credentials
- provider credentials for Anchor and Paystack
- signing, encryption, and admin-access secrets

## Required Secret Inventory

The following values must be managed as secrets and must not be committed to source control:

- `JWT_SECRET`
- `RECEIPT_SIGNING_SECRET`
- `DATA_ENCRYPTION_KEY`
- `EVIDENCE_ENCRYPTION_KEY_BASE64`
- `ADMIN_API_TOKEN`
- `DB_PASSWORD`
- `REDIS_URL` if it embeds credentials
- `PAYSTACK_SECRET_KEY`
- `ANCHOR_API_KEY`
- `ANCHOR_WEBHOOK_TOKEN`
- `ANCHOR_PAYOUT_ACCOUNT_ID`
- `BOOTSTRAP_ADMIN_PASSWORD`
- `VITE_ADMIN_API_TOKEN`

## Storage Rules

- Store production secrets in a managed secret store, not in `.env` files on developer machines.
- Limit secret access to operators and systems that need it.
- Use separate secrets for local, staging, and production environments.
- Never reuse sandbox provider keys in production.
- Do not place secrets in issue trackers, screenshots, CI logs, or chat transcripts.
- Do not inject secrets into the frontend unless they are intentionally public.

## Build And Runtime Separation

- Treat `VITE_*` values as build-time inputs for static frontend builds.
- Treat backend environment variables as runtime-only inputs for the API process.
- Avoid embedding backend secrets in Docker images; pass them at deployment time.
- Rebuild the frontend image whenever `VITE_API_URL` or `VITE_ADMIN_API_TOKEN` changes.

## Rotation Policy

- Rotate provider API keys before production launch and after every suspected exposure.
- Rotate signing and encryption keys on a scheduled basis and through a documented maintenance window.
- Rotate bootstrap credentials immediately after initial environment bring-up.
- Rotate admin tokens whenever admin staffing or browser-access policy changes.

Recommended maximum rotation windows:

- provider API keys: 90 days
- admin tokens: 30 days
- bootstrap passwords: one-time use, then revoke
- signing and encryption secrets: 180 days or after any incident

## Generation Standards

- Generate secrets from a cryptographically secure source.
- Use at least 32 random bytes for signing and encryption materials.
- Base64-encode binary secrets when the application expects base64 input.
- Prefer unique secrets per environment and per deployment plane.

## Access Control

- Restrict production secret read access to designated operators and deployment automation.
- Use short-lived CI credentials where possible.
- Log secret access events in the secret manager.
- Remove access promptly when operators leave the project.

## Incident Response

If a secret is exposed:

1. classify the secret and affected systems
2. revoke or rotate the secret immediately
3. review audit logs, webhook traffic, and admin access for misuse
4. invalidate active sessions or tokens if applicable
5. document the incident and follow-up remediation

## Verification Before Go-Live

Before promoting to production, verify:

- all placeholder values in `server/.env.example` are replaced in the real deployment
- no `.env` file is committed
- CI logs do not echo secrets
- provider credentials point to the intended environment
- admin access is limited and monitored
