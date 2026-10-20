import { BuildingLevel } from './types.js';

export const GAME_RULES = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 6,
  STARTING_CASH: 1500,
  MATCH_DURATION_MS: 30 * 60 * 1000, // 30 minutes
  TURN_DECISION_TIMEOUT_SECONDS: 25,
  AUCTION_DURATION_SECONDS: 10,
  PASS_START_REWARD: 200,
  PASS_GO_REWARD: 200,
  JAIL_FINE: 100,
  JAIL_BOARD_INDEX: 10,
  GO_TO_JAIL_BOARD_INDEX: 30,
  MAX_LOAN_PRINCIPAL: 300,
  AUCTION_START_BID_RATE: 0.50,
  AUCTION_MIN_INCREMENT: 10,
  MORTGAGE_PROCEEDS_RATE: 0.50,
  UNMORTGAGE_FEE_RATE: 0.55,
  INCOMPLETE_SET_VAT_RATE: 0.25,
  COMPLETE_SET_BONUS_MULTIPLIER: 1.25,
  BUILDING_VALUE_NET_WORTH_RATE: 0.70,
  UTILITY_CYCLE_TURN_INTERVAL: 3,
  UTILITY_ELECTRICITY_PER_LEVEL: 10,
  UTILITY_WATER_PER_LEVEL: 5,
  UTILITY_TOTAL_PER_LEVEL: 15,
} as const;

export const BUILDING_CONFIG: Record<BuildingLevel, {
  name: string;
  multiplier: number;
  upgradeCost: number;
  incompleteVat: number;
  totalIncompleteCost: number;
}> = {
  0: {
    name: 'Empty Land',
    multiplier: 1,
    upgradeCost: 0,
    incompleteVat: 0,
    totalIncompleteCost: 0,
  },
  1: {
    name: 'Small Building',
    multiplier: 2,
    upgradeCost: 100,
    incompleteVat: 25, // Math.ceil(100 * 0.25)
    totalIncompleteCost: 125,
  },
  2: {
    name: 'Apartment / Office',
    multiplier: 3,
    upgradeCost: 150,
    incompleteVat: 38, // Math.ceil(150 * 0.25)
    totalIncompleteCost: 188,
  },
  3: {
    name: 'Tower',
    multiplier: 4,
    upgradeCost: 250,
    incompleteVat: 63, // Math.ceil(250 * 0.25)
    totalIncompleteCost: 313,
  },
  4: {
    name: 'Hotel (Max Level)',
    multiplier: 6,
    upgradeCost: 350,
    incompleteVat: 88, // Math.ceil(350 * 0.25)
    totalIncompleteCost: 438,
  },
};

export const LOAN_INTEREST_TIERS = [
  { minElapsedSeconds: 0, maxElapsedSeconds: 600, ratePerMinute: 0.01 }, // 0:00 - 9:59 (1%/min)
  { minElapsedSeconds: 600, maxElapsedSeconds: 1200, ratePerMinute: 0.02 }, // 10:00 - 19:59 (2%/min)
  { minElapsedSeconds: 1200, maxElapsedSeconds: 1800, ratePerMinute: 0.03 }, // 20:00 - 30:00 (3%/min)
] as const;
