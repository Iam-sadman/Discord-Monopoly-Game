import {
  PlayerState,
  GamePropertyState,
  LoanState,
  PlayerNetWorthBreakdown,
  GameStandings,
  getTileByIndex,
  GAME_RULES,
} from '@block-party/shared';
import { PropertyEngine } from './propertyEngine.js';

export class ScoringEngine {
  /**
   * Calculates the full Net Worth breakdown for a single player.
   */
  public static calculatePlayerNetWorth(
    player: PlayerState,
    allProperties: readonly GamePropertyState[],
    loan: LoanState | null
  ): PlayerNetWorthBreakdown {
    const ownedProperties = allProperties.filter((p) => p.ownerUserId === player.userId);

    // 1. Land Value: 100% of purchase price for all owned properties
    let landValue = 0;
    let buildingValue = 0;
    let mortgageLiabilities = 0;

    for (const prop of ownedProperties) {
      const tile = getTileByIndex(prop.boardIndex);
      const purchasePrice = tile.price ?? 0;
      landValue += purchasePrice;

      // Building Value: 70% of base construction expenditure, excluding VAT
      if (prop.baseUpgradeSpent > 0) {
        buildingValue += Math.floor(
          prop.baseUpgradeSpent * GAME_RULES.BUILDING_VALUE_NET_WORTH_RATE
        );
      }

      // Mortgage Liability: For any currently mortgaged property, subtract Math.ceil(purchase_price * 0.55)
      if (prop.mortgaged) {
        mortgageLiabilities += PropertyEngine.calculateUnmortgageCost(purchasePrice);
      }
    }

    // Debt
    let outstandingLoanPrincipal = 0;
    let accruedLoanInterest = 0;

    if (loan && loan.status === 'ACTIVE') {
      outstandingLoanPrincipal = loan.principal;
      accruedLoanInterest = loan.accruedInterest;
    }

    const totalDebt = outstandingLoanPrincipal + accruedLoanInterest;
    const unpaidBills = player.unpaidBills;

    // Net Worth = Cash + Land Value + Building Value - Principal - Accrued Interest - Unpaid Bills - Mortgage Liabilities
    const netWorth =
      player.cash +
      landValue +
      buildingValue -
      outstandingLoanPrincipal -
      accruedLoanInterest -
      unpaidBills -
      mortgageLiabilities;

    return {
      userId: player.userId,
      username: player.username,
      cash: player.cash,
      landValue,
      buildingValue,
      outstandingLoanPrincipal,
      accruedLoanInterest,
      totalDebt,
      unpaidBills,
      mortgageLiabilities,
      netWorth,
    };
  }

  /**
   * Calculates standings and ranks players according to tie-breaker rules:
   * 1. Highest Net Worth
   * 2. Highest Cash
   * 3. Lowest Total Debt
   * 4. Shared Victory
   */
  public static calculateStandings(
    players: readonly PlayerState[],
    allProperties: readonly GamePropertyState[],
    loans: Record<string, LoanState | null>
  ): GameStandings {
    const breakdowns: PlayerNetWorthBreakdown[] = players.map((p) =>
      this.calculatePlayerNetWorth(p, allProperties, loans[p.userId] ?? null)
    );

    // Sort using strict tie-breaker order
    breakdowns.sort((a, b) => {
      // 1. Highest Net Worth
      if (b.netWorth !== a.netWorth) {
        return b.netWorth - a.netWorth;
      }
      // 2. Highest Cash
      if (b.cash !== a.cash) {
        return b.cash - a.cash;
      }
      // 3. Lowest Total Debt
      if (a.totalDebt !== b.totalDebt) {
        return a.totalDebt - b.totalDebt;
      }
      // 4. Equal / Tie
      return 0;
    });

    if (breakdowns.length === 0) {
      return {
        winnerUserId: null,
        rankings: [],
        isTie: false,
      };
    }

    const top = breakdowns[0];
    const tiedWithTop = breakdowns.filter(
      (b) =>
        b.netWorth === top.netWorth &&
        b.cash === top.cash &&
        b.totalDebt === top.totalDebt
    );

    const isTie = tiedWithTop.length > 1;

    return {
      winnerUserId: isTie ? null : top.userId,
      rankings: breakdowns,
      isTie,
      tieUserIds: isTie ? tiedWithTop.map((b) => b.userId) : undefined,
    };
  }
}
