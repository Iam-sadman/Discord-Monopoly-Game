import {
  GamePropertyState,
  PlayerState,
  LoanState,
  GAME_RULES,
  getTileByIndex,
} from '@block-party/shared';
import { PropertyEngine } from './propertyEngine.js';

export interface UtilityBillBreakdown {
  due: boolean;
  totalBuildingLevels: number;
  electricityBill: number;
  waterBill: number;
  totalBill: number;
}

export interface SettlementStep {
  type: 'CASH' | 'AUTO_LOAN' | 'AUTO_MORTGAGE' | 'UNPAID_LIABILITY';
  amount: number;
  description: string;
  propertyId?: number;
}

export interface InsolvencySettlementResult {
  paidAmount: number;
  steps: SettlementStep[];
  newCash: number;
  newUnpaidBills: number;
  newLoanPrincipal: number;
  mortgagedPropertyIds: number[];
  fullySettled: boolean;
}

export class EconomyEngine {
  /**
   * Evaluates if utility bills are due on this turn for the player.
   * Due every 3 turns taken (turnsTaken % 3 === 0, turnsTaken > 0).
   */
  public static calculateUtilityBill(
    turnsTaken: number,
    userId: string,
    allProperties: readonly GamePropertyState[]
  ): UtilityBillBreakdown {
    if (turnsTaken === 0 || turnsTaken % GAME_RULES.UTILITY_CYCLE_TURN_INTERVAL !== 0) {
      return {
        due: false,
        totalBuildingLevels: 0,
        electricityBill: 0,
        waterBill: 0,
        totalBill: 0,
      };
    }

    const ownedNonMortgaged = allProperties.filter(
      (p) => p.ownerUserId === userId && !p.mortgaged
    );

    const totalBuildingLevels = ownedNonMortgaged.reduce(
      (sum, p) => sum + p.buildingLevel,
      0
    );

    const electricityBill = totalBuildingLevels * GAME_RULES.UTILITY_ELECTRICITY_PER_LEVEL;
    const waterBill = totalBuildingLevels * GAME_RULES.UTILITY_WATER_PER_LEVEL;
    const totalBill = electricityBill + waterBill;

    return {
      due: true,
      totalBuildingLevels,
      electricityBill,
      waterBill,
      totalBill,
    };
  }

  /**
   * Resolves a mandatory charge with low-cash / insolvency fallback:
   * (1) Cash on hand
   * (2) Auto-loan up to remaining cap (max 300) if no active loan exists
   * (3) Auto-mortgage eligible level-0 properties
   * (4) Remainder recorded as unpaid_bills liability
   */
  public static settleMandatoryCharge(
    requiredAmount: number,
    player: PlayerState,
    allProperties: GamePropertyState[],
    activeLoan: LoanState | null
  ): InsolvencySettlementResult {
    const steps: SettlementStep[] = [];
    let currentCash = player.cash;
    let deficit = requiredAmount;
    let newUnpaidBills = player.unpaidBills;
    let newLoanPrincipal = activeLoan && activeLoan.status === 'ACTIVE' ? activeLoan.principal : 0;
    const mortgagedPropertyIds: number[] = [];

    // 1. Pay with available cash
    if (currentCash > 0) {
      const cashUsed = Math.min(currentCash, deficit);
      currentCash -= cashUsed;
      deficit -= cashUsed;
      steps.push({
        type: 'CASH',
        amount: cashUsed,
        description: `Paid ${cashUsed} coins from cash on hand.`,
      });
    }

    if (deficit === 0) {
      return {
        paidAmount: requiredAmount,
        steps,
        newCash: currentCash,
        newUnpaidBills,
        newLoanPrincipal,
        mortgagedPropertyIds,
        fullySettled: true,
      };
    }

    // 2. Take available bank loan up to 300 cap if no active loan exists
    if (!activeLoan || activeLoan.status !== 'ACTIVE') {
      const availableLoan = Math.min(deficit, GAME_RULES.MAX_LOAN_PRINCIPAL);
      if (availableLoan > 0) {
        newLoanPrincipal = availableLoan;
        deficit -= availableLoan;
        steps.push({
          type: 'AUTO_LOAN',
          amount: availableLoan,
          description: `Took emergency bank loan of ${availableLoan} coins.`,
        });
      }
    }

    if (deficit === 0) {
      return {
        paidAmount: requiredAmount,
        steps,
        newCash: currentCash,
        newUnpaidBills,
        newLoanPrincipal,
        mortgagedPropertyIds,
        fullySettled: true,
      };
    }

    // 3. Auto-mortgage eligible level-0 properties owned by player
    const eligibleProperties = allProperties.filter(
      (p) =>
        p.ownerUserId === player.userId &&
        !p.mortgaged &&
        p.buildingLevel === 0
    );

    // Sort by highest mortgage proceeds first to settle deficit with fewer mortgages
    eligibleProperties.sort((a, b) => {
      const priceA = getTileByIndex(a.boardIndex).price ?? 0;
      const priceB = getTileByIndex(b.boardIndex).price ?? 0;
      return priceB - priceA;
    });

    for (const prop of eligibleProperties) {
      if (deficit <= 0) break;
      const tile = getTileByIndex(prop.boardIndex);
      const proceeds = PropertyEngine.calculateMortgageProceeds(tile.price ?? 0);
      const mortgageUsed = Math.min(deficit, proceeds);
      const excessCash = proceeds - mortgageUsed;

      deficit -= mortgageUsed;
      currentCash += excessCash;
      mortgagedPropertyIds.push(prop.propertyId);

      steps.push({
        type: 'AUTO_MORTGAGE',
        amount: proceeds,
        propertyId: prop.propertyId,
        description: `Mortgaged ${tile.name} for ${proceeds} coins (${mortgageUsed} paid toward debt${excessCash > 0 ? `, ${excessCash} added to cash` : ''}).`,
      });
    }

    if (deficit === 0) {
      return {
        paidAmount: requiredAmount,
        steps,
        newCash: currentCash,
        newUnpaidBills,
        newLoanPrincipal,
        mortgagedPropertyIds,
        fullySettled: true,
      };
    }

    // 4. Record remaining deficit as unpaid_bills liability
    newUnpaidBills += deficit;
    steps.push({
      type: 'UNPAID_LIABILITY',
      amount: deficit,
      description: `Insolvent for ${deficit} coins; recorded as unpaid bills liability.`,
    });

    return {
      paidAmount: requiredAmount - deficit,
      steps,
      newCash: currentCash,
      newUnpaidBills,
      newLoanPrincipal,
      mortgagedPropertyIds,
      fullySettled: false,
    };
  }
}
