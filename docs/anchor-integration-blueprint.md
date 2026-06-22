# TrustyTrade Anchor Integration Blueprint

This blueprint maps TrustyTrade's money flow to Anchor's exact primitives and API model.

## Source Material

The design in this document is based on the current Anchor documentation and API reference:

- Deposit Accounts Overview: https://docs.getanchor.co/docs/overview-2
- Create Deposit Account: https://docs.getanchor.co/docs/creating-deposit-account-resource
- Account Numbers: https://docs.getanchor.co/docs/account-numbers
- Reserved Accounts: https://docs.getanchor.co/docs/reserved-accounts
- Receiving Payment to Reserved Account: https://docs.getanchor.co/docs/receiving-payment-to-reserved-account
- Pay with Transfer: https://docs.getanchor.co/docs/pay-with-transfer
- Book Transfer: https://docs.getanchor.co/docs/book-transfers-1
- Bank Transfer (NIP): https://docs.getanchor.co/docs/bank-transfer
- Verify Transfer: https://docs.getanchor.co/docs/verify-transfer-1
- Event Types: https://docs.getanchor.co/docs/event-types-1
- Webhooks Overview: https://docs.getanchor.co/docs/webhooks-overview
- Subledgers (Sub Accounts): https://docs.getanchor.co/reference/sub-account
- Create Counterparty: https://docs.getanchor.co/reference/post_api-v1-counterparties
- Initiate Transfer: https://docs.getanchor.co/reference/post_api-v1-transfers
- Reconciliation Reports: https://docs.getanchor.co/reference/list-reports

## Exact Anchor Model

### Customers

- Deposit accounts require prior customer onboarding and completed KYC or KYB.
- Individual customers can only receive `SAVINGS` deposit accounts.
- Business customers can only receive `CURRENT` deposit accounts.

### Deposit Accounts

- Anchor models a deposit account as a real banking account that can hold funds.
- Live organizations can have root accounts including `Master`, `Revenue`, and `FBO`.
- The FBO account is the parent account used for customer funds and subaccounts.

### Sub Accounts

- Subaccounts are first-class subledgers under a deposit account.
- Anchor states that all transactions first go through a subledger account, followed by the deposit account.
- Subaccounts can only be created under the FBO root account.
- A deposit account has an implicit subaccount, and the sum of subaccount balances should equal the deposit account balance.

### Collection Primitives

- Reserved Accounts are permanent virtual account numbers for customer collections.
- Reserved accounts can optionally route pay-ins to a subaccount using `payoutAccount`.
- Pay with Transfer creates a dynamic, temporary virtual account for a single transaction.
- Reserved-account collections emit `payin.received`, and Anchor recommends fetching the related `PayIn` resource for details.

### Money Movement

- Internal movement uses `BookTransfer`.
- External bank payout uses `NIP_TRANSFER`.
- NIP payout requires a `CounterParty`.
- Transfer verification is explicit through `/api/v1/transfers/verify/{transferId}`.
- Documented transfer states are `pending`, `completed`, `failed`, and `reversed`.

### Webhooks

- Anchor webhook events are intentionally minimal.
- Payloads can optionally include related resources using the `included` mechanism.
- Relevant event families for TrustyTrade are:
  - `payin.received`
  - `payment.received`
  - `payment.settled`
  - `book.transfer.initiated`
  - `book.transfer.successful`
  - `book.transfer.failed`
  - `nip.transfer.initiated`
  - `nip.transfer.successful`
  - `nip.transfer.failed`
  - `nip.transfer.reversed`
  - `customer.identification.awaitingDocument`
  - `customer.identification.approved`
  - `customer.identification.rejected`
  - `sub_account.created`

### Reconciliation

- Anchor exposes reporting APIs for reconciliation and statements.
- TrustyTrade should treat reports, statements, and transfer verification as periodic control-plane checks in addition to webhooks.

## TrustyTrade Mapping

### Buyer Onboarding

- Create Anchor `IndividualCustomer`.
- If using pay-by-transfer escrow, create:
  - permanent `ReservedAccount`, or
  - dynamic `PayWithTransfer` account per transaction.

### Seller Onboarding

- Seller remains an Anchor customer:
  - `IndividualCustomer` for retail seller
  - `BusinessCustomer` for merchant/sme seller
- Complete KYC or KYB before issuing seller-facing Anchor accounts.
- Create or reuse payout destination:
  - Anchor `CounterParty` for external NIP payout
  - Anchor `SubAccount` for on-platform settlement

### Escrow Funding

- TrustyTrade `Transaction.CREATED` means the escrow intent exists, but no settled money exists.
- Funding should be mapped to an Anchor `PayIn`, not a generic payment reference.
- Recommended default:
  - Buyer pays into a Reserved Account.
  - TrustyTrade receives `payin.received`.
  - TrustyTrade fetches the `PayIn` resource.
  - TrustyTrade waits for settlement confirmation and books the escrow allocation.
  - TrustyTrade transitions to `Transaction.FUNDED`.

### Escrow Storage

- Recommended custody model:
  - Anchor FBO root account holds real money.
  - TrustyTrade internal escrow buckets hold legal/product allocation by transaction.
- Optional future model:
  - Anchor `SubAccount` per seller or per customer, but not per transaction.
- Avoid one Anchor subaccount per marketplace transaction.

### Release To Seller

- On buyer confirmation or dispute decision:
  - Create internal release intent.
  - Use Anchor `BookTransfer` for internal movement from custody bucket to seller settlement bucket.
  - Use Anchor `NIP_TRANSFER` only when money leaves Anchor to the seller's external bank.
- `Transaction.RELEASE_PENDING` should map to initiated but non-terminal Anchor transfer state.
- `Transaction.RELEASED` should map to terminal completed settlement.

### Refund To Buyer

- On dispute or refund outcome:
  - If buyer holds an Anchor account or subaccount, use `BookTransfer`.
  - If buyer must be refunded to an external bank, use `NIP_TRANSFER` to buyer counterparty.
- `Transaction.REFUND_PENDING` should mean the refund movement exists but is not terminal.
- `Transaction.REFUNDED` should only mean completed movement.

## Data Model Introduced In This Repo

The following provider-agnostic tables were added to align TrustyTrade to Anchor:

- `money_accounts`
- `money_counterparties`
- `money_movements`
- `provider_events`
- `reconciliation_runs`

These are implemented in:

- `server/src/money/money-account.entity.ts`
- `server/src/money/money-counterparty.entity.ts`
- `server/src/money/money-movement.entity.ts`
- `server/src/money/provider-event.entity.ts`
- `server/src/money/reconciliation-run.entity.ts`
- `server/src/money/money.service.ts`
- `server/src/database/migrations/0007-anchor-money-foundation.ts`

## Required Refactor Direction

### Stop Encoding Provider State On Transaction

The current `transactions` table still contains Paystack-specific transport fields. That model should be treated as legacy compatibility, not the future integration boundary.

Future source of truth should be:

- `transactions`: marketplace/product lifecycle
- `money_movements`: provider money lifecycle
- `money_accounts`: custody and settlement topology
- `money_counterparties`: external payout and refund destinations
- `provider_events`: webhook ingestion and replay safety
- `reconciliation_runs`: periodic financial control plane

### Recommended Anchor Custody Topology

- Anchor FBO root account: real customer funds
- TrustyTrade internal escrow bucket: one per transaction
- Seller settlement account: internal account or subaccount
- Revenue root account: fee collection
- Counterparties: only for off-platform NIP payouts or refunds

## Rollout Plan

### Phase 1

- Keep Paystack live.
- Start persisting all new provider-agnostic records for current flows.
- Backfill `money_accounts` and `money_movements` from current transactions.

### Phase 2

- Add Anchor customer onboarding.
- Add Anchor account and reserved-account provisioning.
- Add generic provider event ingestion endpoint and processor.

### Phase 3

- Move buyer funding from Paystack checkout to Anchor Reserved Account or Pay With Transfer.
- Keep internal transaction statuses but source them from `money_movements`.

### Phase 4

- Move seller payout and buyer refund execution to Anchor transfers.
- Use transfer verify plus webhook events for completion.

### Phase 5

- Add scheduled reconciliation using:
  - transfer verify
  - Anchor statements
  - Anchor reports
  - internal ledger comparisons

## Exact Decisions To Make Before Full Buildout

- Whether buyers fund escrow through:
  - permanent Reserved Accounts, or
  - one-off Pay with Transfer virtual accounts.
- Whether sellers settle:
  - to Anchor internal accounts, or
  - directly to external bank accounts using counterparties.
- Whether sellers are modeled as:
  - `IndividualCustomer`, or
  - `BusinessCustomer` with KYB.
- Whether platform fees are:
  - swept on release, or
  - split earlier by accounting policy.
