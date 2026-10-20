import { describe, it, expect } from 'vitest';
import { ScoringEngine } from '../src/engines/scoringEngine.js';
import { PlayerState, GamePropertyState, LoanState } from '@block-party/shared';

describe('ScoringEngine', () => {
  const createPlayer = (userId: string, cash: number, unpaidBills = 0): PlayerState => ({
    userId,
    username: `User_${userId}`,
    turnOrder: 0,
    position: 0,
    cash,
    unpaidBills,
    turnsTaken: 10,
    jailed: false,
    jailTurns: 0,
    connected: true,
    ready: true,
    joinedAt: 1000,
  });

  describe('Player Net Worth Breakdown', () => {
    it('calculates Net Worth with 100% land value, 70% building value, and mortgage liabilities', () => {
      const player = createPlayer('p1', 500, 50); // Cash 500, Unpaid bills 50

      // Shankhari Bazar (price 100, baseUpgradeSpent 250, not mortgaged)
      // Lalbagh (price 120, baseUpgradeSpent 0, mortgaged -> liability is Math.ceil(120 * 0.55) = 66)
      const properties: GamePropertyState[] = [
        {
          propertyId: 1,
          boardIndex: 1,
          ownerUserId: 'p1',
          buildingLevel: 2,
          baseUpgradeSpent: 250,
          mortgaged: false,
        },
        {
          propertyId: 3,
          boardIndex: 3,
          ownerUserId: 'p1',
          buildingLevel: 0,
          baseUpgradeSpent: 0,
          mortgaged: true,
        },
      ];

      const loan: LoanState = {
        id: 'l1',
        gameId: 'g1',
        userId: 'p1',
        principal: 200,
        accruedInterest: 15,
        status: 'ACTIVE',
        issuedAt: 1000,
        lastInterestAt: 1000,
      };

      const breakdown = ScoringEngine.calculatePlayerNetWorth(player, properties, loan);

      // Land value = 100 + 120 = 220
      expect(breakdown.landValue).toBe(220);

      // Building value = Math.floor(250 * 0.70) = 175
      expect(breakdown.buildingValue).toBe(175);

      // Mortgage liability = Math.ceil(120 * 0.55) = 66
      expect(breakdown.mortgageLiabilities).toBe(66);

      // Debt = 200 principal + 15 interest = 215
      expect(breakdown.outstandingLoanPrincipal).toBe(200);
      expect(breakdown.accruedLoanInterest).toBe(15);
      expect(breakdown.totalDebt).toBe(215);

      // Unpaid bills = 50
      expect(breakdown.unpaidBills).toBe(50);

      // Net Worth = Cash(500) + Land(220) + Building(175) - Principal(200) - Interest(15) - Unpaid(50) - Mortgage(66)
      // = 500 + 220 + 175 - 200 - 15 - 50 - 66 = 564
      expect(breakdown.netWorth).toBe(564);
    });
  });

  describe('Tie-Breaker Rankings', () => {
    it('ranks primarily by Highest Net Worth', () => {
      const p1 = createPlayer('p1', 1000);
      const p2 = createPlayer('p2', 1500);

      const standings = ScoringEngine.calculateStandings([p1, p2], [], {});
      expect(standings.winnerUserId).toBe('p2');
      expect(standings.isTie).toBe(false);
      expect(standings.rankings[0].userId).toBe('p2');
      expect(standings.rankings[1].userId).toBe('p1');
    });

    it('breaks ties using (2) Highest Cash', () => {
      // Both have Net Worth = 1000, but P1 has 1000 cash and P2 has 500 cash + 500 land
      const p1 = createPlayer('p1', 1000);
      const p2 = createPlayer('p2', 500);

      // Property for p2: Gulshan (price 500) -> land value 500
      const properties: GamePropertyState[] = [
        {
          propertyId: 39,
          boardIndex: 39, // Sajek Valley (price 500)
          ownerUserId: 'p2',
          buildingLevel: 0,
          baseUpgradeSpent: 0,
          mortgaged: false,
        },
      ];

      const standings = ScoringEngine.calculateStandings([p1, p2], properties, {});
      // Both Net Worth = 1000. P1 has cash 1000 vs P2 cash 500. P1 wins!
      expect(standings.rankings[0].netWorth).toBe(1000);
      expect(standings.rankings[1].netWorth).toBe(1000);
      expect(standings.winnerUserId).toBe('p1');
    });

    it('breaks ties using (3) Lowest Total Debt', () => {
      // Both have Net Worth = 1000, Cash = 1000.
      // P1 has 0 debt.
      // P2 has 100 debt, but 100 land value, so Net Worth is 1000 + 100 - 100 = 1000.
      const p1 = createPlayer('p1', 1000);
      const p2 = createPlayer('p2', 1000);

      const properties: GamePropertyState[] = [
        {
          propertyId: 1,
          boardIndex: 1, // Shankhari Bazar (price 100)
          ownerUserId: 'p2',
          buildingLevel: 0,
          baseUpgradeSpent: 0,
          mortgaged: false,
        },
      ];

      const loans: Record<string, LoanState> = {
        p2: {
          id: 'l2',
          gameId: 'g1',
          userId: 'p2',
          principal: 100,
          accruedInterest: 0,
          status: 'ACTIVE',
          issuedAt: 1000,
          lastInterestAt: 1000,
        },
      };

      const standings = ScoringEngine.calculateStandings([p1, p2], properties, loans);
      // P1 has 0 debt, P2 has 100 debt. P1 wins!
      expect(standings.winnerUserId).toBe('p1');
    });

    it('results in Shared Victory (Tie) if all tie-breakers are equal', () => {
      const p1 = createPlayer('p1', 1200);
      const p2 = createPlayer('p2', 1200);

      const standings = ScoringEngine.calculateStandings([p1, p2], [], {});
      expect(standings.isTie).toBe(true);
      expect(standings.winnerUserId).toBeNull();
      expect(standings.tieUserIds).toEqual(['p1', 'p2']);
    });
  });
});
