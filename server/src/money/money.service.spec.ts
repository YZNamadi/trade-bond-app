import { MoneyService } from './money.service';
import { Currency, TransactionStatus, type Transaction } from '../transactions/transaction.entity';

describe('MoneyService', () => {
  const service = new MoneyService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );

  const transaction = {
    id: '2d2b5a84-8600-4faa-babc-764589dd8ab4',
    amount: 1250,
    currency: Currency.NGN,
    status: TransactionStatus.CREATED,
    buyerId: 'buyer-1',
    sellerId: 'seller-1',
  } as Transaction;

  it('builds a reserved-account funding plan when buyer already has one', () => {
    const plan = service.buildAnchorFundingPlan({
      transaction,
      buyerAnchorCustomerId: 'anc_cst_1',
      buyerReservedAccountId: 'anc_ra_1',
    });

    expect(plan.collectionStrategy).toBe('RESERVED_ACCOUNT');
    expect(plan.expectedMovement).toMatchObject({
      kind: 'PAYIN',
      provider: 'anchor',
      amountMinor: 125000,
      currency: 'NGN',
    });
    expect(plan.anchorRelationships).toEqual({
      customerId: 'anc_cst_1',
      reservedAccountId: 'anc_ra_1',
    });
  });

  it('splits seller release and fee sweep correctly', () => {
    const plan = service.buildAnchorReleasePlan({
      transaction,
      escrowAccountId: 'escrow-1',
      sellerSettlementAccountId: 'seller-settlement-1',
      revenueAccountId: 'revenue-1',
      feeAmountMinor: 500,
    });

    expect(plan.escrowRelease).toMatchObject({
      kind: 'BOOK_TRANSFER',
      amountMinor: 124500,
      sourceAccountId: 'escrow-1',
      destinationAccountId: 'seller-settlement-1',
    });
    expect(plan.feeSweep).toMatchObject({
      kind: 'BOOK_TRANSFER',
      amountMinor: 500,
      sourceAccountId: 'escrow-1',
      destinationAccountId: 'revenue-1',
    });
  });

  it('uses bank transfer refunds when buyer is off-platform', () => {
    const plan = service.buildAnchorRefundPlan({
      transaction,
      escrowAccountId: 'escrow-1',
      buyerCounterpartyId: 'cp-1',
      refundAmountMinor: 30000,
    });

    expect(plan.refund).toMatchObject({
      kind: 'NIP_TRANSFER',
      provider: 'anchor',
      amountMinor: 30000,
      sourceAccountId: 'escrow-1',
      destinationAccountId: null,
      counterpartyId: 'cp-1',
    });
  });
});
