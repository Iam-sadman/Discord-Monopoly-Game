import {
  GameSnapshot,
  PlayerState,
  GamePropertyState,
  LoanState,
  AuctionState,
  GameStandings,
} from './types.js';

export const CLIENT_EVENTS = {
  GAME_JOIN: 'GAME_JOIN',
  GAME_READY: 'GAME_READY',
  GAME_START: 'GAME_START',
  ROLL_DICE: 'ROLL_DICE',
  PAY_JAIL_FINE: 'PAY_JAIL_FINE',
  SKIP_JAIL_TURN: 'SKIP_JAIL_TURN',
  BUY_PROPERTY: 'BUY_PROPERTY',
  DECLINE_PROPERTY: 'DECLINE_PROPERTY',
  BUILD_PROPERTY: 'BUILD_PROPERTY',
  TAKE_LOAN: 'TAKE_LOAN',
  REPAY_LOAN: 'REPAY_LOAN',
  MORTGAGE_PROPERTY: 'MORTGAGE_PROPERTY',
  UNMORTGAGE_PROPERTY: 'UNMORTGAGE_PROPERTY',
  PLACE_BID: 'PLACE_BID',
  END_TURN: 'END_TURN',
  REQUEST_SNAPSHOT: 'REQUEST_SNAPSHOT',
  GAME_REMATCH: 'GAME_REMATCH',
  GAME_END: 'GAME_END',
} as const;

export const SERVER_EVENTS = {
  GAME_STATE_SNAPSHOT: 'GAME_STATE_SNAPSHOT',
  PLAYER_JOINED: 'PLAYER_JOINED',
  PLAYER_DISCONNECTED: 'PLAYER_DISCONNECTED',
  TURN_STARTED: 'TURN_STARTED',
  DICE_ROLLED: 'DICE_ROLLED',
  PLAYER_MOVED: 'PLAYER_MOVED',
  PROPERTY_PURCHASED: 'PROPERTY_PURCHASED',
  RENT_PAID: 'RENT_PAID',
  BUILDING_UPGRADED: 'BUILDING_UPGRADED',
  LOAN_UPDATED: 'LOAN_UPDATED',
  BILL_CHARGED: 'BILL_CHARGED',
  AUCTION_UPDATED: 'AUCTION_UPDATED',
  EVENT_TRIGGERED: 'EVENT_TRIGGERED',
  TURN_EXPIRED: 'TURN_EXPIRED',
  MATCH_FINISHED: 'MATCH_FINISHED',
  ACTION_ERROR: 'ACTION_ERROR',
} as const;

// Client event payloads
export interface GameJoinPayload {
  gameId: string;
}

export interface GameReadyPayload {
  ready: boolean;
}

export interface GameStartPayload {
  // Empty
}

export interface ActionPayloadBase {
  actionId: string;
}

export interface RollDicePayload extends ActionPayloadBase {}
export interface PayJailFinePayload extends ActionPayloadBase {}
export interface SkipJailTurnPayload extends ActionPayloadBase {}

export interface BuyPropertyPayload extends ActionPayloadBase {
  propertyId: number;
}

export interface DeclinePropertyPayload extends ActionPayloadBase {
  propertyId: number;
}

export interface BuildPropertyPayload extends ActionPayloadBase {
  propertyId: number;
}

export interface TakeLoanPayload extends ActionPayloadBase {
  amount: number;
}

export interface RepayLoanPayload extends ActionPayloadBase {
  amount: number;
}

export interface MortgagePropertyPayload extends ActionPayloadBase {
  propertyId: number;
}

export interface UnmortgagePropertyPayload extends ActionPayloadBase {
  propertyId: number;
}

export interface PlaceBidPayload extends ActionPayloadBase {
  auctionId: string;
  amount: number;
}

export interface EndTurnPayload extends ActionPayloadBase {}

export interface RequestSnapshotPayload {
  gameId: string;
}

// Server event payloads (all carry version)
export interface VersionedPayload {
  version: number;
}

export interface SnapshotEventPayload extends VersionedPayload {
  snapshot: GameSnapshot;
}

export interface PlayerJoinedEventPayload extends VersionedPayload {
  player: PlayerState;
}

export interface PlayerDisconnectedEventPayload extends VersionedPayload {
  userId: string;
}

export interface TurnStartedEventPayload extends VersionedPayload {
  currentPlayerId: string;
  turnDeadline: number;
  phase: string;
}

export interface DiceRolledEventPayload extends VersionedPayload {
  playerId: string;
  dice: [number, number];
  total: number;
  newPosition: number;
  passedStart: boolean;
}

export interface PlayerMovedEventPayload extends VersionedPayload {
  playerId: string;
  fromPosition: number;
  toPosition: number;
  passedStart: boolean;
}

export interface PropertyPurchasedEventPayload extends VersionedPayload {
  playerId: string;
  property: GamePropertyState;
  price: number;
  cashRemaining: number;
}

export interface RentPaidEventPayload extends VersionedPayload {
  fromPlayerId: string;
  toPlayerId: string;
  propertyId: number;
  rentAmount: number;
  fromCashRemaining: number;
  toCashRemaining: number;
}

export interface BuildingUpgradedEventPayload extends VersionedPayload {
  playerId: string;
  property: GamePropertyState;
  upgradeCost: number;
  vatPaid: number;
  totalCost: number;
  cashRemaining: number;
}

export interface LoanUpdatedEventPayload extends VersionedPayload {
  playerId: string;
  loan: LoanState | null;
  cashRemaining: number;
  message: string;
}

export interface BillChargedEventPayload extends VersionedPayload {
  playerId: string;
  billType: 'UTILITY' | 'TAX' | 'SURCHARGE';
  amount: number;
  cashRemaining: number;
  unpaidLiability: number;
  details: string;
}

export interface AuctionUpdatedEventPayload extends VersionedPayload {
  auction: AuctionState;
  lastBid?: {
    bidderId: string;
    amount: number;
  };
}

export interface EventTriggeredEventPayload extends VersionedPayload {
  playerId: string;
  cardId: string;
  title: string;
  description: string;
  summary: string;
  cashDelta?: number;
}

export interface TurnExpiredEventPayload extends VersionedPayload {
  playerId: string;
  actionTaken: string;
}

export interface MatchFinishedEventPayload extends VersionedPayload {
  standings: GameStandings;
  reason: 'TIME_EXPIRED' | 'CONCESSION' | 'COMPLETED';
}

export interface ActionErrorEventPayload extends VersionedPayload {
  actionId?: string;
  code: string;
  message: string;
}
