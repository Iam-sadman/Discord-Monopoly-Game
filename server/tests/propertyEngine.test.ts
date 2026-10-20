import { describe, it, expect } from 'vitest';
import { PropertyEngine } from '../src/engines/propertyEngine.js';
import { GamePropertyState } from '@block-party/shared';

describe('PropertyEngine', () => {
  describe('Incomplete-Set Construction VAT (25%)', () => {
    it('calculates exact 25% VAT rounded UP for each building level when incomplete', () => {
      // Level 0 -> 1: base 100, VAT 25 -> total 125
      const upgrade0to1 = PropertyEngine.calculateUpgradeCost(0, false);
      expect(upgrade0to1.baseCost).toBe(100);
      expect(upgrade0to1.vat).toBe(25);
      expect(upgrade0to1.totalCost).toBe(125);
      expect(upgrade0to1.nextLevel).toBe(1);

      // Level 1 -> 2: base 150, VAT 38 -> total 188 (Math.ceil(150 * 0.25) = 38)
      const upgrade1to2 = PropertyEngine.calculateUpgradeCost(1, false);
      expect(upgrade1to2.baseCost).toBe(150);
      expect(upgrade1to2.vat).toBe(38);
      expect(upgrade1to2.totalCost).toBe(188);
      expect(upgrade1to2.nextLevel).toBe(2);

      // Level 2 -> 3: base 250, VAT 63 -> total 313 (Math.ceil(250 * 0.25) = 63)
      const upgrade2to3 = PropertyEngine.calculateUpgradeCost(2, false);
      expect(upgrade2to3.baseCost).toBe(250);
      expect(upgrade2to3.vat).toBe(63);
      expect(upgrade2to3.totalCost).toBe(313);
      expect(upgrade2to3.nextLevel).toBe(3);

      // Level 3 -> 4: base 350, VAT 88 -> total 438 (Math.ceil(350 * 0.25) = 88)
      const upgrade3to4 = PropertyEngine.calculateUpgradeCost(3, false);
      expect(upgrade3to4.baseCost).toBe(350);
      expect(upgrade3to4.vat).toBe(88);
      expect(upgrade3to4.totalCost).toBe(438);
      expect(upgrade3to4.nextLevel).toBe(4);
    });

    it('incurs 0 VAT when the category set is complete', () => {
      const upgrade0to1 = PropertyEngine.calculateUpgradeCost(0, true);
      expect(upgrade0to1.baseCost).toBe(100);
      expect(upgrade0to1.vat).toBe(0);
      expect(upgrade0to1.totalCost).toBe(100);

      const upgrade1to2 = PropertyEngine.calculateUpgradeCost(1, true);
      expect(upgrade1to2.baseCost).toBe(150);
      expect(upgrade1to2.vat).toBe(0);
      expect(upgrade1to2.totalCost).toBe(150);

      const upgrade2to3 = PropertyEngine.calculateUpgradeCost(2, true);
      expect(upgrade2to3.baseCost).toBe(250);
      expect(upgrade2to3.vat).toBe(0);
      expect(upgrade2to3.totalCost).toBe(250);

      const upgrade3to4 = PropertyEngine.calculateUpgradeCost(3, true);
      expect(upgrade3to4.baseCost).toBe(350);
      expect(upgrade3to4.vat).toBe(0);
      expect(upgrade3to4.totalCost).toBe(350);
    });

    it('throws error when attempting to upgrade beyond Level 4', () => {
      expect(() => PropertyEngine.calculateUpgradeCost(4, true)).toThrow();
    });
  });

  describe('Rent Calculation and 1.25x Complete Set Bonus', () => {
    // Shankhari Bazar (index 1, baseRent 10, RESIDENTIAL_1 with Lalbagh index 3)
    const mockAllProperties: GamePropertyState[] = [
      {
        propertyId: 1,
        boardIndex: 1, // Shankhari Bazar (base rent 10)
        ownerUserId: 'player_1',
        buildingLevel: 0,
        baseUpgradeSpent: 0,
        mortgaged: false,
      },
      {
        propertyId: 3,
        boardIndex: 3, // Lalbagh (base rent 12)
        ownerUserId: 'player_2', // Not owned by player_1 initially
        buildingLevel: 0,
        baseUpgradeSpent: 0,
        mortgaged: false,
      },
      // Transit tiles (15, 25, 35)
      {
        propertyId: 15,
        boardIndex: 15, // Kamalapur
        ownerUserId: 'player_1',
        buildingLevel: 0,
        baseUpgradeSpent: 0,
        mortgaged: false,
      },
      {
        propertyId: 25,
        boardIndex: 25, // Metro Rail
        ownerUserId: 'player_1',
        buildingLevel: 0,
        baseUpgradeSpent: 0,
        mortgaged: false,
      },
      {
        propertyId: 35,
        boardIndex: 35, // Airport
        ownerUserId: 'player_1',
        buildingLevel: 0,
        baseUpgradeSpent: 0,
        mortgaged: false,
      },
      // Utilities (5, 12, 27)
      {
        propertyId: 5,
        boardIndex: 5, // DESCO
        ownerUserId: 'player_1',
        buildingLevel: 0,
        baseUpgradeSpent: 0,
        mortgaged: false,
      },
      {
        propertyId: 12,
        boardIndex: 12, // WASA
        ownerUserId: 'player_1',
        buildingLevel: 0,
        baseUpgradeSpent: 0,
        mortgaged: false,
      },
    ];

    it('calculates standard rent with multipliers when set is incomplete', () => {
      const prop = { ...mockAllProperties[0], buildingLevel: 0 as const };
      // Base rent 10 * 1x multiplier * 1.0 = 10
      expect(PropertyEngine.calculateRent(prop, mockAllProperties)).toBe(10);

      // Level 1: 10 * 2x = 20
      expect(PropertyEngine.calculateRent({ ...prop, buildingLevel: 1 }, mockAllProperties)).toBe(20);

      // Level 2: 10 * 3x = 30
      expect(PropertyEngine.calculateRent({ ...prop, buildingLevel: 2 }, mockAllProperties)).toBe(30);

      // Level 3: 10 * 4x = 40
      expect(PropertyEngine.calculateRent({ ...prop, buildingLevel: 3 }, mockAllProperties)).toBe(40);

      // Level 4: 10 * 6x = 60
      expect(PropertyEngine.calculateRent({ ...prop, buildingLevel: 4 }, mockAllProperties)).toBe(60);
    });

    it('applies 1.25x Complete Set Bonus when all category properties are owned and none are mortgaged', () => {
      // Give player_1 ownership of Lalbagh as well
      const completeProperties = mockAllProperties.map((p) =>
        p.boardIndex === 3 ? { ...p, ownerUserId: 'player_1' } : p
      );

      const prop = { ...completeProperties[0], buildingLevel: 0 as const };

      // Level 0: Math.floor(10 * 1 * 1.25) = 12
      expect(PropertyEngine.calculateRent(prop, completeProperties)).toBe(12);

      // Level 1: Math.floor(10 * 2 * 1.25) = 25
      expect(PropertyEngine.calculateRent({ ...prop, buildingLevel: 1 }, completeProperties)).toBe(25);

      // Level 2: Math.floor(10 * 3 * 1.25) = 37
      expect(PropertyEngine.calculateRent({ ...prop, buildingLevel: 2 }, completeProperties)).toBe(37);

      // Level 3: Math.floor(10 * 4 * 1.25) = 50
      expect(PropertyEngine.calculateRent({ ...prop, buildingLevel: 3 }, completeProperties)).toBe(50);

      // Level 4: Math.floor(10 * 6 * 1.25) = 75
      expect(PropertyEngine.calculateRent({ ...prop, buildingLevel: 4 }, completeProperties)).toBe(75);
    });

    it('cancels Complete Set Bonus if any property in the category is mortgaged', () => {
      // Lalbagh is mortgaged
      const mortgagedSet = mockAllProperties.map((p) =>
        p.boardIndex === 3 ? { ...p, ownerUserId: 'player_1', mortgaged: true } : p
      );

      const prop = { ...mortgagedSet[0], buildingLevel: 1 as const };
      // Should fall back to 1.0x bonus: 10 * 2 * 1.0 = 20
      expect(PropertyEngine.calculateRent(prop, mortgagedSet)).toBe(20);
    });

    it('returns 0 rent when the property itself is mortgaged', () => {
      const mortgagedProp = { ...mockAllProperties[0], mortgaged: true };
      expect(PropertyEngine.calculateRent(mortgagedProp, mockAllProperties)).toBe(0);
    });

    it('calculates transit rents based on total owned non-mortgaged transit lines', () => {
      // player_1 owns 3 transit properties (15, 25, 35)
      const transitProp = mockAllProperties.find((p) => p.boardIndex === 15)!;
      expect(PropertyEngine.calculateRent(transitProp, mockAllProperties)).toBe(100);

      // If one is mortgaged, 2 active -> 50
      const twoTransit = mockAllProperties.map((p) =>
        p.boardIndex === 25 ? { ...p, mortgaged: true } : p
      );
      expect(PropertyEngine.calculateRent(transitProp, twoTransit)).toBe(50);

      // If two are mortgaged, 1 active -> 25
      const oneTransit = mockAllProperties.map((p) =>
        p.boardIndex === 25 || p.boardIndex === 35 ? { ...p, mortgaged: true } : p
      );
      expect(PropertyEngine.calculateRent(transitProp, oneTransit)).toBe(25);
    });

    it('calculates utility rents based on total owned non-mortgaged utilities', () => {
      // player_1 owns 2 utilities (5, 12) -> 45
      const utilityProp = mockAllProperties.find((p) => p.boardIndex === 5)!;
      expect(PropertyEngine.calculateRent(utilityProp, mockAllProperties)).toBe(45);

      // If 1 active -> 20
      const oneUtility = mockAllProperties.map((p) =>
        p.boardIndex === 12 ? { ...p, mortgaged: true } : p
      );
      expect(PropertyEngine.calculateRent(utilityProp, oneUtility)).toBe(20);
    });
  });

  describe('Mortgage and Auction Values', () => {
    it('calculates 50% mortgage proceeds and 55% unmortgage fee', () => {
      // Property with price 200: proceeds = 100, unmortgage = 110
      expect(PropertyEngine.calculateMortgageProceeds(200)).toBe(100);
      expect(PropertyEngine.calculateUnmortgageCost(200)).toBe(110);

      // Odd prices with rounding:
      // price 270: proceeds = 135, unmortgage = Math.ceil(270 * 0.55) = 149
      expect(PropertyEngine.calculateMortgageProceeds(270)).toBe(135);
      expect(PropertyEngine.calculateUnmortgageCost(270)).toBe(149);
    });

    it('calculates auction starting bid at 50% of purchase price', () => {
      expect(PropertyEngine.calculateAuctionStartingBid(200)).toBe(100);
      expect(PropertyEngine.calculateAuctionStartingBid(350)).toBe(175);
    });
  });
});
