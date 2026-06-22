# Anchor Sandbox Certification

## Goal

Certify that the current TrustyTrade Anchor integration works end to end in sandbox before any production onboarding.

## Provider Primitives In Scope

The current codebase maps TrustyTrade onto these Anchor capabilities:

- customer creation
- pay with transfer collection
- reserved account collection
- counterparties
- NIP transfers for payouts and refunds
- transfer verification
- webhook-driven provider event ingestion
- money movement recording and reconciliation views

## Environment Readiness

Confirm these values are present in staging or sandbox:

- `PAYMENT_PROVIDER=anchor`
- `SETTLEMENT_PROVIDER=anchor`
- `ANCHOR_API_KEY`
- `ANCHOR_WEBHOOK_TOKEN`
- `ANCHOR_ENV=sandbox`
- `ANCHOR_PAYOUT_ACCOUNT_ID`
- `ANCHOR_PAYOUT_ACCOUNT_TYPE`
- `ANCHOR_COLLECTION_MODE`

Also confirm:

- the Anchor webhook points to `/api/anchor/webhook`
- CSRF is not blocking the webhook path
- the configured payout account has sandbox transfer capability

## Certification Scenarios

Run all scenarios with recorded references and screenshots where appropriate.

### Inbound Collection

- initialize a buyer payment session
- verify the returned provider is `anchor`
- verify transfer instructions are shown in the frontend when using pay-with-transfer
- complete the sandbox transfer
- confirm webhook ingestion creates or updates provider events and money movements
- confirm payment verification marks the transaction funded only after a successful provider state

### Reserved Account Path

- create a buyer flow that uses a reserved account strategy if enabled
- verify account number, account name, and bank details are returned
- verify inbound funds reconcile to the correct transaction or customer

### Counterparty Creation

- link a payout or refund bank account
- confirm the account resolves to an Anchor counterparty where expected
- confirm masked account details are stored and returned correctly

### Payouts And Refunds

- trigger a seller payout after an eligible transaction release
- trigger a buyer refund from a dispute outcome
- verify outbound transfer initiation, recorded provider references, and final verification state
- confirm settlement worker retries behave safely on transient failure

### Webhooks

- replay a legitimate sandbox webhook
- confirm signature or token validation passes
- confirm duplicate delivery is handled idempotently
- confirm malformed or unsigned payloads are rejected

### Reconciliation

- load the admin reconciliation page
- confirm overview metrics are populated
- inspect provider events and money movements for the test flow
- run a manual reconciliation pass
- confirm the run is recorded with status and summary

## Exit Criteria

Anchor sandbox certification is complete only when:

- inbound funding works
- payouts work
- refunds work
- webhook ingestion is authenticated and idempotent
- transfer verification is consistent with recorded transaction state
- reconciliation surfaces the sandbox activity correctly

## Not Covered By Sandbox Alone

Sandbox certification does not replace:

- legal and compliance approval
- production secret rotation
- real bank-account operational verification
- live-volume load testing
- production incident-response drills
