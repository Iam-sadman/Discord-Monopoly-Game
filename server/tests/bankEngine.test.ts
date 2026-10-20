import { describe, it, expect } from 'vitest';
import { BankEngine } from '../src/engines/bankEngine.js';
import { LoanState } from '@block-party/shared';

describe('BankEngine', () => {
  describe('Loan Validation', () => {
    it('validates loan principal cap of 300 coins', () => {
      expect(() => BankEngine.validateLoanRequest(null, 300)).not.toThrow();
      expect(() => BankEngine.validateLoanRequest(null, 150)).not.toThrow();
      expect(() => BankEngine.validateLoanRequest(null, 301)).toThrow();
      expect(() => BankEngine.validateLoanRequest(null, 0)).toThrow();
      expect(() => BankEngine.validateLoanRequest(null, -50)).toThrow();
    });

    it('rejects loan request if player already has an active loan', () => {
      const activeLoan: LoanState = {
        id: 'loan_1',
        gameId: 'game_1',
        userId: 'user_1',
        principal: 100,
        accruedInterest: 0,
        status: 'ACTIVE',
        issuedAt: 1000,
        lastInterestAt: 1000,
      };

      expect(() => BankEngine.validateLoanRequest(activeLoan, 100)).toThrow();
    });
  });

  describe('Tiered Simple Interest Calculation', () => {
    const matchStart = 100_000; // arbitrary base timestamp ms

    it('calculates 1% per minute in Tier 1 (0:00 - 9:59 elapsed)', () => {
      // Principal 300 for 5 minutes (300 seconds) in Tier 1
      const fromMs = matchStart + 0;
      const toMs = matchStart + 300 * 1000; // 5 mins in

      const interestFloat = BankEngine.calculateAccruedInterestFloat(300, matchStart, fromMs, toMs);
      // 300 * 0.01 * 5 = 15 coins
      expect(interestFloat).toBeCloseTo(15, 5);
    });

    it('calculates 2% per minute in Tier 2 (10:00 - 19:59 elapsed)', () => {
      // Principal 300 for 5 minutes inside Tier 2 (e.g. from 11:00 to 16:00 elapsed)
      const fromMs = matchStart + 660 * 1000;
      const toMs = matchStart + 960 * 1000;

      const interestFloat = BankEngine.calculateAccruedInterestFloat(300, matchStart, fromMs, toMs);
      // 300 * 0.02 * 5 = 30 coins
      expect(interestFloat).toBeCloseTo(30, 5);
    });

    it('calculates 3% per minute in Tier 3 (20:00 - 30:00 elapsed)', () => {
      // Principal 300 for 5 minutes inside Tier 3 (e.g. from 21:00 to 26:00 elapsed)
      const fromMs = matchStart + 1260 * 1000;
      const toMs = matchStart + 1560 * 1000;

      const interestFloat = BankEngine.calculateAccruedInterestFloat(300, matchStart, fromMs, toMs);
      // 300 * 0.03 * 5 = 45 coins
      expect(interestFloat).toBeCloseTo(45, 5);
    });

    it('accurately accrues across tier boundaries (e.g. crossing from Tier 1 to Tier 2)', () => {
      // From 9:00 (540s) to 11:00 (660s)
      // Tier 1 overlap: 540s to 600s = 60s at 1%/min -> 300 * (0.01/60) * 60 = 3
      // Tier 2 overlap: 600s to 660s = 60s at 2%/min -> 300 * (0.02/60) * 60 = 6
      // Total = 9
      const fromMs = matchStart + 540 * 1000;
      const toMs = matchStart + 660 * 1000;

      const interestFloat = BankEngine.calculateAccruedInterestFloat(300, matchStart, fromMs, toMs);
      expect(interestFloat).toBeCloseTo(9, 5);
    });

    it('rounds up when posting accrued interest update so small amounts round up cleanly', () => {
      const loan: LoanState = {
        id: 'loan_1',
        gameId: 'game_1',
        userId: 'user_1',
        principal: 100,
        accruedInterest: 0,
        status: 'ACTIVE',
        issuedAt: matchStart,
        lastInterestAt: matchStart,
      };

      // After 10 seconds in Tier 1: 100 * (0.01/60) * 10 = 0.1666...
      // Math.ceil(0.1666...) should be 1
      const nowMs = matchStart + 10 * 1000;
      const updated = BankEngine.getUpdatedAccruedInterest(loan, matchStart, nowMs);
      expect(updated).toBe(1);
    });
  });

  describe('Loan Repayment Rules', () => {
    const matchStart = 100_000;

    it('applies repayments to accrued interest first, then principal', () => {
      const loan: LoanState = {
        id: 'loan_1',
        gameId: 'game_1',
        userId: 'user_1',
        principal: 200,
        accruedInterest: 20,
        status: 'ACTIVE',
        issuedAt: matchStart,
        lastInterestAt: matchStart,
      };

      // Repay 50: 20 covers interest, 30 covers principal
      const result = BankEngine.calculateRepayment(loan, 50, matchStart, matchStart);
      expect(result.interestPaid).toBe(20);
      expect(result.principalPaid).toBe(30);
      expect(result.remainingAccruedInterest).toBe(0);
      expect(result.remainingPrincipal).toBe(170);
      expect(result.totalDebtRemaining).toBe(170);
      expect(result.isFullyRepaid).toBe(false);
    });

    it('marks fully repaid when full principal and interest are paid', () => {
      const loan: LoanState = {
        id: 'loan_1',
        gameId: 'game_1',
        userId: 'user_1',
        principal: 200,
        accruedInterest: 20,
        status: 'ACTIVE',
        issuedAt: matchStart,
        lastInterestAt: matchStart,
      };

      const result = BankEngine.calculateRepayment(loan, 220, matchStart, matchStart);
      expect(result.interestPaid).toBe(20);
      expect(result.principalPaid).toBe(200);
      expect(result.totalDebtRemaining).toBe(0);
      expect(result.isFullyRepaid).toBe(true);
    });

    it('rejects overpayment exceeding total debt', () => {
      const loan: LoanState = {
        id: 'loan_1',
        gameId: 'game_1',
        userId: 'user_1',
        principal: 100,
        accruedInterest: 10,
        status: 'ACTIVE',
        issuedAt: matchStart,
        lastInterestAt: matchStart,
      };

      // Debt is 110. Trying to pay 120 should throw.
      expect(() => BankEngine.calculateRepayment(loan, 120, matchStart, matchStart)).toThrow(
        /Overpayment rejected/
      );
    });
  });
});
