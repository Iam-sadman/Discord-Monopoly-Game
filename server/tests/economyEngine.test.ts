import { describe, it, expect } from 'vitest';
import { EconomyEngine } from '../src/engines/economyEngine.js';
import { GamePropertyState, PlayerState, LoanState } from '@block-party/shared';

describe('EconomyEngine', () => {
  describe('Utility Bills (Every 3 Turns)', () => {
    const mockProperties: GamePropertyState[] = [
      {
        propertyId: 1,
        boardIndex: 1,
        ownerUserId: 'player_1',
        buildingLevel: 2, // 2 levels
        baseUpgradeSpent: 250,
        mortgaged: false,
      },
      {
        propertyId: 3,
        boardIndex: 3,
        ownerUserId: 'player_1',
        buildingLevel: 3, // 3 levels
        baseUpgradeSpent: 500,
        mortgaged: false,
      },
      {
        propertyId: 6,
        boardIndex: 6,
        ownerUserId: 'player_1',
        buildingLevel: 1,
        baseUpgradeSpent: 100,
        mortgaged: true, // Mortgaged -> Should NOT count towards utility bills
      },
      {
        propertyId: 8,
        boardIndex: 8,
        ownerUserId: 'player_2', // Not player_1
        buildingLevel: 4,
        baseUpgradeSpent: 850,
        mortgaged: false,
      },
    ];

    it('does not trigger utility bills on non-cycle turns (e.g. turns 1, 2, 4)', () => {
      const turn1 = EconomyEngine.calculateUtilityBill(1, 'player_1', mockProperties);
      expect(turn1.due).toBe(false);
      expect(turn1.totalBill).toBe(0);

      const turn2 = EconomyEngine.calculateUtilityBill(2, 'player_1', mockProperties);
      expect(turn2.due).toBe(false);
      expect(turn2.totalBill).toBe(0);
    });

    it('triggers utility bills every 3 turns and sums only non-mortgaged building levels', () => {
      // Total non-mortgaged levels for player_1 = 2 + 3 = 5
      // Electricity = 10 * 5 = 50
      // Water = 5 * 5 = 25
      // Total = 75
      const turn3 = EconomyEngine.calculateUtilityBill(3, 'player_1', mockProperties);
      expect(turn3.due).toBe(true);
      expect(turn3.totalBuildingLevels).toBe(5);
      expect(turn3.electricityBill).toBe(50);
      expect(turn3.waterBill).toBe(25);
      expect(turn3.totalBill).toBe(75);

      const turn6 = EconomyEngine.calculateUtilityBill(6, 'player_1', mockProperties);
      expect(turn6.due).toBe(true);
      expect(turn6.totalBill).toBe(75);
    });

    it('results in 0 bill if player owns no buildings on turn 3', () => {
      const turn3 = EconomyEngine.calculateUtilityBill(3, 'player_3', mockProperties);
      expect(turn3.due).toBe(true);
      expect(turn3.totalBuildingLevels).toBe(0);
      expect(turn3.totalBill).toBe(0);
    });
  });

  describe('Low-Cash / Insolvency Settlement Order', () => {
    const basePlayer: PlayerState = {
      userId: 'p1',
      username: 'Player One',
      turnOrder: 0,
      position: 5,
      cash: 50,
      unpaidBills: 0,
      turnsTaken: 3,
      jailed: false,
      jailTurns: 0,
      connected: true,
      ready: true,
      joinedAt: 1000,
    };

    const properties: GamePropertyState[] = [
      {
        propertyId: 1,
        boardIndex: 1, // Shankhari Bazar (price 100 -> mortgage proceeds 50)
        ownerUserId: 'p1',
        buildingLevel: 0,
        baseUpgradeSpent: 0,
        mortgaged: false,
      },
    ];

    it('settles fully with cash when cash is sufficient', () => {
      const player = { ...basePlayer, cash: 200 };
      const res = EconomyEngine.settleMandatoryCharge(100, player, properties, null);

      expect(res.fullySettled).toBe(true);
      expect(res.paidAmount).toBe(100);
      expect(res.newCash).toBe(100);
      expect(res.newUnpaidBills).toBe(0);
      expect(res.newLoanPrincipal).toBe(0);
      expect(res.steps).toHaveLength(1);
      expect(res.steps[0].type).toBe('CASH');
    });

    it('follows order: (1) Cash -> (2) Auto-loan -> (3) Auto-mortgage -> (4) Unpaid liability', () => {
      // Need 450 coins.
      // Cash available: 50 -> deficit 400
      // Auto-loan available: 300 -> deficit 100
      // Auto-mortgage Shankhari Bazar (price 100 -> proceeds 50) -> deficit 50
      // Unpaid liability: 50
      const res = EconomyEngine.settleMandatoryCharge(450, basePlayer, properties, null);

      expect(res.newCash).toBe(0);
      expect(res.newLoanPrincipal).toBe(300);
      expect(res.mortgagedPropertyIds).toEqual([1]);
      expect(res.newUnpaidBills).toBe(50);
      expect(res.paidAmount).toBe(400); // 50 cash + 300 loan + 50 mortgage
      expect(res.fullySettled).toBe(false);

      expect(res.steps.map((s) => s.type)).toEqual([
        'CASH',
        'AUTO_LOAN',
        'AUTO_MORTGAGE',
        'UNPAID_LIABILITY',
      ]);
    });

    it('skips auto-loan if player already has an active loan', () => {
      const existingLoan: LoanState = {
        id: 'l1',
        gameId: 'g1',
        userId: 'p1',
        principal: 200,
        accruedInterest: 10,
        status: 'ACTIVE',
        issuedAt: 1000,
        lastInterestAt: 1000,
      };

      // Need 100 coins. Cash is 50. Active loan exists, so skip loan!
      // Mortgage property 1 (price 100 -> 50 proceeds).
      // Total paid: 50 cash + 50 mortgage = 100!
      const res = EconomyEngine.settleMandatoryCharge(100, basePlayer, properties, existingLoan);

      expect(res.fullySettled).toBe(true);
      expect(res.newCash).toBe(0);
      expect(res.newLoanPrincipal).toBe(200); // unchanged
      expect(res.mortgagedPropertyIds).toEqual([1]);
      expect(res.steps.map((s) => s.type)).toEqual(['CASH', 'AUTO_MORTGAGE']);
    });
  });
});
