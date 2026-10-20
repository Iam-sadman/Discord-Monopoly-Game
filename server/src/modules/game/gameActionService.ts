import { v4 as uuidv4 } from 'uuid';
import {
  GameSnapshot,
  PlayerState,
  GamePropertyState,
  LoanState,
  AuctionState,
  LedgerEntry,
  GameStandings,
  GAME_RULES,
  getTileByIndex,
  BOARD_TILES,
  EVENT_CARDS,
  EventCard,
} from '@block-party/shared';
import { GameStateManager, GameInstance } from './gameStateManager.js';
import { PropertyEngine } from '../../engines/propertyEngine.js';
import { BankEngine } from '../../engines/bankEngine.js';
import { EconomyEngine } from '../../engines/economyEngine.js';
import { BoardEngine } from '../../engines/boardEngine.js';
import { ScoringEngine } from '../../engines/scoringEngine.js';
import { TimerManager } from '../timer/timerManager.js';
import { db } from '../../db/index.js';

export interface ActionResult<T = unknown> {
  success: boolean;
  gameId: string;
  version: number;
  data?: T;
  message: string;
}

export class GameActionService {
  /**
   * Idempotency verification and action ledger recording.
   */
  private static async checkIdempotency(
    instance: GameInstance,
    actionId: string
  ): Promise<any | null> {
    const key = `${instance.gameId}_${actionId}`;
    if (db.inMemoryDb?.game_actions.has(key)) {
      return db.inMemoryDb.game_actions.get(key).result;
    }

    const res = await db.query(
      `SELECT result FROM game_actions WHERE game_id = $1 AND idempotency_key = $2`,
      [instance.gameId, actionId]
    );

    if (res.rows.length > 0) {
      return res.rows[0].result;
    }
    return null;
  }

  private static async recordAction(
    instance: GameInstance,
    actorUserId: string,
    actionType: string,
    actionId: string,
    payload: Record<string, unknown>,
    result: any
  ): Promise<void> {
    const key = `${instance.gameId}_${actionId}`;
    if (db.inMemoryDb) {
      db.inMemoryDb.game_actions.set(key, {
        id: uuidv4(),
        game_id: instance.gameId,
        actor_user_id: actorUserId,
        action_type: actionType,
        idempotency_key: actionId,
        payload,
        result,
        created_at: new Date(),
      });
    }

    await db.query(
      `INSERT INTO game_actions (id, game_id, actor_user_id, action_type, idempotency_key, payload, result)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (game_id, idempotency_key) DO NOTHING`,
      [uuidv4(), instance.gameId, actorUserId, actionType, actionId, JSON.stringify(payload), JSON.stringify(result)]
    );
  }

  private static addLedgerEntry(
    instance: GameInstance,
    userId: string,
    actionId: string,
    entryType: any,
    amount: number,
    balanceAfter: number,
    metadata?: Record<string, unknown>
  ): void {
    const entry: LedgerEntry = {
      id: db.inMemoryDb ? db.inMemoryDb.getNextLedgerId() : Date.now(),
      gameId: instance.gameId,
      playerUserId: userId,
      actionId,
      entryType,
      amount,
      balanceAfter,
      metadata,
      createdAt: Date.now(),
    };

    instance.ledger.push(entry);
    if (instance.ledger.length > 100) {
      instance.ledger.shift(); // Keep last 100
    }
  }

  /**
   * Joins a lobby.
   */
  public static async joinGame(
    gameId: string,
    user: { userId: string; username: string; avatarHash?: string }
  ): Promise<ActionResult<PlayerState>> {
    let instance = await GameStateManager.getGame(gameId);
    if (!instance) {
      // If room does not exist yet, first connecting player creates it and becomes host
      instance = await GameStateManager.createGame(gameId, user);
      const player = instance.players.get(user.userId)!;
      return {
        success: true,
        gameId,
        version: instance.version,
        data: player,
        message: `${user.username} created room ${gameId}.`,
      };
    }

    if (instance.status === 'ACTIVE') {
      const existing = instance.players.get(user.userId);
      if (existing) {
        existing.connected = true;
        return {
          success: true,
          gameId,
          version: instance.version,
          data: existing,
          message: `${user.username} reconnected.`,
        };
      }
      throw new Error('Match has already started. New players cannot join.');
    }

    if (instance.players.has(user.userId)) {
      const player = instance.players.get(user.userId)!;
      player.connected = true;
      return {
        success: true,
        gameId,
        version: instance.version,
        data: player,
        message: `${user.username} joined back into lobby.`,
      };
    }

    if (instance.players.size >= GAME_RULES.MAX_PLAYERS) {
      throw new Error(`Lobby is full (maximum ${GAME_RULES.MAX_PLAYERS} players).`);
    }

    const newPlayer: PlayerState = {
      userId: user.userId,
      username: user.username,
      avatarHash: user.avatarHash,
      turnOrder: instance.players.size,
      position: 0,
      cash: GAME_RULES.STARTING_CASH,
      unpaidBills: 0,
      turnsTaken: 0,
      jailed: false,
      jailTurns: 0,
      connected: true,
      ready: user.userId === instance.hostUserId, // Host is ready by default
      joinedAt: Date.now(),
    };

    instance.players.set(user.userId, newPlayer);
    instance.version++;
    instance.lastActionMessage = `${user.username} joined the party!`;

    return {
      success: true,
      gameId,
      version: instance.version,
      data: newPlayer,
      message: `${user.username} joined lobby.`,
    };
  }

  /**
   * Toggles ready state in lobby.
   */
  public static async setReady(
    gameId: string,
    userId: string,
    ready: boolean
  ): Promise<ActionResult> {
    const instance = await GameStateManager.getGame(gameId);
    if (!instance || instance.status !== 'LOBBY') {
      throw new Error('Game not found or not in lobby');
    }

    const player = instance.players.get(userId);
    if (!player) throw new Error('Player not in game');

    player.ready = ready;
    instance.version++;
    instance.lastActionMessage = `${player.username} is ${ready ? 'ready!' : 'not ready.'}`;

    return {
      success: true,
      gameId,
      version: instance.version,
      message: `${player.username} ready state updated.`,
    };
  }

  /**
   * Starts match (host only).
   */
  public static async startGame(gameId: string, hostUserId: string): Promise<ActionResult> {
    const instance = await GameStateManager.getGame(gameId);
    if (!instance || instance.status !== 'LOBBY') {
      throw new Error('Game is not in lobby state.');
    }

    if (instance.hostUserId !== hostUserId) {
      throw new Error('Only the lobby host can start the match.');
    }

    if (instance.players.size < GAME_RULES.MIN_PLAYERS) {
      throw new Error(`Need at least ${GAME_RULES.MIN_PLAYERS} players to start.`);
    }

    const now = Date.now();
    instance.status = 'ACTIVE';
    instance.startedAt = now;
    instance.endsAt = now + GAME_RULES.MATCH_DURATION_MS;

    // Pick first player by turnOrder
    const sortedPlayers = Array.from(instance.players.values()).sort(
      (a, b) => a.turnOrder - b.turnOrder
    );
    const firstPlayer = sortedPlayers[0];
    instance.currentPlayerId = firstPlayer.userId;
    instance.turnPhase = 'WAITING_ROLL';
    instance.turnDeadline = Date.now() + 25000;
    instance.activeEventCard = null;
    instance.version++;
    instance.lastActionMessage = `Block Party match started! First turn: ${firstPlayer.username}.`;

    // Start 30-minute hard deadline timer & 25-second roll timer
    TimerManager.startMatchTimer(gameId, GAME_RULES.MATCH_DURATION_MS);
    TimerManager.startTurnTimer(gameId, 25000);

    await GameStateManager.persistGameVersion(instance);

    return {
      success: true,
      gameId,
      version: instance.version,
      message: 'Match started successfully.',
    };
  }

  /**
   * Server-authoritative dice roll and movement.
   */
  public static async rollDice(
    gameId: string,
    userId: string,
    actionId: string
  ): Promise<ActionResult> {
    const instance = await GameStateManager.getGame(gameId);
    if (!instance || instance.status !== 'ACTIVE') {
      throw new Error('Game is not active.');
    }

    const cached = await this.checkIdempotency(instance, actionId);
    if (cached) return cached;

    if (instance.currentPlayerId !== userId) {
      throw new Error("It is not your turn to roll!");
    }

    if (instance.turnPhase !== 'WAITING_ROLL') {
      throw new Error("Dice has already been rolled for this turn.");
    }

    const player = instance.players.get(userId)!;
    if (player.jailed) {
      throw new Error("You are jailed! You must pay the 100-coin fine or choose to skip your turn.");
    }

    TimerManager.clearTurnTimer(gameId);
    instance.activeEventCard = null;

    // Roll 2d6
    const diceRoll = BoardEngine.rollDice();
    instance.lastDice = diceRoll;

    const moveResult = BoardEngine.calculateMovement(player.position, diceRoll);
    player.position = moveResult.toPosition;
    player.turnsTaken++;

    let actionSummary = `${player.username} rolled [${diceRoll[0]}, ${diceRoll[1]}] (${moveResult.diceTotal}) and moved to ${moveResult.landedTile.name}.`;

    // Crossing or landing on Start
    if (moveResult.passedStart || moveResult.toPosition === 0) {
      player.cash += GAME_RULES.PASS_GO_REWARD;
      this.addLedgerEntry(
        instance,
        userId,
        actionId,
        'PASS_START',
        GAME_RULES.PASS_GO_REWARD,
        player.cash
      );
      actionSummary += ` Collected +200 coins for passing Start!`;
    }

    // Check utility bills (every 3 turns)
    const utilityCheck = EconomyEngine.calculateUtilityBill(
      player.turnsTaken,
      userId,
      Array.from(instance.properties.values())
    );

    if (utilityCheck.due && utilityCheck.totalBill > 0) {
      const activeLoan = instance.loans.get(userId) ?? null;
      const allProps = Array.from(instance.properties.values());
      const settlement = EconomyEngine.settleMandatoryCharge(
        utilityCheck.totalBill,
        player,
        allProps,
        activeLoan
      );

      player.cash = settlement.newCash;
      player.unpaidBills = settlement.newUnpaidBills;

      if (settlement.newLoanPrincipal > 0 && (!activeLoan || activeLoan.status !== 'ACTIVE')) {
        const newLoan: LoanState = {
          id: uuidv4(),
          gameId: instance.gameId,
          userId,
          principal: settlement.newLoanPrincipal,
          accruedInterest: 0,
          status: 'ACTIVE',
          issuedAt: Date.now(),
          lastInterestAt: Date.now(),
        };
        instance.loans.set(userId, newLoan);
      }

      for (const mId of settlement.mortgagedPropertyIds) {
        const prop = Array.from(instance.properties.values()).find((p) => p.propertyId === mId);
        if (prop) prop.mortgaged = true;
      }

      this.addLedgerEntry(
        instance,
        userId,
        actionId,
        'UTILITY_BILL',
        -utilityCheck.totalBill,
        player.cash,
        {
          electricity: utilityCheck.electricityBill,
          water: utilityCheck.waterBill,
          levels: utilityCheck.totalBuildingLevels,
        }
      );

      actionSummary += ` Utility bill charged: ${utilityCheck.totalBill} coins.`;
    }

    // Resolve landing on the tile
    const allProps = Array.from(instance.properties.values());
    const landing = BoardEngine.resolveTileLanding(
      player,
      moveResult.landedTile,
      allProps,
      instance.eventDeck,
      instance.chanceDeck
    );

    if (landing.actionType === 'GO_TO_JAIL') {
      player.position = GAME_RULES.JAIL_BOARD_INDEX;
      player.jailed = true;
      player.jailTurns = 1;
      actionSummary += ` Sent directly to Jail!`;
      instance.turnPhase = 'DECISION';
      this.startDecisionTimer(instance);
    } else if (landing.actionType === 'PAY_TAX' && landing.taxDue) {
      const activeLoan = instance.loans.get(userId) ?? null;
      const settlement = EconomyEngine.settleMandatoryCharge(
        landing.taxDue,
        player,
        allProps,
        activeLoan
      );
      player.cash = settlement.newCash;
      player.unpaidBills = settlement.newUnpaidBills;
      this.addLedgerEntry(instance, userId, actionId, 'TAX_PAYMENT', -landing.taxDue, player.cash);
      actionSummary += ` Paid ${landing.taxDue} coins tax.`;
      instance.turnPhase = 'DECISION';
      this.startDecisionTimer(instance);
    } else if (landing.actionType === 'PAY_BILL' && landing.billDue) {
      const activeLoan = instance.loans.get(userId) ?? null;
      const settlement = EconomyEngine.settleMandatoryCharge(
        landing.billDue,
        player,
        allProps,
        activeLoan
      );
      player.cash = settlement.newCash;
      player.unpaidBills = settlement.newUnpaidBills;
      this.addLedgerEntry(instance, userId, actionId, 'BILL_PAYMENT', -landing.billDue, player.cash);
      actionSummary += ` Paid ${landing.billDue} coins utility surcharge.`;
      instance.turnPhase = 'DECISION';
      this.startDecisionTimer(instance);
    } else if (landing.actionType === 'PAY_RENT' && landing.rentDue && landing.rentRecipientId) {
      const recipient = instance.players.get(landing.rentRecipientId)!;
      const activeLoan = instance.loans.get(userId) ?? null;
      const settlement = EconomyEngine.settleMandatoryCharge(
        landing.rentDue,
        player,
        allProps,
        activeLoan
      );
      player.cash = settlement.newCash;
      player.unpaidBills = settlement.newUnpaidBills;
      recipient.cash += settlement.paidAmount;

      this.addLedgerEntry(instance, userId, actionId, 'RENT_PAYMENT', -settlement.paidAmount, player.cash, {
        to: recipient.userId,
      });
      this.addLedgerEntry(instance, recipient.userId, actionId, 'RENT_COLLECTION', settlement.paidAmount, recipient.cash, {
        from: userId,
      });

      actionSummary += ` Paid ${settlement.paidAmount} coins rent to ${recipient.username}.`;
      instance.turnPhase = 'DECISION';
      this.startDecisionTimer(instance);
    } else if (landing.actionType === 'DRAW_EVENT' || landing.actionType === 'DRAW_CHANCE') {
      const deck = landing.actionType === 'DRAW_EVENT' ? instance.eventDeck : instance.chanceDeck;
      const card = deck.shift() ?? landing.card;
      if (card) {
        deck.push(card); // Reinsert into back of deck
        const ctx = {
          playerId: userId,
          player,
          properties: allProps,
          currentTurn: player.turnsTaken,
        };
        const execRes = card.execute(ctx);
        if (execRes.cashDelta) {
          if (execRes.cashDelta > 0) {
            player.cash += execRes.cashDelta;
            this.addLedgerEntry(instance, userId, actionId, 'EVENT_REWARD', execRes.cashDelta, player.cash);
          } else {
            const charge = Math.abs(execRes.cashDelta);
            const activeLoan = instance.loans.get(userId) ?? null;
            const settlement = EconomyEngine.settleMandatoryCharge(charge, player, allProps, activeLoan);
            player.cash = settlement.newCash;
            player.unpaidBills = settlement.newUnpaidBills;
            this.addLedgerEntry(instance, userId, actionId, 'EVENT_PENALTY', -settlement.paidAmount, player.cash);
          }
        }
        if (execRes.moveToIndex !== undefined) {
          player.position = execRes.moveToIndex;
        }

        instance.activeEventCard = {
          cardId: card.id,
          title: card.title,
          description: card.description,
          type: card.type,
          summary: execRes.summary,
          cashDelta: execRes.cashDelta,
        };

        actionSummary += ` [Card] ${execRes.summary}`;
      }
      instance.turnPhase = 'DECISION';
      this.startDecisionTimer(instance);
    } else {
      // Unowned buyable property or safe tile
      instance.turnPhase = 'DECISION';
      this.startDecisionTimer(instance);
    }

    instance.version++;
    instance.lastActionMessage = actionSummary;

    const result: ActionResult = {
      success: true,
      gameId,
      version: instance.version,
      message: actionSummary,
    };

    await this.recordAction(instance, userId, 'ROLL_DICE', actionId, { diceRoll }, result);
    return result;
  }

  private static startDecisionTimer(instance: GameInstance): void {
    const deadline = Date.now() + GAME_RULES.TURN_DECISION_TIMEOUT_SECONDS * 1000;
    instance.turnDeadline = deadline;
    TimerManager.startTurnTimer(instance.gameId, GAME_RULES.TURN_DECISION_TIMEOUT_SECONDS * 1000);
  }

  /**
   * Pays 100 fine to get out of jail.
   */
  public static async payJailFine(
    gameId: string,
    userId: string,
    actionId: string
  ): Promise<ActionResult> {
    const instance = await GameStateManager.getGame(gameId);
    if (!instance || instance.currentPlayerId !== userId) {
      throw new Error('Not your turn.');
    }

    const player = instance.players.get(userId)!;
    if (!player.jailed) throw new Error('Player is not in jail.');

    const activeLoan = instance.loans.get(userId) ?? null;
    const allProps = Array.from(instance.properties.values());
    const settlement = EconomyEngine.settleMandatoryCharge(
      GAME_RULES.JAIL_FINE,
      player,
      allProps,
      activeLoan
    );

    player.cash = settlement.newCash;
    player.unpaidBills = settlement.newUnpaidBills;
    player.jailed = false;
    player.jailTurns = 0;

    this.addLedgerEntry(instance, userId, actionId, 'JAIL_FINE', -settlement.paidAmount, player.cash);
    instance.version++;
    instance.lastActionMessage = `${player.username} paid 100 coins jail fine and is free to roll!`;

    const result: ActionResult = {
      success: true,
      gameId,
      version: instance.version,
      message: instance.lastActionMessage,
    };

    await this.recordAction(instance, userId, 'PAY_JAIL_FINE', actionId, {}, result);
    return result;
  }

  /**
   * Skips turn to get out of jail.
   */
  public static async skipJailTurn(
    gameId: string,
    userId: string,
    actionId: string
  ): Promise<ActionResult> {
    const instance = await GameStateManager.getGame(gameId);
    if (!instance || instance.currentPlayerId !== userId) {
      throw new Error('Not your turn.');
    }

    const player = instance.players.get(userId)!;
    if (!player.jailed) throw new Error('Player is not in jail.');

    player.jailed = false;
    player.jailTurns = 0;
    instance.lastActionMessage = `${player.username} skipped a turn in jail. Next turn they can roll!`;

    // End turn automatically
    return this.endTurn(gameId, userId, actionId);
  }

  /**
   * Purchases an unowned buyable property.
   */
  public static async buyProperty(
    gameId: string,
    userId: string,
    propertyId: number,
    actionId: string
  ): Promise<ActionResult> {
    const instance = await GameStateManager.getGame(gameId);
    if (!instance || instance.currentPlayerId !== userId) {
      throw new Error('Not your turn.');
    }

    const prop = Array.from(instance.properties.values()).find((p) => p.propertyId === propertyId);
    if (!prop) throw new Error('Property not found.');
    if (prop.ownerUserId) throw new Error('Property is already owned.');

    const tile = getTileByIndex(prop.boardIndex);
    const price = tile.price ?? 0;
    const player = instance.players.get(userId)!;

    if (player.cash < price) {
      throw new Error(`Insufficient cash. Price is ${price} coins, you have ${player.cash} coins.`);
    }

    player.cash -= price;
    prop.ownerUserId = userId;

    this.addLedgerEntry(instance, userId, actionId, 'PURCHASE_PROPERTY', -price, player.cash, {
      propertyName: tile.name,
      propertyId,
    });

    instance.version++;
    instance.lastActionMessage = `${player.username} purchased ${tile.name} for ${price} coins!`;

    const result: ActionResult = {
      success: true,
      gameId,
      version: instance.version,
      message: instance.lastActionMessage,
    };

    await this.recordAction(instance, userId, 'BUY_PROPERTY', actionId, { propertyId }, result);
    return result;
  }

  /**
   * Declines property purchase, triggering 10s timed Auction.
   */
  public static async declineProperty(
    gameId: string,
    userId: string,
    propertyId: number,
    actionId: string
  ): Promise<ActionResult> {
    const instance = await GameStateManager.getGame(gameId);
    if (!instance || instance.currentPlayerId !== userId) {
      throw new Error('Not your turn.');
    }

    const prop = Array.from(instance.properties.values()).find((p) => p.propertyId === propertyId);
    if (!prop || prop.ownerUserId) {
      throw new Error('Invalid property for auction.');
    }

    TimerManager.clearTurnTimer(gameId);
    const tile = getTileByIndex(prop.boardIndex);
    const startingBid = PropertyEngine.calculateAuctionStartingBid(tile.price ?? 0);

    const auction: AuctionState = {
      id: uuidv4(),
      gameId,
      propertyId,
      boardIndex: prop.boardIndex,
      status: 'ACTIVE',
      startingBid,
      highestBid: 0,
      highestBidderId: null,
      endsAt: Date.now() + GAME_RULES.AUCTION_DURATION_SECONDS * 1000,
      createdAt: Date.now(),
    };

    instance.activeAuction = auction;
    instance.turnPhase = 'AUCTION';
    instance.turnDeadline = auction.endsAt;
    instance.version++;
    instance.lastActionMessage = `Auction started for ${tile.name}! Starting bid: ${startingBid} coins.`;

    TimerManager.startAuctionTimer(gameId, GAME_RULES.AUCTION_DURATION_SECONDS * 1000);

    const result: ActionResult = {
      success: true,
      gameId,
      version: instance.version,
      message: instance.lastActionMessage,
    };

    await this.recordAction(instance, userId, 'DECLINE_PROPERTY', actionId, { propertyId }, result);
    return result;
  }

  /**
   * Places a bid on the active auction.
   */
  public static async placeBid(
    gameId: string,
    userId: string,
    auctionId: string,
    amount: number,
    actionId: string
  ): Promise<ActionResult> {
    const instance = await GameStateManager.getGame(gameId);
    if (!instance || !instance.activeAuction || instance.activeAuction.id !== auctionId) {
      throw new Error('No active auction for this game.');
    }

    const auction = instance.activeAuction;
    if (auction.status !== 'ACTIVE') throw new Error('Auction is closed.');

    const player = instance.players.get(userId);
    if (!player) throw new Error('Player not in game.');

    if (player.cash < amount) {
      throw new Error(`Insufficient cash. Your bid: ${amount}, Cash: ${player.cash}`);
    }

    const minRequired = auction.highestBid > 0
      ? auction.highestBid + GAME_RULES.AUCTION_MIN_INCREMENT
      : auction.startingBid;

    if (amount < minRequired) {
      throw new Error(`Minimum bid required is ${minRequired} coins.`);
    }

    auction.highestBid = amount;
    auction.highestBidderId = userId;
    instance.version++;
    instance.lastActionMessage = `${player.username} placed the highest bid: ${amount} coins!`;

    const result: ActionResult = {
      success: true,
      gameId,
      version: instance.version,
      message: instance.lastActionMessage,
    };

    await this.recordAction(instance, userId, 'PLACE_BID', actionId, { auctionId, amount }, result);
    return result;
  }

  /**
   * Closes active auction after 10 seconds.
   */
  public static async closeAuction(gameId: string): Promise<ActionResult> {
    const instance = await GameStateManager.getGame(gameId);
    if (!instance || !instance.activeAuction) {
      return { success: false, gameId, version: 0, message: 'No auction' };
    }

    const auction = instance.activeAuction;
    auction.status = 'CLOSED';
    TimerManager.clearAuctionTimer(gameId);

    const prop = Array.from(instance.properties.values()).find(
      (p) => p.propertyId === auction.propertyId
    )!;
    const tile = getTileByIndex(prop.boardIndex);

    if (auction.highestBidderId && auction.highestBid > 0) {
      const winner = instance.players.get(auction.highestBidderId)!;
      winner.cash -= auction.highestBid;
      prop.ownerUserId = winner.userId;

      this.addLedgerEntry(
        instance,
        winner.userId,
        uuidv4(),
        'AUCTION_WIN',
        -auction.highestBid,
        winner.cash,
        { propertyName: tile.name, bid: auction.highestBid }
      );

      instance.lastActionMessage = `${winner.username} won the auction for ${tile.name} at ${auction.highestBid} coins!`;
    } else {
      instance.lastActionMessage = `Auction ended with no bids. ${tile.name} remains unowned.`;
    }

    instance.activeAuction = null;
    instance.turnPhase = 'DECISION';
    this.startDecisionTimer(instance);

    instance.version++;
    return {
      success: true,
      gameId,
      version: instance.version,
      message: instance.lastActionMessage,
    };
  }

  /**
   * Upgrades building on a property (with 25% VAT check if incomplete set).
   */
  public static async buildProperty(
    gameId: string,
    userId: string,
    propertyId: number,
    actionId: string
  ): Promise<ActionResult> {
    const instance = await GameStateManager.getGame(gameId);
    if (!instance) throw new Error('Game not found.');

    const prop = Array.from(instance.properties.values()).find((p) => p.propertyId === propertyId);
    if (!prop) throw new Error('Property not found.');
    if (prop.ownerUserId !== userId) throw new Error('You do not own this property.');
    if (prop.mortgaged) throw new Error('Cannot upgrade mortgaged properties.');

    const tile = getTileByIndex(prop.boardIndex);
    if (tile.type !== 'PROPERTY') throw new Error('Can only construct buildings on standard property tiles.');

    const allProps = Array.from(instance.properties.values());
    const isComplete = PropertyEngine.isCategoryComplete(tile.categoryId, userId, allProps);

    const costCalc = PropertyEngine.calculateUpgradeCost(prop.buildingLevel, isComplete);
    const player = instance.players.get(userId)!;

    if (player.cash < costCalc.totalCost) {
      throw new Error(`Insufficient cash. Required: ${costCalc.totalCost} coins (Base: ${costCalc.baseCost}, VAT: ${costCalc.vat}), Cash: ${player.cash}`);
    }

    player.cash -= costCalc.totalCost;
    prop.buildingLevel = costCalc.nextLevel;
    prop.baseUpgradeSpent += costCalc.baseCost;

    this.addLedgerEntry(
      instance,
      userId,
      actionId,
      'BUILDING_UPGRADE',
      -costCalc.totalCost,
      player.cash,
      {
        propertyName: tile.name,
        newLevel: costCalc.nextLevel,
        baseCost: costCalc.baseCost,
        vat: costCalc.vat,
      }
    );

    instance.version++;
    instance.lastActionMessage = `${player.username} upgraded ${tile.name} to Level ${costCalc.nextLevel} for ${costCalc.totalCost} coins${costCalc.vat > 0 ? ` (includes ${costCalc.vat} VAT)` : ''}!`;

    const result: ActionResult = {
      success: true,
      gameId,
      version: instance.version,
      message: instance.lastActionMessage,
    };

    await this.recordAction(instance, userId, 'BUILD_PROPERTY', actionId, { propertyId }, result);
    return result;
  }

  /**
   * Takes bank loan up to 300 coins.
   */
  public static async takeLoan(
    gameId: string,
    userId: string,
    amount: number,
    actionId: string
  ): Promise<ActionResult> {
    const instance = await GameStateManager.getGame(gameId);
    if (!instance) throw new Error('Game not found.');

    const existingLoan = instance.loans.get(userId) ?? null;
    BankEngine.validateLoanRequest(existingLoan, amount);

    const player = instance.players.get(userId)!;
    const now = Date.now();

    const newLoan: LoanState = {
      id: uuidv4(),
      gameId,
      userId,
      principal: amount,
      accruedInterest: 0,
      status: 'ACTIVE',
      issuedAt: now,
      lastInterestAt: now,
    };

    instance.loans.set(userId, newLoan);
    player.cash += amount;

    this.addLedgerEntry(instance, userId, actionId, 'LOAN_DISBURSEMENT', amount, player.cash);
    instance.version++;
    instance.lastActionMessage = `${player.username} took a bank loan of ${amount} coins.`;

    const result: ActionResult = {
      success: true,
      gameId,
      version: instance.version,
      message: instance.lastActionMessage,
    };

    await this.recordAction(instance, userId, 'TAKE_LOAN', actionId, { amount }, result);
    return result;
  }

  /**
   * Repays bank loan (interest first, then principal).
   */
  public static async repayLoan(
    gameId: string,
    userId: string,
    amount: number,
    actionId: string
  ): Promise<ActionResult> {
    const instance = await GameStateManager.getGame(gameId);
    if (!instance) throw new Error('Game not found.');

    const loan = instance.loans.get(userId);
    if (!loan || loan.status !== 'ACTIVE') {
      throw new Error('You do not have an active bank loan.');
    }

    const player = instance.players.get(userId)!;
    const now = Date.now();
    const currentAccrued = BankEngine.getUpdatedAccruedInterest(
      loan,
      instance.startedAt ?? now,
      now
    );
    const totalDebt = loan.principal + currentAccrued;

    // Auto-clamp repayment if player pays full debt or within tick-drift tolerance (2 coins)
    let actualAmount = amount;
    if (actualAmount >= totalDebt || Math.abs(actualAmount - totalDebt) <= 2) {
      if (player.cash >= totalDebt) {
        actualAmount = totalDebt;
      } else {
        actualAmount = Math.min(actualAmount, player.cash);
      }
    } else if (actualAmount > totalDebt) {
      actualAmount = totalDebt;
    }

    if (player.cash < actualAmount) {
      throw new Error(`Insufficient cash. Repayment: ${actualAmount}, Cash: ${player.cash}`);
    }

    const repayment = BankEngine.calculateRepayment(
      loan,
      actualAmount,
      instance.startedAt ?? now,
      now
    );

    player.cash -= actualAmount;
    loan.principal = repayment.remainingPrincipal;
    loan.accruedInterest = repayment.remainingAccruedInterest;
    loan.lastInterestAt = now;

    if (repayment.isFullyRepaid || (loan.principal === 0 && loan.accruedInterest <= 1)) {
      loan.principal = 0;
      loan.accruedInterest = 0;
      loan.status = 'REPAID';
    }

    this.addLedgerEntry(instance, userId, actionId, 'LOAN_REPAYMENT', -actualAmount, player.cash, {
      interestPaid: repayment.interestPaid,
      principalPaid: repayment.principalPaid,
    });

    instance.version++;
    instance.lastActionMessage = `${player.username} repaid ${actualAmount} coins on loan (${repayment.interestPaid} interest, ${repayment.principalPaid} principal).`;

    const result: ActionResult = {
      success: true,
      gameId,
      version: instance.version,
      message: instance.lastActionMessage,
    };

    await this.recordAction(instance, userId, 'REPAY_LOAN', actionId, { amount }, result);
    return result;
  }

  /**
   * Mortgages property (Level 0 only).
   */
  public static async mortgageProperty(
    gameId: string,
    userId: string,
    propertyId: number,
    actionId: string
  ): Promise<ActionResult> {
    const instance = await GameStateManager.getGame(gameId);
    if (!instance) throw new Error('Game not found.');

    const prop = Array.from(instance.properties.values()).find((p) => p.propertyId === propertyId);
    if (!prop || prop.ownerUserId !== userId) throw new Error('You do not own this property.');
    if (prop.mortgaged) throw new Error('Property is already mortgaged.');
    if (prop.buildingLevel > 0) throw new Error('Cannot mortgage properties with buildings on them.');

    const tile = getTileByIndex(prop.boardIndex);
    const proceeds = PropertyEngine.calculateMortgageProceeds(tile.price ?? 0);
    const player = instance.players.get(userId)!;

    prop.mortgaged = true;
    player.cash += proceeds;

    this.addLedgerEntry(instance, userId, actionId, 'MORTGAGE_PROCEEDS', proceeds, player.cash, {
      propertyName: tile.name,
    });

    instance.version++;
    instance.lastActionMessage = `${player.username} mortgaged ${tile.name} for ${proceeds} coins.`;

    const result: ActionResult = {
      success: true,
      gameId,
      version: instance.version,
      message: instance.lastActionMessage,
    };

    await this.recordAction(instance, userId, 'MORTGAGE_PROPERTY', actionId, { propertyId }, result);
    return result;
  }

  /**
   * Unmortgages property (cost = 55% of purchase price).
   */
  public static async unmortgageProperty(
    gameId: string,
    userId: string,
    propertyId: number,
    actionId: string
  ): Promise<ActionResult> {
    const instance = await GameStateManager.getGame(gameId);
    if (!instance) throw new Error('Game not found.');

    const prop = Array.from(instance.properties.values()).find((p) => p.propertyId === propertyId);
    if (!prop || prop.ownerUserId !== userId) throw new Error('You do not own this property.');
    if (!prop.mortgaged) throw new Error('Property is not mortgaged.');

    const tile = getTileByIndex(prop.boardIndex);
    const cost = PropertyEngine.calculateUnmortgageCost(tile.price ?? 0);
    const player = instance.players.get(userId)!;

    if (player.cash < cost) {
      throw new Error(`Insufficient cash. Unmortgage cost is ${cost} coins, you have ${player.cash} coins.`);
    }

    player.cash -= cost;
    prop.mortgaged = false;

    this.addLedgerEntry(instance, userId, actionId, 'UNMORTGAGE_PAYMENT', -cost, player.cash, {
      propertyName: tile.name,
    });

    instance.version++;
    instance.lastActionMessage = `${player.username} unmortgaged ${tile.name} for ${cost} coins.`;

    const result: ActionResult = {
      success: true,
      gameId,
      version: instance.version,
      message: instance.lastActionMessage,
    };

    await this.recordAction(instance, userId, 'UNMORTGAGE_PROPERTY', actionId, { propertyId }, result);
    return result;
  }

  /**
   * Ends current player turn and advances to next player.
   */
  public static async endTurn(
    gameId: string,
    userId: string,
    actionId: string
  ): Promise<ActionResult> {
    const instance = await GameStateManager.getGame(gameId);
    if (!instance || instance.status !== 'ACTIVE') {
      throw new Error('Game not active.');
    }

    if (instance.currentPlayerId !== userId) {
      throw new Error('Not your turn.');
    }

    TimerManager.clearTurnTimer(gameId);

    // Check if 30-min match deadline reached
    if (instance.endsAt && Date.now() >= instance.endsAt) {
      return this.finishMatch(gameId, 'TIME_EXPIRED');
    }

    // Advance turn order
    const sortedPlayers = Array.from(instance.players.values()).sort(
      (a, b) => a.turnOrder - b.turnOrder
    );
    const currentIndex = sortedPlayers.findIndex((p) => p.userId === userId);
    const nextIndex = (currentIndex + 1) % sortedPlayers.length;
    const nextPlayer = sortedPlayers[nextIndex];

    instance.currentPlayerId = nextPlayer.userId;
    instance.turnPhase = 'WAITING_ROLL';
    instance.turnDeadline = Date.now() + 25000;
    instance.lastDice = null;
    instance.activeEventCard = null;
    instance.version++;
    instance.lastActionMessage = `Turn ended. It is now ${nextPlayer.username}'s turn to roll!`;

    TimerManager.startTurnTimer(gameId, 25000);

    const result: ActionResult = {
      success: true,
      gameId,
      version: instance.version,
      message: instance.lastActionMessage,
    };

    await this.recordAction(instance, userId, 'END_TURN', actionId, {}, result);
    return result;
  }

  /**
   * Final scoring at 30-min deadline or game conclusion.
   */
  public static async finishMatch(
    gameId: string,
    reason: 'TIME_EXPIRED' | 'CONCESSION' | 'COMPLETED'
  ): Promise<ActionResult<GameStandings>> {
    const instance = await GameStateManager.getGame(gameId);
    if (!instance) throw new Error('Game not found.');

    TimerManager.clearAllForGame(gameId);
    instance.status = 'FINISHED';
    instance.turnPhase = 'TURN_TRANSITION';
    instance.turnDeadline = null;

    // Update accrued interest on all active loans up to match end
    const now = Date.now();
    for (const loan of instance.loans.values()) {
      if (loan.status === 'ACTIVE') {
        loan.accruedInterest = BankEngine.getUpdatedAccruedInterest(
          loan,
          instance.startedAt ?? now,
          now
        );
      }
    }

    const allPlayers = Array.from(instance.players.values());
    const allProps = Array.from(instance.properties.values());
    const loansRecord: Record<string, LoanState | null> = {};
    for (const p of allPlayers) {
      loansRecord[p.userId] = instance.loans.get(p.userId) ?? null;
    }

    const standings = ScoringEngine.calculateStandings(allPlayers, allProps, loansRecord);
    instance.standings = standings;
    instance.version++;

    const winnerName = standings.winnerUserId
      ? instance.players.get(standings.winnerUserId)?.username
      : 'Tied Game';

    instance.lastActionMessage = `Match finished! Winner: ${winnerName} with Net Worth ${standings.rankings[0]?.netWorth ?? 0} coins!`;

    // Persist game results
    await db.query(
      `INSERT INTO game_results (game_id, winner_user_id, standings)
       VALUES ($1, $2, $3)
       ON CONFLICT (game_id) DO UPDATE SET standings = EXCLUDED.standings`,
      [gameId, standings.winnerUserId, JSON.stringify(standings)]
    );

    await GameStateManager.persistGameVersion(instance);

    return {
      success: true,
      gameId,
      version: instance.version,
      data: standings,
      message: instance.lastActionMessage,
    };
  }

  /**
   * Resets a finished (or active) game back to a clean LOBBY state for a new match.
   */
  public static async rematchGame(
    gameId: string,
    userId: string
  ): Promise<ActionResult<GameSnapshot>> {
    const instance = await GameStateManager.getGame(gameId);
    if (!instance) throw new Error('Game not found.');

    TimerManager.clearAllForGame(gameId);

    // Reset status and timing
    instance.status = 'LOBBY';
    instance.startedAt = null;
    instance.endsAt = null;
    instance.currentPlayerId = null;
    instance.turnPhase = 'WAITING_ROLL';
    instance.turnDeadline = null;
    instance.lastDice = null;
    instance.activeAuction = null;
    instance.standings = undefined;
    const initiatorName = instance.players.get(userId)?.username || 'Host';
    instance.lastActionMessage = `${initiatorName} started a new match lobby!`;

    // Clear loans and ledger
    instance.loans.clear();
    instance.ledger = [];

    // Re-shuffle event decks
    instance.eventDeck = [...EVENT_CARDS].sort(() => Math.random() - 0.5);
    instance.chanceDeck = [...EVENT_CARDS].sort(() => Math.random() - 0.5);

    // Reset all 40 properties to unowned, no buildings, not mortgaged
    for (const tile of BOARD_TILES) {
      instance.properties.set(tile.index, {
        propertyId: tile.index + 1,
        boardIndex: tile.index,
        ownerUserId: null,
        buildingLevel: 0,
        baseUpgradeSpent: 0,
        mortgaged: false,
      });
    }

    // Reset all players
    for (const player of instance.players.values()) {
      player.position = 0;
      player.cash = GAME_RULES.STARTING_CASH;
      player.unpaidBills = 0;
      player.turnsTaken = 0;
      player.jailed = false;
      player.jailTurns = 0;
      // Host ready by default, others need to click ready
      player.ready = player.userId === instance.hostUserId;
    }

    instance.version++;
    await GameStateManager.persistGameVersion(instance);

    return {
      success: true,
      gameId,
      version: instance.version,
      data: GameStateManager.getSnapshot(instance),
      message: 'New match lobby ready!',
    };
  }

  /**
   * Safe-default timeout handler when 25s decision timer expires.
   */
  public static async handleTurnTimeout(gameId: string): Promise<void> {
    const instance = await GameStateManager.getGame(gameId);
    if (!instance || instance.status !== 'ACTIVE' || !instance.currentPlayerId) return;

    const currentPlayer = instance.players.get(instance.currentPlayerId);
    if (!currentPlayer) return;

    // 1. If timed out waiting to roll dice
    if (instance.turnPhase === 'WAITING_ROLL') {
      currentPlayer.missedRollStreak = (currentPlayer.missedRollStreak || 0) + 1;
      const penalty = currentPlayer.missedRollStreak * 10;
      currentPlayer.cash = Math.max(0, currentPlayer.cash - penalty);

      this.addLedgerEntry(
        instance,
        currentPlayer.userId,
        uuidv4(),
        'MISSED_DICE_PENALTY',
        -penalty,
        currentPlayer.cash,
        { streak: currentPlayer.missedRollStreak, penalty }
      );

      console.log(
        `[TurnEngine] 25s Roll Timeout: ${currentPlayer.username} penalized -${penalty}c (Miss streak: ${currentPlayer.missedRollStreak})`
      );

      instance.lastActionMessage = `⏳ 25s Roll Deadline expired! ${currentPlayer.username} penalized -${penalty}c (Miss Streak: ${currentPlayer.missedRollStreak}) and auto-rolled!`;

      // Auto-roll dice on player's behalf so game continues smoothly!
      await this.rollDice(gameId, currentPlayer.userId, uuidv4());
      return;
    }

    // 2. If timed out during decision phase
    if (instance.turnPhase === 'DECISION') {
      console.log(`[TurnEngine] 25s Decision timeout expired for player ${currentPlayer.username} in game ${gameId}`);

      // If on an unowned property during decision, decline property (triggers auction)
      const currentTile = getTileByIndex(currentPlayer.position);
      const prop = Array.from(instance.properties.values()).find(
        (p) => p.boardIndex === currentPlayer.position
      );

      if (
        (currentTile.type === 'PROPERTY' || currentTile.type === 'TRANSIT' || currentTile.type === 'UTILITY') &&
        prop &&
        !prop.ownerUserId
      ) {
        // Decline property -> triggers auction
        await this.declineProperty(gameId, currentPlayer.userId, prop.propertyId, uuidv4());
        return;
      }

      // Otherwise, advance turn
      await this.endTurn(gameId, currentPlayer.userId, uuidv4());
    }
  }
}
