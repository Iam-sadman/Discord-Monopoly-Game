import {
  BoardTile,
  GamePropertyState,
  PlayerState,
  getTileByIndex,
  GAME_RULES,
  EventCard,
} from '@block-party/shared';
import { PropertyEngine } from './propertyEngine.js';

export interface MovementResult {
  fromPosition: number;
  toPosition: number;
  diceRoll: [number, number];
  diceTotal: number;
  passedStart: boolean;
  landedTile: BoardTile;
}

export type LandingActionType =
  | 'COLLECT_START'
  | 'PAY_RENT'
  | 'BUY_OR_AUCTION'
  | 'VISITING_JAIL'
  | 'GO_TO_JAIL'
  | 'PAY_TAX'
  | 'PAY_BILL'
  | 'FREE_PARKING'
  | 'DRAW_EVENT'
  | 'DRAW_CHANCE'
  | 'OWN_PROPERTY';

export interface LandingResolution {
  actionType: LandingActionType;
  tile: BoardTile;
  rentDue?: number;
  rentRecipientId?: string;
  taxDue?: number;
  billDue?: number;
  card?: EventCard;
  sendToJail?: boolean;
}

export class BoardEngine {
  /**
   * Generates a server-authoritative 2d6 dice roll.
   */
  public static rollDice(): [number, number] {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    return [d1, d2];
  }

  /**
   * Moves a player forward by dice total, detecting Start pass.
   */
  public static calculateMovement(
    currentPosition: number,
    diceRoll: [number, number]
  ): MovementResult {
    const diceTotal = diceRoll[0] + diceRoll[1];
    const rawNewPosition = currentPosition + diceTotal;
    const passedStart = rawNewPosition >= 40;
    const toPosition = rawNewPosition % 40;
    const landedTile = getTileByIndex(toPosition);

    return {
      fromPosition: currentPosition,
      toPosition,
      diceRoll,
      diceTotal,
      passedStart,
      landedTile,
    };
  }

  /**
   * Resolves the effect of landing on a tile.
   */
  public static resolveTileLanding(
    player: PlayerState,
    tile: BoardTile,
    allProperties: readonly GamePropertyState[],
    eventDeck: readonly EventCard[],
    chanceDeck: readonly EventCard[]
  ): LandingResolution {
    switch (tile.type) {
      case 'START':
        return {
          actionType: 'COLLECT_START',
          tile,
        };

      case 'GO_TO_JAIL':
        return {
          actionType: 'GO_TO_JAIL',
          tile,
          sendToJail: true,
        };

      case 'JAIL':
        return {
          actionType: 'VISITING_JAIL',
          tile,
        };

      case 'PARKING':
        return {
          actionType: 'FREE_PARKING',
          tile,
        };

      case 'TAX': {
        const taxAmount = tile.index === 4 ? 150 : 200; // Index 4: 150, Index 34: 200
        return {
          actionType: 'PAY_TAX',
          tile,
          taxDue: taxAmount,
        };
      }

      case 'BILL':
        return {
          actionType: 'PAY_BILL',
          tile,
          billDue: 100, // Index 38: 100
        };

      case 'EVENT': {
        const card = eventDeck.length > 0 ? eventDeck[0] : undefined;
        return {
          actionType: 'DRAW_EVENT',
          tile,
          card,
        };
      }

      case 'CHANCE': {
        const card = chanceDeck.length > 0 ? chanceDeck[0] : undefined;
        return {
          actionType: 'DRAW_CHANCE',
          tile,
          card,
        };
      }

      case 'PROPERTY':
      case 'TRANSIT':
      case 'UTILITY': {
        const propState = allProperties.find((p) => p.boardIndex === tile.index);
        if (!propState || !propState.ownerUserId) {
          // Unowned -> Can be bought or goes to auction
          return {
            actionType: 'BUY_OR_AUCTION',
            tile,
          };
        }

        if (propState.ownerUserId === player.userId) {
          // Own property
          return {
            actionType: 'OWN_PROPERTY',
            tile,
          };
        }

        // Owned by another player
        const rentDue = PropertyEngine.calculateRent(propState, allProperties);
        return {
          actionType: 'PAY_RENT',
          tile,
          rentDue,
          rentRecipientId: propState.ownerUserId,
        };
      }

      default:
        return {
          actionType: 'FREE_PARKING',
          tile,
        };
    }
  }
}
