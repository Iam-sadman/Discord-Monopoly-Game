import { describe, it, expect } from 'vitest';
import { BoardEngine } from '../src/engines/boardEngine.js';
import { EVENT_CARDS, getTileByIndex, PlayerState } from '@block-party/shared';

describe('BoardEngine', () => {
  describe('Dice & Movement', () => {
    it('rolls 2d6 within valid ranges [1..6] each', () => {
      for (let i = 0; i < 50; i++) {
        const [d1, d2] = BoardEngine.rollDice();
        expect(d1).toBeGreaterThanOrEqual(1);
        expect(d1).toBeLessThanOrEqual(6);
        expect(d2).toBeGreaterThanOrEqual(1);
        expect(d2).toBeLessThanOrEqual(6);
      }
    });

    it('advances player position and detects passing Start', () => {
      // Normal move from position 0 with roll [2, 3] = 5
      const move1 = BoardEngine.calculateMovement(0, [2, 3]);
      expect(move1.toPosition).toBe(5);
      expect(move1.passedStart).toBe(false);
      expect(move1.landedTile.index).toBe(5);

      // Move wrapping around board: from position 36 with roll [3, 4] = 7 -> position 3
      const move2 = BoardEngine.calculateMovement(36, [3, 4]);
      expect(move2.toPosition).toBe(3);
      expect(move2.passedStart).toBe(true);
      expect(move2.landedTile.index).toBe(3);

      // Move landing directly on Start: from position 35 with roll [2, 3] = 5 -> position 0
      const move3 = BoardEngine.calculateMovement(35, [2, 3]);
      expect(move3.toPosition).toBe(0);
      expect(move3.passedStart).toBe(true);
      expect(move3.landedTile.type).toBe('START');
    });
  });

  describe('Tile Landing Resolution', () => {
    const player: PlayerState = {
      userId: 'p1',
      username: 'P1',
      turnOrder: 0,
      position: 0,
      cash: 1500,
      unpaidBills: 0,
      turnsTaken: 1,
      jailed: false,
      jailTurns: 0,
      connected: true,
      ready: true,
      joinedAt: 1000,
    };

    it('resolves Go to Jail tile by sending to jail', () => {
      const tile = getTileByIndex(30); // Index 30: Go to Jail
      const res = BoardEngine.resolveTileLanding(player, tile, [], [], []);
      expect(res.actionType).toBe('GO_TO_JAIL');
      expect(res.sendToJail).toBe(true);
    });

    it('resolves Tax and Bill tiles', () => {
      const incomeTaxTile = getTileByIndex(4); // Index 4: Income Tax
      const taxRes = BoardEngine.resolveTileLanding(player, incomeTaxTile, [], [], []);
      expect(taxRes.actionType).toBe('PAY_TAX');
      expect(taxRes.taxDue).toBe(150);

      const auditTaxTile = getTileByIndex(34); // Index 34: NBR Tax Audit
      const auditRes = BoardEngine.resolveTileLanding(player, auditTaxTile, [], [], []);
      expect(auditRes.actionType).toBe('PAY_TAX');
      expect(auditRes.taxDue).toBe(200);

      const billTile = getTileByIndex(38); // Index 38: Electricity Bill
      const billRes = BoardEngine.resolveTileLanding(player, billTile, [], [], []);
      expect(billRes.actionType).toBe('PAY_BILL');
      expect(billRes.billDue).toBe(100);
    });

    it('draws from event cards when landing on EVENT tile', () => {
      const eventTile = getTileByIndex(2); // Index 2: Community Event
      const res = BoardEngine.resolveTileLanding(player, eventTile, [], EVENT_CARDS, []);
      expect(res.actionType).toBe('DRAW_EVENT');
      expect(res.card).toBeDefined();
      expect(res.card?.id).toBe(EVENT_CARDS[0].id);
    });
  });
});
