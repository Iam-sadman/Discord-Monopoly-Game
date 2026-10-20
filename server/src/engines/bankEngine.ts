import {
  LoanState,
  GAME_RULES,
  LOAN_INTEREST_TIERS,
} from '@block-party/shared';

export interface RepaymentResult {
  interestPaid: number;
  principalPaid: number;
  remainingAccruedInterest: number;
  remainingPrincipal: number;
  totalDebtRemaining: number;
  isFullyRepaid: boolean;
}

export class BankEngine {
  /**
   * Calculates the exact float simple interest accrued on principal between fromMs and toMs
   * relative to the matchStartedAt timestamp across all elapsed rate tiers.
   */
  public static calculateAccruedInterestFloat(
    principal: number,
    matchStartedAtMs: number,
    fromMs: number,
    toMs: number
  ): number {
    if (principal <= 0 || toMs <= fromMs) {
      return 0;
    }

    const fromSec = Math.max(0, (fromMs - matchStartedAtMs) / 1000);
    const toSec = Math.max(fromSec, (toMs - matchStartedAtMs) / 1000);

    let totalInterest = 0;

    for (const tier of LOAN_INTEREST_TIERS) {
      const tierStart = tier.minElapsedSeconds;
      const tierEnd = tier.maxElapsedSeconds;

      const overlapStart = Math.max(fromSec, tierStart);
      const overlapEnd = Math.min(toSec, tierEnd);

      if (overlapEnd > overlapStart) {
        const secondsInTier = overlapEnd - overlapStart;
        // ratePerMinute / 60 = ratePerSecond
        const ratePerSecond = tier.ratePerMinute / 60;
        totalInterest += principal * ratePerSecond * secondsInTier;
      }
    }

    // If toSec extends past the last tier (after 30 minutes, if match is lingering),
    // cap at highest tier rate (3%/min)
    const maxConfiguredSec = LOAN_INTEREST_TIERS[LOAN_INTEREST_TIERS.length - 1].maxElapsedSeconds;
    if (toSec > maxConfiguredSec) {
      const overlapStart = Math.max(fromSec, maxConfiguredSec);
      if (toSec > overlapStart) {
        const extraSeconds = toSec - overlapStart;
        const lastRatePerSecond = LOAN_INTEREST_TIERS[LOAN_INTEREST_TIERS.length - 1].ratePerMinute / 60;
        totalInterest += principal * lastRatePerSecond * extraSeconds;
      }
    }

    return totalInterest;
  }

  /**
   * Get the current interest rate per minute based on elapsed match time.
   */
  public static getCurrentRatePerMinute(matchStartedAtMs: number, nowMs: number): number {
    const elapsedSeconds = Math.max(0, (nowMs - matchStartedAtMs) / 1000);
    for (const tier of LOAN_INTEREST_TIERS) {
      if (elapsedSeconds >= tier.minElapsedSeconds && elapsedSeconds <= tier.maxElapsedSeconds) {
        return tier.ratePerMinute;
      }
    }
    return 0.03; // Fallback to 3%
  }

  /**
   * Calculates total posted accrued interest including pending seconds, rounded up.
   */
  public static getUpdatedAccruedInterest(
    loan: LoanState,
    matchStartedAtMs: number,
    nowMs: number
  ): number {
    if (loan.status !== 'ACTIVE' || loan.principal <= 0) {
      return loan.accruedInterest;
    }

    const pendingFloat = this.calculateAccruedInterestFloat(
      loan.principal,
      matchStartedAtMs,
      loan.lastInterestAt,
      nowMs
    );

    return loan.accruedInterest + Math.ceil(pendingFloat);
  }

  /**
   * Calculates repayment breakdown: interest paid first, then principal.
   * Rejects overpayment beyond total debt.
   */
  public static calculateRepayment(
    loan: LoanState,
    repaymentAmount: number,
    matchStartedAtMs: number,
    nowMs: number
  ): RepaymentResult {
    if (repaymentAmount <= 0) {
      throw new Error('Repayment amount must be positive');
    }

    const currentAccrued = this.getUpdatedAccruedInterest(loan, matchStartedAtMs, nowMs);
    const totalDebt = loan.principal + currentAccrued;

    if (repaymentAmount > totalDebt) {
      throw new Error(`Overpayment rejected: repayment ${repaymentAmount} exceeds total debt ${totalDebt}`);
    }

    const interestPaid = Math.min(repaymentAmount, currentAccrued);
    const remainingAfterInterest = repaymentAmount - interestPaid;
    const principalPaid = remainingAfterInterest;

    const remainingAccruedInterest = currentAccrued - interestPaid;
    const remainingPrincipal = loan.principal - principalPaid;
    const totalDebtRemaining = remainingPrincipal + remainingAccruedInterest;

    return {
      interestPaid,
      principalPaid,
      remainingAccruedInterest,
      remainingPrincipal,
      totalDebtRemaining,
      isFullyRepaid: totalDebtRemaining === 0,
    };
  }

  /**
   * Verifies if a loan request is eligible.
   */
  public static validateLoanRequest(
    existingLoan: LoanState | null,
    requestedAmount: number
  ): void {
    if (existingLoan && existingLoan.status === 'ACTIVE') {
      throw new Error('Player already has an active bank loan. Max 1 active loan allowed.');
    }
    if (requestedAmount <= 0) {
      throw new Error('Loan amount must be greater than 0.');
    }
    if (requestedAmount > GAME_RULES.MAX_LOAN_PRINCIPAL) {
      throw new Error(`Loan amount ${requestedAmount} exceeds maximum principal cap of ${GAME_RULES.MAX_LOAN_PRINCIPAL} coins.`);
    }
  }
}
