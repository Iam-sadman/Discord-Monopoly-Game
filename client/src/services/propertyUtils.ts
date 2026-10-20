import {
  CategoryId,
  GamePropertyState,
  BuildingLevel,
  BUILDING_CONFIG,
  CATEGORY_PROPERTY_COUNTS,
  getTileByIndex,
  GAME_RULES,
} from '@block-party/shared';

export class PropertyEngine {
  public static isCategoryComplete(
    categoryId: CategoryId,
    ownerUserId: string,
    allProperties: readonly GamePropertyState[]
  ): boolean {
    if (categoryId === 'NONE') return false;
    const requiredCount = CATEGORY_PROPERTY_COUNTS[categoryId];
    if (!requiredCount || requiredCount === 0) return false;

    const categoryProperties = allProperties.filter((p) => {
      const tile = getTileByIndex(p.boardIndex);
      return tile.categoryId === categoryId;
    });

    if (categoryProperties.length !== requiredCount) return false;

    const allOwned = categoryProperties.every((p) => p.ownerUserId === ownerUserId);
    const noneMortgaged = categoryProperties.every((p) => !p.mortgaged);

    return allOwned && noneMortgaged;
  }

  public static calculateUpgradeCost(
    currentLevel: BuildingLevel,
    isCompleteSet: boolean
  ): { nextLevel: BuildingLevel; baseCost: number; vat: number; totalCost: number } {
    const nextLevel = (currentLevel + 1) as BuildingLevel;
    const config = BUILDING_CONFIG[nextLevel];
    const baseCost = config.upgradeCost;

    if (isCompleteSet) {
      return { nextLevel, baseCost, vat: 0, totalCost: baseCost };
    }

    const vat = Math.ceil(baseCost * GAME_RULES.INCOMPLETE_SET_VAT_RATE);
    return {
      nextLevel,
      baseCost,
      vat,
      totalCost: baseCost + vat,
    };
  }

  public static calculateMortgageProceeds(purchasePrice: number): number {
    return Math.floor((purchasePrice * 50) / 100);
  }

  public static calculateUnmortgageCost(purchasePrice: number): number {
    return Math.ceil((purchasePrice * 55) / 100);
  }
}
