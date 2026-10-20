import { BOARD_TILES, BUILDING_CONFIG } from '@block-party/shared';

export interface PropertyRecord {
  id: number;
  board_index: number;
  name: string;
  tile_type: string;
  category_id: string;
  purchase_price: number | null;
  base_rent: number | null;
  building_costs: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
}

export function generatePropertyRecords(): PropertyRecord[] {
  return BOARD_TILES.map((tile) => {
    const isUpgradable = tile.type === 'PROPERTY';

    return {
      id: tile.index + 1, // 1-based property id matching index + 1
      board_index: tile.index,
      name: tile.name,
      tile_type: tile.type,
      category_id: tile.categoryId,
      purchase_price: tile.price ?? null,
      base_rent: tile.baseRent ?? null,
      building_costs: isUpgradable ? (BUILDING_CONFIG as unknown as Record<string, unknown>) : null,
      metadata: {
        categoryColor: tile.categoryColor,
        ruleDescription: tile.ruleDescription,
      },
    };
  });
}
