import {
  GameSnapshot,
  PlayerState,
  GamePropertyState,
  LoanState,
  AuctionState,
  LedgerEntry,
  EventCard,
  TurnPhase,
  GameStatus,
  BOARD_TILES,
  EVENT_CARDS,
  GAME_RULES,
  ActiveEventCard,
} from '@block-party/shared';
import { db } from '../../db/index.js';

export interface GameInstance {
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
  players: Map<string, PlayerState>;
  properties: Map<number, GamePropertyState>; // key: boardIndex (0..39)
  loans: Map<string, LoanState>; // key: userId
  activeAuction: AuctionState | null;
  activeEventCard: ActiveEventCard | null;
  ledger: LedgerEntry[];
  eventDeck: EventCard[];
  chanceDeck: EventCard[];
  lastActionMessage?: string;
  standings?: any;
}

export class GameStateManager {
  private static games: Map<string, GameInstance> = new Map();

  /**
   * Retrieves or instantiates a game instance.
   */
  public static async getGame(gameId: string): Promise<GameInstance | null> {
    const cached = this.games.get(gameId);
    if (cached) return cached;

    // Check database if in postgres mode
    const res = await db.query(
      `SELECT * FROM games WHERE id = $1`,
      [gameId]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    const instance: GameInstance = {
      gameId: row.id,
      status: row.status as GameStatus,
      hostUserId: row.host_user_id,
      startedAt: row.started_at ? Number(row.started_at) : null,
      endsAt: row.ends_at ? Number(row.ends_at) : null,
      currentPlayerId: row.current_player_id,
      turnPhase: 'WAITING_ROLL',
      turnDeadline: row.turn_deadline ? Number(row.turn_deadline) : null,
      version: Number(row.version),
      lastDice: null,
      players: new Map(),
      properties: new Map(),
      loans: new Map(),
      activeAuction: null,
      activeEventCard: null,
      ledger: [],
      eventDeck: [...EVENT_CARDS].sort(() => Math.random() - 0.5),
      chanceDeck: [...EVENT_CARDS].sort(() => Math.random() - 0.5),
    };

    // Load players
    const playerRows = await db.query(
      `SELECT gp.*, u.username, u.avatar_hash FROM game_players gp
       JOIN users u ON u.discord_user_id = gp.discord_user_id
       WHERE gp.game_id = $1 ORDER BY gp.turn_order ASC`,
      [gameId]
    );

    for (const p of playerRows.rows) {
      instance.players.set(p.discord_user_id, {
        userId: p.discord_user_id,
        username: p.username,
        avatarHash: p.avatar_hash,
        turnOrder: p.turn_order,
        position: p.position,
        cash: Number(p.cash),
        unpaidBills: Number(p.unpaid_bills),
        turnsTaken: p.turns_taken,
        jailed: p.jailed,
        jailTurns: p.jail_turns,
        connected: p.connected,
        ready: p.ready,
        joinedAt: new Date(p.joined_at).getTime(),
      });
    }

    // Load properties
    const propRows = await db.query(
      `SELECT gp.*, p.board_index FROM game_properties gp
       JOIN properties p ON p.id = gp.property_id
       WHERE gp.game_id = $1`,
      [gameId]
    );

    for (const pr of propRows.rows) {
      instance.properties.set(pr.board_index, {
        propertyId: pr.property_id,
        boardIndex: pr.board_index,
        ownerUserId: pr.owner_user_id,
        buildingLevel: pr.building_level,
        baseUpgradeSpent: Number(pr.base_upgrade_spent),
        mortgaged: pr.mortgaged,
      });
    }

    this.games.set(gameId, instance);
    return instance;
  }

  /**
   * Creates a new game instance.
   */
  public static async createGame(gameId: string, hostUser: { userId: string; username: string }): Promise<GameInstance> {
    const existing = await this.getGame(gameId);
    if (existing) return existing;

    const instance: GameInstance = {
      gameId,
      status: 'LOBBY',
      hostUserId: hostUser.userId,
      startedAt: null,
      endsAt: null,
      currentPlayerId: null,
      turnPhase: 'WAITING_ROLL',
      turnDeadline: null,
      version: 1,
      lastDice: null,
      players: new Map(),
      properties: new Map(),
      loans: new Map(),
      activeAuction: null,
      activeEventCard: null,
      ledger: [],
      eventDeck: [...EVENT_CARDS].sort(() => Math.random() - 0.5),
      chanceDeck: [...EVENT_CARDS].sort(() => Math.random() - 0.5),
      lastActionMessage: 'Game lobby created. Waiting for players to join.',
    };

    // Add host as first player
    instance.players.set(hostUser.userId, {
      userId: hostUser.userId,
      username: hostUser.username,
      turnOrder: 0,
      position: 0,
      cash: GAME_RULES.STARTING_CASH,
      unpaidBills: 0,
      turnsTaken: 0,
      jailed: false,
      jailTurns: 0,
      connected: true,
      ready: true, // Host ready by default
      joinedAt: Date.now(),
    });

    // Initialize all 40 game properties
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

    this.games.set(gameId, instance);

    // Persist user and game to database
    await db.query(
      `INSERT INTO users (discord_user_id, username)
       VALUES ($1, $2)
       ON CONFLICT (discord_user_id) DO UPDATE SET username = EXCLUDED.username`,
      [hostUser.userId, hostUser.username]
    );

    await db.query(
      `INSERT INTO games (id, host_user_id, status, version)
       VALUES ($1, $2, 'LOBBY', 1)
       ON CONFLICT (id) DO NOTHING`,
      [gameId, hostUser.userId]
    );

    return instance;
  }

  /**
   * Produces a serializable GameSnapshot to send to clients.
   */
  public static getSnapshot(instance: GameInstance): GameSnapshot {
    const playersList = Array.from(instance.players.values()).sort(
      (a, b) => a.turnOrder - b.turnOrder
    );

    const propertiesList = Array.from(instance.properties.values()).sort(
      (a, b) => a.boardIndex - b.boardIndex
    );

    const activeLoansRecord: Record<string, LoanState> = {};
    for (const [userId, loan] of instance.loans.entries()) {
      if (loan.status === 'ACTIVE') {
        activeLoansRecord[userId] = loan;
      }
    }

    return {
      gameId: instance.gameId,
      status: instance.status,
      hostUserId: instance.hostUserId,
      startedAt: instance.startedAt,
      endsAt: instance.endsAt,
      currentPlayerId: instance.currentPlayerId,
      turnPhase: instance.turnPhase,
      turnDeadline: instance.turnDeadline,
      version: instance.version,
      lastDice: instance.lastDice,
      players: playersList,
      properties: propertiesList,
      activeLoans: activeLoansRecord,
      activeAuction: instance.activeAuction,
      activeEventCard: instance.activeEventCard,
      recentLedger: instance.ledger.slice(-20),
      lastActionMessage: instance.lastActionMessage,
      standings: instance.standings ?? null,
    };
  }

  /**
   * Persists state updates to DB when in PostgreSQL mode.
   */
  public static async persistGameVersion(instance: GameInstance): Promise<void> {
    await db.query(
      `UPDATE games
       SET status = $1, started_at = $2, ends_at = $3,
           current_player_id = $4, turn_deadline = $5, version = $6
       WHERE id = $7`,
      [
        instance.status,
        instance.startedAt,
        instance.endsAt,
        instance.currentPlayerId,
        instance.turnDeadline,
        instance.version,
        instance.gameId,
      ]
    );
  }
}
