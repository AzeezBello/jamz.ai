/**
 * Client-side credit rules.
 *
 * These mirror the SQL in `supabase/migrations/*_functions.sql`, which remains
 * authoritative — nothing here can grant or spend anything. They exist so the
 * UI can show the right price and the right balance before a round trip, and
 * so the arithmetic is unit-testable.
 */

/** Must match `generation_cost()` in the database. */
export const GENERATION_COST = 5;

/** Must match `lyrics_cost()` in the database. */
export const LYRICS_COST = 1;

export function canAfford(balance: number, cost = GENERATION_COST): boolean {
  return balance >= cost;
}

/**
 * Free plans top *up to* the allowance rather than adding to it, so a user who
 * still has credits at midnight does not accumulate an unbounded balance.
 */
export function dailyTopUp(balance: number, allowance: number | null): number {
  if (allowance === null) return 0;
  return Math.max(allowance - balance, 0);
}

export interface LedgerLike {
  delta: number;
  balance_after: number;
}

export interface LedgerAudit {
  /** Sum of every delta, oldest first. */
  balance: number;
  /** True when a row's recorded balance disagrees with the running total. */
  inconsistent: boolean;
}

/**
 * Folds a ledger and checks it against the balances each row recorded. A
 * mismatch means something wrote `credit_balance` outside the ledger, which
 * the database guard trigger is there to prevent.
 */
export function auditLedger(entriesNewestFirst: LedgerLike[]): LedgerAudit {
  const oldestFirst = [...entriesNewestFirst].reverse();
  let balance = 0;
  let inconsistent = false;

  for (const entry of oldestFirst) {
    balance += entry.delta;
    if (entry.balance_after !== balance) inconsistent = true;
  }

  return { balance, inconsistent };
}

/** How many more songs the balance covers. */
export function songsRemaining(balance: number, cost = GENERATION_COST): number {
  return Math.max(0, Math.floor(balance / cost));
}
