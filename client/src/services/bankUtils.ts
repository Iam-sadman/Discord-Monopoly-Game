import { LOAN_INTEREST_TIERS } from '@block-party/shared';

export class BankEngine {
  public static getCurrentRatePerMinute(matchStartedAtMs: number, nowMs: number): number {
    const elapsedSeconds = Math.max(0, (nowMs - matchStartedAtMs) / 1000);
    for (const tier of LOAN_INTEREST_TIERS) {
      if (elapsedSeconds >= tier.minElapsedSeconds && elapsedSeconds < tier.maxElapsedSeconds) {
        return tier.ratePerMinute;
      }
    }
    return 0.03; // Fallback to 3%
  }
}
