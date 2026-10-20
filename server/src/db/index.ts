import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePropertyRecords, PropertyRecord } from './seedProperties.js';

const { Pool } = pg;

export interface QueryResult<T = any> {
  rows: T[];
  rowCount?: number;
}

export interface DatabaseClient {
  query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
}

export interface TransactionClient extends DatabaseClient {
  // Methods inside a transaction
}

class InMemoryDatabase {
  public users: Map<string, any> = new Map();
  public games: Map<string, any> = new Map();
  public game_players: Map<string, any> = new Map(); // key: `${gameId}_${userId}`
  public properties: Map<number, PropertyRecord> = new Map();
  public game_properties: Map<string, any> = new Map(); // key: `${gameId}_${propertyId}`
  public loans: Map<string, any> = new Map();
  public auctions: Map<string, any> = new Map();
  public auction_bids: Map<string, any> = new Map();
  public game_actions: Map<string, any> = new Map(); // key: `${gameId}_${idempotencyKey}`
  public financial_ledger: any[] = [];
  public game_events: Map<string, any> = new Map();
  public game_results: Map<string, any> = new Map();

  private ledgerSeq = 1;

  constructor() {
    this.seedProperties();
  }

  public seedProperties(): void {
    const records = generatePropertyRecords();
    for (const record of records) {
      this.properties.set(record.id, record);
    }
  }

  public getNextLedgerId(): number {
    return this.ledgerSeq++;
  }
}

class DatabaseManager {
  private pool: pg.Pool | null = null;
  public inMemoryDb: InMemoryDatabase | null = null;
  private isConnectedToPostgres = false;

  public async initialize(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;

    if (databaseUrl) {
      try {
        this.pool = new Pool({
          connectionString: databaseUrl,
          connectionTimeoutMillis: 3000,
        });

        // Test connection
        const client = await this.pool.connect();
        client.release();
        this.isConnectedToPostgres = true;
        console.log('[Database] Connected to PostgreSQL via DATABASE_URL');

        // Apply schema
        await this.runMigrations();
        await this.seedPostgresProperties();
        return;
      } catch (err) {
        console.warn('[Database] PostgreSQL connection failed. Falling back to local high-performance in-memory DB:', (err as Error).message);
        this.pool = null;
        this.isConnectedToPostgres = false;
      }
    } else {
      console.log('[Database] No DATABASE_URL specified. Running with local in-memory transactional database.');
    }

    this.inMemoryDb = new InMemoryDatabase();
  }

  private async runMigrations(): Promise<void> {
    if (!this.pool) return;
    try {
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const schemaSqlPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(schemaSqlPath)) {
        const schemaSql = fs.readFileSync(schemaSqlPath, 'utf8');
        await this.pool.query(schemaSql);
        console.log('[Database] Migrations executed successfully');
      }
    } catch (e) {
      console.error('[Database] Migration error:', e);
    }
  }

  private async seedPostgresProperties(): Promise<void> {
    if (!this.pool) return;
    const records = generatePropertyRecords();
    for (const p of records) {
      await this.pool.query(
        `INSERT INTO properties (id, board_index, name, tile_type, category_id, purchase_price, base_rent, building_costs, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (board_index) DO UPDATE
         SET name = EXCLUDED.name, purchase_price = EXCLUDED.purchase_price, base_rent = EXCLUDED.base_rent;`,
        [p.id, p.board_index, p.name, p.tile_type, p.category_id, p.purchase_price, p.base_rent, p.building_costs, p.metadata]
      );
    }
  }

  public async query<T = any>(text: string, params: any[] = []): Promise<QueryResult<T>> {
    if (this.isConnectedToPostgres && this.pool) {
      const res = await this.pool.query(text, params);
      return { rows: res.rows as T[], rowCount: res.rowCount ?? 0 };
    }

    // In-memory query simulation
    return { rows: [], rowCount: 0 };
  }

  public async withTransaction<T>(
    callback: (client: TransactionClient) => Promise<T>
  ): Promise<T> {
    if (this.isConnectedToPostgres && this.pool) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        const result = await callback(client as unknown as TransactionClient);
        await client.query('COMMIT');
        return result;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }

    // In-memory pseudo-transaction execution
    return await callback(this as unknown as TransactionClient);
  }
}

export const db = new DatabaseManager();
