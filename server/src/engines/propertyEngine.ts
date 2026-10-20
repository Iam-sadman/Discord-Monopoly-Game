import {
  BuildingLevel,
  CategoryId,
  GamePropertyState,
  BUILDING_CONFIG,
  CATEGORY_PROPERTY_COUNTS,
  TRANSIT_RENT_TIERS,
  UTILITY_RENT_TIERS,
  getTileByIndex,
  GAME_RULES,
} from '@block-party/shared';

export interface UpgradeCostCalculation {
  nextLevel: BuildingLevel;
  baseCost: number;
  vat: number;
  totalCost: number;
}

export class PropertyEngine {
  /**
   * Checks whether the player owns the complete set for a category AND none of the properties in that category are mortgaged.
   */
  public static isCategoryComplete(
    categoryId: CategoryId,
    ownerUserId: string,
    allProperties: readonly GamePropertyState[]
  ): boolean {
    if (categoryId === 'NONE') return false;

    const requiredCount = CATEGORY_PROPERTY_COUNTS[categoryId];
    if (!requiredCount || requiredCount === 0) return false;

    // Filter properties in this game that belong to this category
    const categoryProperties = allProperties.filter((p) => {
      const tile = getTileByIndex(p.boardIndex);
      return tile.categoryId === categoryId;
    });

    if (categoryProperties.length !== requiredCount) {
      // In case properties are partially initialized
      return false;
    }

    // Must all be owned by this user AND none can be mortgaged
    const allOwned = categoryProperties.every(
      (p) => p.ownerUserId === ownerUserId
    );
    const noneMortgaged = categoryProperties.every((p) => !p.mortgaged);

    return allOwned && noneMortgaged;
  }

  /**
   * Calculate rent for any property on the board.
   */
  public static calculateRent(
    property: GamePropertyState,
    allProperties: readonly GamePropertyState[]
  ): number {
    // Mortgaged properties collect 0 rent
    if (property.mortgaged || !property.ownerUserId) {
      return 0;
    }

    const tile = getTileByIndex(property.boardIndex);

    // Transit property rent calculation
    if (tile.type === 'TRANSIT') {
      const ownerTransitCount = allProperties.filter((p) => {
        const t = getTileByIndex(p.boardIndex);
        return (
          t.type === 'TRANSIT' &&
          p.ownerUserId === property.ownerUserId &&
          !p.mortgaged
        );
      }).length;

      return TRANSIT_RENT_TIERS[ownerTransitCount] ?? 0;
    }

    // Utility property rent calculation
    if (tile.type === 'UTILITY') {
      const ownerUtilityCount = allProperties.filter((p) => {
        const t = getTileByIndex(p.boardIndex);
        return (
          t.type === 'UTILITY' &&
          p.ownerUserId === property.ownerUserId &&
          !p.mortgaged
        );
      }).length;

      return UTILITY_RENT_TIERS[ownerUtilityCount] ?? 0;
    }

    // Standard Property rent calculation:
    // Rent = Math.floor(Base Rent * Building Level Multiplier * Set Bonus)
    const baseRent = tile.baseRent ?? 0;
    const levelConfig = BUILDING_CONFIG[property.buildingLevel];
    const multiplier = levelConfig ? levelConfig.multiplier : 1;

    const completeSet = this.isCategoryComplete(
      tile.categoryId,
      property.ownerUserId,
      allProperties
    );

    const setBonus = completeSet ? GAME_RULES.COMPLETE_SET_BONUS_MULTIPLIER : 1.0;

    return Math.floor(baseRent * multiplier * setBonus);
  }

  /**
   * Calculates the upgrade cost and VAT for a property.
   */
  public static calculateUpgradeCost(
    currentLevel: BuildingLevel,
    isCompleteSet: boolean
  ): UpgradeCostCalculation {
    if (currentLevel >= 4) {
      throw new Error('Property is already at maximum building level (Hotel, Level 4)');
    }

    const nextLevel = (currentLevel + 1) as BuildingLevel;
    const config = BUILDING_CONFIG[nextLevel];
    const baseCost = config.upgradeCost;

    if (isCompleteSet) {
      return {
        nextLevel,
        baseCost,
        vat: 0,
        totalCost: baseCost,
      };
    }

    // Incomplete-Set Construction VAT (25% rounded UP)
    const vat = Math.ceil(baseCost * GAME_RULES.INCOMPLETE_SET_VAT_RATE);
    const totalCost = baseCost + vat;

    return {
      nextLevel,
      baseCost,
      vat,
      totalCost,
    };
  }

  /**
   * Mortgage Proceeds: Math.floor(purchase_price * 0.50)
   */
  public static calculateMortgageProceeds(purchasePrice: number): number {
    return Math.floor((purchasePrice * 50) / 100);
  }

  /**
   * Unmortgage Cost: Math.ceil(purchase_price * 0.55) (50% principal + 5% fee)
   */
  public static calculateUnmortgageCost(purchasePrice: number): number {
    return Math.ceil((purchasePrice * 55) / 100);
  }

  /**
   * Starting Bid: Math.floor(purchase_price * 0.50)
   */
  public static calculateAuctionStartingBid(purchasePrice: number): number {
    return Math.floor((purchasePrice * 50) / 100);
  }
}
