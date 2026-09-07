import { describe, expect, it } from 'vitest';
import { auditLedger, canAfford, dailyTopUp, songsRemaining, GENERATION_COST } from '../credits';

describe('canAfford', () => {
  it('allows a generation when the balance exactly covers it', () => {
    expect(canAfford(GENERATION_COST)).toBe(true);
  });

  it('refuses when the balance is one credit short', () => {
    expect(canAfford(GENERATION_COST - 1)).toBe(false);
  });

  it('refuses a zero balance', () => {
    expect(canAfford(0)).toBe(false);
  });
});

describe('dailyTopUp', () => {
  it('tops up to the allowance rather than adding to it', () => {
    // The old client-side reset granted a full allowance on top of whatever
    // was left, so a daily user's balance grew without bound.
    expect(dailyTopUp(20, 50)).toBe(30);
  });

  it('grants nothing when the balance already exceeds the allowance', () => {
    expect(dailyTopUp(80, 50)).toBe(0);
  });

  it('grants the whole allowance from empty', () => {
    expect(dailyTopUp(0, 50)).toBe(50);
  });

  it('grants nothing on plans with no daily allowance', () => {
    expect(dailyTopUp(0, null)).toBe(0);
  });
});

describe('songsRemaining', () => {
  it('floors partial songs', () => {
    expect(songsRemaining(12)).toBe(2);
  });

  it('never goes negative', () => {
    expect(songsRemaining(-10)).toBe(0);
  });
});

describe('auditLedger', () => {
  // Rows arrive newest-first from the API, matching fetchCreditHistory().
  const newestFirst = [
    { delta: -5, balance_after: 45 },
    { delta: 50, balance_after: 50 },
  ];

  it('folds deltas into the current balance', () => {
    expect(auditLedger(newestFirst).balance).toBe(45);
  });

  it('accepts a consistent ledger', () => {
    expect(auditLedger(newestFirst).inconsistent).toBe(false);
  });

  it('flags a row whose recorded balance skipped a debit', () => {
    const tampered = [
      { delta: -5, balance_after: 95 },
      { delta: 50, balance_after: 50 },
    ];
    expect(auditLedger(tampered).inconsistent).toBe(true);
  });

  it('treats an empty ledger as a zero balance', () => {
    expect(auditLedger([])).toEqual({ balance: 0, inconsistent: false });
  });

  it('reconciles a debit followed by its refund', () => {
    const withRefund = [
      { delta: 5, balance_after: 50 },
      { delta: -5, balance_after: 45 },
      { delta: 50, balance_after: 50 },
    ];
    const result = auditLedger(withRefund);
    expect(result.balance).toBe(50);
    expect(result.inconsistent).toBe(false);
  });
});
