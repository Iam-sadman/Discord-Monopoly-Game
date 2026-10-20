import { BoardTile, CategoryId } from './types.js';

export const CATEGORY_COLORS: Record<CategoryId, string> = {
  NONE: '#94A3B8',
  RESIDENTIAL_1: '#92400E', // Brown (Old Dhaka Heritage)
  RESIDENTIAL_2: '#0284C7', // Light Blue (Dhaka Suburbs)
  COMMERCIAL_1: '#EC4899',  // Pink (City Hubs)
  COMMERCIAL_2: '#EA580C',  // Orange (Financial Centers)
  PREMIUM_1: '#DC2626',     // Red (Diplomatic & Elite)
  PREMIUM_2: '#EAB308',     // Yellow (Megacity Hubs)
  LUXURY_1: '#16A34A',      // Green (Resort & Heritage)
  LUXURY_2: '#2563EB',      // Dark Blue (Crown Jewels)
  TRANSIT_SET: '#6B7280',   // Gray (National Transit)
  UTILITY_SET: '#0D9488',   // Teal (National Utilities)
};

export const BOARD_TILES: readonly BoardTile[] = [
  {
    index: 0,
    name: 'Start / Payday',
    type: 'START',
    categoryId: 'NONE',
    ruleDescription: 'Collect +200 coins on pass or land',
    categoryColor: CATEGORY_COLORS.NONE,
  },
  {
    index: 1,
    name: 'Shankhari Bazar',
    type: 'PROPERTY',
    categoryId: 'RESIDENTIAL_1',
    price: 100,
    baseRent: 10,
    ruleDescription: 'Base Rent: 10 coins',
    categoryColor: CATEGORY_COLORS.RESIDENTIAL_1,
  },
  {
    index: 2,
    name: 'Community Event',
    type: 'EVENT',
    categoryId: 'NONE',
    ruleDescription: 'Draw from Community Event Deck',
    categoryColor: CATEGORY_COLORS.NONE,
  },
  {
    index: 3,
    name: 'Lalbagh',
    type: 'PROPERTY',
    categoryId: 'RESIDENTIAL_1',
    price: 120,
    baseRent: 12,
    ruleDescription: 'Base Rent: 12 coins',
    categoryColor: CATEGORY_COLORS.RESIDENTIAL_1,
  },
  {
    index: 4,
    name: 'Income Tax',
    type: 'TAX',
    categoryId: 'NONE',
    ruleDescription: 'Pay flat 150 coins',
    categoryColor: CATEGORY_COLORS.NONE,
  },
  {
    index: 5,
    name: 'DESCO Power Utility',
    type: 'UTILITY',
    categoryId: 'UTILITY_SET',
    price: 150,
    baseRent: 20,
    ruleDescription: 'Rent: 20 (1 owned), 45 (2 owned), 80 (3 owned)',
    categoryColor: CATEGORY_COLORS.UTILITY_SET,
  },
  {
    index: 6,
    name: 'Mohammadpur',
    type: 'PROPERTY',
    categoryId: 'RESIDENTIAL_2',
    price: 140,
    baseRent: 14,
    ruleDescription: 'Base Rent: 14 coins',
    categoryColor: CATEGORY_COLORS.RESIDENTIAL_2,
  },
  {
    index: 7,
    name: 'Chance',
    type: 'CHANCE',
    categoryId: 'NONE',
    ruleDescription: 'Draw from Chance Deck',
    categoryColor: CATEGORY_COLORS.NONE,
  },
  {
    index: 8,
    name: 'Mirpur',
    type: 'PROPERTY',
    categoryId: 'RESIDENTIAL_2',
    price: 150,
    baseRent: 15,
    ruleDescription: 'Base Rent: 15 coins',
    categoryColor: CATEGORY_COLORS.RESIDENTIAL_2,
  },
  {
    index: 9,
    name: 'Uttara',
    type: 'PROPERTY',
    categoryId: 'RESIDENTIAL_2',
    price: 160,
    baseRent: 16,
    ruleDescription: 'Base Rent: 16 coins',
    categoryColor: CATEGORY_COLORS.RESIDENTIAL_2,
  },
  {
    index: 10,
    name: 'Jail / Just Visiting',
    type: 'JAIL',
    categoryId: 'NONE',
    ruleDescription: 'No penalty if just visiting',
    categoryColor: CATEGORY_COLORS.NONE,
  },
  {
    index: 11,
    name: 'New Market',
    type: 'PROPERTY',
    categoryId: 'COMMERCIAL_1',
    price: 180,
    baseRent: 18,
    ruleDescription: 'Base Rent: 18 coins',
    categoryColor: CATEGORY_COLORS.COMMERCIAL_1,
  },
  {
    index: 12,
    name: 'WASA Water Utility',
    type: 'UTILITY',
    categoryId: 'UTILITY_SET',
    price: 150,
    baseRent: 20,
    ruleDescription: 'Rent: 20 (1 owned), 45 (2 owned), 80 (3 owned)',
    categoryColor: CATEGORY_COLORS.UTILITY_SET,
  },
  {
    index: 13,
    name: 'Dhanmondi',
    type: 'PROPERTY',
    categoryId: 'COMMERCIAL_1',
    price: 190,
    baseRent: 19,
    ruleDescription: 'Base Rent: 19 coins',
    categoryColor: CATEGORY_COLORS.COMMERCIAL_1,
  },
  {
    index: 14,
    name: 'Farmgate',
    type: 'PROPERTY',
    categoryId: 'COMMERCIAL_1',
    price: 200,
    baseRent: 20,
    ruleDescription: 'Base Rent: 20 coins',
    categoryColor: CATEGORY_COLORS.COMMERCIAL_1,
  },
  {
    index: 15,
    name: 'Kamalapur Railway Station',
    type: 'TRANSIT',
    categoryId: 'TRANSIT_SET',
    price: 200,
    baseRent: 25,
    ruleDescription: 'Rent: 25 (1 owned), 50 (2 owned), 100 (3 owned)',
    categoryColor: CATEGORY_COLORS.TRANSIT_SET,
  },
  {
    index: 16,
    name: 'Motijheel',
    type: 'PROPERTY',
    categoryId: 'COMMERCIAL_2',
    price: 220,
    baseRent: 22,
    ruleDescription: 'Base Rent: 22 coins',
    categoryColor: CATEGORY_COLORS.COMMERCIAL_2,
  },
  {
    index: 17,
    name: 'Community Event',
    type: 'EVENT',
    categoryId: 'NONE',
    ruleDescription: 'Draw from Community Event Deck',
    categoryColor: CATEGORY_COLORS.NONE,
  },
  {
    index: 18,
    name: 'Banani',
    type: 'PROPERTY',
    categoryId: 'COMMERCIAL_2',
    price: 230,
    baseRent: 23,
    ruleDescription: 'Base Rent: 23 coins',
    categoryColor: CATEGORY_COLORS.COMMERCIAL_2,
  },
  {
    index: 19,
    name: 'Gulshan',
    type: 'PROPERTY',
    categoryId: 'COMMERCIAL_2',
    price: 250,
    baseRent: 25,
    ruleDescription: 'Base Rent: 25 coins',
    categoryColor: CATEGORY_COLORS.COMMERCIAL_2,
  },
  {
    index: 20,
    name: 'Free Parking',
    type: 'PARKING',
    categoryId: 'NONE',
    ruleDescription: 'Safe tile, no reward or penalty',
    categoryColor: CATEGORY_COLORS.NONE,
  },
  {
    index: 21,
    name: 'Bashundhara R/A',
    type: 'PROPERTY',
    categoryId: 'PREMIUM_1',
    price: 270,
    baseRent: 27,
    ruleDescription: 'Base Rent: 27 coins',
    categoryColor: CATEGORY_COLORS.PREMIUM_1,
  },
  {
    index: 22,
    name: 'Chance',
    type: 'CHANCE',
    categoryId: 'NONE',
    ruleDescription: 'Draw from Chance Deck',
    categoryColor: CATEGORY_COLORS.NONE,
  },
  {
    index: 23,
    name: 'Baridhara',
    type: 'PROPERTY',
    categoryId: 'PREMIUM_1',
    price: 280,
    baseRent: 28,
    ruleDescription: 'Base Rent: 28 coins',
    categoryColor: CATEGORY_COLORS.PREMIUM_1,
  },
  {
    index: 24,
    name: 'Gulshan Avenue',
    type: 'PROPERTY',
    categoryId: 'PREMIUM_1',
    price: 300,
    baseRent: 30,
    ruleDescription: 'Base Rent: 30 coins',
    categoryColor: CATEGORY_COLORS.PREMIUM_1,
  },
  {
    index: 25,
    name: 'Dhaka Metro Rail',
    type: 'TRANSIT',
    categoryId: 'TRANSIT_SET',
    price: 200,
    baseRent: 25,
    ruleDescription: 'Rent: 25 (1 owned), 50 (2 owned), 100 (3 owned)',
    categoryColor: CATEGORY_COLORS.TRANSIT_SET,
  },
  {
    index: 26,
    name: 'Purbachal',
    type: 'PROPERTY',
    categoryId: 'PREMIUM_2',
    price: 320,
    baseRent: 32,
    ruleDescription: 'Base Rent: 32 coins',
    categoryColor: CATEGORY_COLORS.PREMIUM_2,
  },
  {
    index: 27,
    name: 'WASA Water Supply',
    type: 'UTILITY',
    categoryId: 'UTILITY_SET',
    price: 150,
    baseRent: 20,
    ruleDescription: 'Rent: 20 (1 owned), 45 (2 owned), 80 (3 owned)',
    categoryColor: CATEGORY_COLORS.UTILITY_SET,
  },
  {
    index: 28,
    name: 'Chattogram Agrabad',
    type: 'PROPERTY',
    categoryId: 'PREMIUM_2',
    price: 340,
    baseRent: 34,
    ruleDescription: 'Base Rent: 34 coins',
    categoryColor: CATEGORY_COLORS.PREMIUM_2,
  },
  {
    index: 29,
    name: 'Chattogram GEC Circle',
    type: 'PROPERTY',
    categoryId: 'PREMIUM_2',
    price: 360,
    baseRent: 36,
    ruleDescription: 'Base Rent: 36 coins',
    categoryColor: CATEGORY_COLORS.PREMIUM_2,
  },
  {
    index: 30,
    name: 'Go to Jail',
    type: 'GO_TO_JAIL',
    categoryId: 'NONE',
    ruleDescription: 'Move directly to Index 10 (Jail), set jailed=true',
    categoryColor: CATEGORY_COLORS.NONE,
  },
  {
    index: 31,
    name: "Cox's Bazar Sea Beach",
    type: 'PROPERTY',
    categoryId: 'LUXURY_1',
    price: 400,
    baseRent: 40,
    ruleDescription: 'Base Rent: 40 coins',
    categoryColor: CATEGORY_COLORS.LUXURY_1,
  },
  {
    index: 32,
    name: 'Community Event',
    type: 'EVENT',
    categoryId: 'NONE',
    ruleDescription: 'Draw from Community Event Deck',
    categoryColor: CATEGORY_COLORS.NONE,
  },
  {
    index: 33,
    name: 'Sylhet Zindabazar',
    type: 'PROPERTY',
    categoryId: 'LUXURY_1',
    price: 420,
    baseRent: 42,
    ruleDescription: 'Base Rent: 42 coins',
    categoryColor: CATEGORY_COLORS.LUXURY_1,
  },
  {
    index: 34,
    name: 'NBR Tax Audit',
    type: 'TAX',
    categoryId: 'NONE',
    ruleDescription: 'Pay flat 200 coins',
    categoryColor: CATEGORY_COLORS.NONE,
  },
  {
    index: 35,
    name: 'Hazrat Shahjalal Airport',
    type: 'TRANSIT',
    categoryId: 'TRANSIT_SET',
    price: 200,
    baseRent: 25,
    ruleDescription: 'Rent: 25 (1 owned), 50 (2 owned), 100 (3 owned)',
    categoryColor: CATEGORY_COLORS.TRANSIT_SET,
  },
  {
    index: 36,
    name: 'Chance',
    type: 'CHANCE',
    categoryId: 'NONE',
    ruleDescription: 'Draw from Chance Deck',
    categoryColor: CATEGORY_COLORS.NONE,
  },
  {
    index: 37,
    name: 'Dhaka Hatirjheel',
    type: 'PROPERTY',
    categoryId: 'LUXURY_2',
    price: 460,
    baseRent: 46,
    ruleDescription: 'Base Rent: 46 coins',
    categoryColor: CATEGORY_COLORS.LUXURY_2,
  },
  {
    index: 38,
    name: 'Electricity Bill',
    type: 'BILL',
    categoryId: 'NONE',
    ruleDescription: 'Pay flat 100 coins utility surcharge',
    categoryColor: CATEGORY_COLORS.NONE,
  },
  {
    index: 39,
    name: 'Sajek Valley',
    type: 'PROPERTY',
    categoryId: 'LUXURY_2',
    price: 500,
    baseRent: 50,
    ruleDescription: 'Base Rent: 50 coins',
    categoryColor: CATEGORY_COLORS.LUXURY_2,
  },
];

// Helper to look up tile by index
export const getTileByIndex = (index: number): BoardTile => {
  const normalizedIndex = ((index % 40) + 40) % 40;
  return BOARD_TILES[normalizedIndex];
};

// Category property counts for set bonus checking
export const CATEGORY_PROPERTY_COUNTS: Record<CategoryId, number> = {
  NONE: 0,
  RESIDENTIAL_1: 2, // 1, 3
  RESIDENTIAL_2: 3, // 6, 8, 9
  COMMERCIAL_1: 3,  // 11, 13, 14
  COMMERCIAL_2: 3,  // 16, 18, 19
  PREMIUM_1: 3,     // 21, 23, 24
  PREMIUM_2: 3,     // 26, 28, 29
  LUXURY_1: 2,      // 31, 33
  LUXURY_2: 2,      // 37, 39
  TRANSIT_SET: 3,   // 15, 25, 35
  UTILITY_SET: 3,   // 5, 12, 27
};

// Transit rent tiered lookup
export const TRANSIT_RENT_TIERS: Record<number, number> = {
  1: 25,
  2: 50,
  3: 100,
};

// Utility rent tiered lookup
export const UTILITY_RENT_TIERS: Record<number, number> = {
  1: 20,
  2: 45,
  3: 80,
};
