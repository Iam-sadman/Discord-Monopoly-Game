export type GameStatus = 'LOBBY' | 'ACTIVE' | 'RESOLVING' | 'FINISHED' | 'CANCELLED';

export type TurnPhase =
  | 'WAITING_ROLL'
  | 'ROLLING'
  | 'MOVING'
  | 'DECISION'
  | 'AUCTION'
  | 'TURN_TRANSITION';

export type TileType =
  | 'START'
  | 'PROPERTY'
  | 'EVENT'
  | 'TAX'
  | 'UTILITY'
  | 'CHANCE'
  | 'JAIL'
  | 'TRANSIT'
  | 'PARKING'
  | 'GO_TO_JAIL'
  | 'BILL';

export type CategoryId =
  | 'NONE'
  | 'RESIDENTIAL_1'
  | 'RESIDENTIAL_2'
  | 'COMMERCIAL_1'
  | 'COMMERCIAL_2'
  | 'PREMIUM_1'
  | 'PREMIUM_2'
  | 'LUXURY_1'
  | 'LUXURY_2'
  | 'TRANSIT_SET'
  | 'UTILITY_SET';

export type BuildingLevel = 0 | 1 | 2 | 3 | 4;

export interface BoardTile {
  index: number;
  name: string;
  type: TileType;
  categoryId: CategoryId;
  price?: number;
  baseRent?: number;
  ruleDescription: string;
  categoryColor?: string;
}

export interface PlayerState {
  userId: string;
  username: string;
  avatarHash?: string;
  turnOrder: number;
  position: number;
  cash: number;
  unpaidBills: number;
  turnsTaken: number;
  jailed: boolean;
  jailTurns: number;
  missedRollStreak?: number;
  connected: boolean;
  ready: boolean;
  joinedAt: number;
}

export interface GamePropertyState {
  propertyId: number;
  boardIndex: number;
  ownerUserId: string | null;
  buildingLevel: BuildingLevel;
  baseUpgradeSpent: number;
  mortgaged: boolean;
}

export type LoanStatus = 'ACTIVE' | 'REPAID' | 'DEFAULTED';

export interface LoanState {
  id: string;
  gameId: string;
  userId: string;
  principal: number;
  accruedInterest: number;
  status: LoanStatus;
  issuedAt: number;
  lastInterestAt: number;
}

export type AuctionStatus = 'ACTIVE' | 'CLOSED';

export interface AuctionState {
  id: string;
  gameId: string;
  propertyId: number;
  boardIndex: number;
  status: AuctionStatus;
  startingBid: number;
  highestBid: number;
  highestBidderId: string | null;
  endsAt: number;
  createdAt: number;
}

export interface AuctionBid {
  id: string;
  auctionId: string;
  bidderUserId: string;
  amount: number;
  createdAt: number;
}

export type ActionType =
  | 'GAME_JOIN'
  | 'GAME_READY'
  | 'GAME_START'
  | 'ROLL_DICE'
  | 'PAY_JAIL_FINE'
  | 'SKIP_JAIL_TURN'
  | 'BUY_PROPERTY'
  | 'DECLINE_PROPERTY'
  | 'BUILD_PROPERTY'
  | 'TAKE_LOAN'
  | 'REPAY_LOAN'
  | 'MORTGAGE_PROPERTY'
  | 'UNMORTGAGE_PROPERTY'
  | 'PLACE_BID'
  | 'END_TURN';

export type LedgerEntryType =
  | 'INITIAL_CASH'
  | 'PASS_START'
  | 'PURCHASE_PROPERTY'
  | 'RENT_PAYMENT'
  | 'RENT_COLLECTION'
  | 'BUILDING_UPGRADE'
  | 'MORTGAGE_PROCEEDS'
  | 'UNMORTGAGE_PAYMENT'
  | 'LOAN_DISBURSEMENT'
  | 'LOAN_REPAYMENT'
  | 'TAX_PAYMENT'
  | 'BILL_PAYMENT'
  | 'UTILITY_BILL'
  | 'AUCTION_WIN'
  | 'EVENT_REWARD'
  | 'EVENT_PENALTY'
  | 'JAIL_FINE'
  | 'MISSED_DICE_PENALTY'
  | 'UNPAID_DEBT_ACCRUAL';

export interface LedgerEntry {
  id: number;
  gameId: string;
  playerUserId: string;
  actionId: string;
  entryType: LedgerEntryType;
  amount: number;
  balanceAfter: number;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface EventCard {
  id: string;
  title: string;
  description: string;
  type: 'REWARD' | 'PENALTY' | 'MOVE';
  execute: (context: EventExecutionContext) => EventExecutionResult;
}

export interface EventExecutionContext {
  playerId: string;
  player: PlayerState;
  properties: GamePropertyState[];
  currentTurn: number;
}

export interface EventExecutionResult {
  cardId: string;
  playerId: string;
  cashDelta?: number;
  moveToIndex?: number;
  passedStart?: boolean;
  summary: string;
}

export interface PlayerNetWorthBreakdown {
  userId: string;
  username: string;
  cash: number;
  landValue: number;
  buildingValue: number;
  outstandingLoanPrincipal: number;
  accruedLoanInterest: number;
  totalDebt: number;
  unpaidBills: number;
  mortgageLiabilities: number;
  netWorth: number;
}

export interface GameStandings {
  winnerUserId: string | null;
  rankings: PlayerNetWorthBreakdown[];
  isTie: boolean;
  tieUserIds?: string[];
}

export interface ActiveEventCard {
  cardId: string;
  title: string;
  description: string;
  type: 'REWARD' | 'PENALTY' | 'MOVE';
  summary: string;
  cashDelta?: number;
}

export interface GameSnapshot {
  gameId: string;
  status: GameStatus;
  hostUserId: string;
  startedAt: number | null;
  endsAt: number | null;
  currentPlayerId: string | null;
  turnPhase: TurnPhase;
  turnDeadline: number | null;
  version: number;
  lastDice: [number, number] | null;
  players: PlayerState[];
  properties: GamePropertyState[];
  activeLoans: Record<string, LoanState>;
  activeAuction: AuctionState | null;
  activeEventCard?: ActiveEventCard | null;
  recentLedger: LedgerEntry[];
  lastActionMessage?: string;
}
