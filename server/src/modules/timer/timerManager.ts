export type TimerCallback = (gameId: string) => Promise<void>;

export class TimerManager {
  private static turnTimers: Map<string, NodeJS.Timeout> = new Map();
  private static auctionTimers: Map<string, NodeJS.Timeout> = new Map();
  private static matchTimers: Map<string, NodeJS.Timeout> = new Map();

  private static onTurnTimeout?: TimerCallback;
  private static onAuctionTimeout?: TimerCallback;
  private static onMatchTimeout?: TimerCallback;

  public static registerCallbacks(handlers: {
    onTurnTimeout: TimerCallback;
    onAuctionTimeout: TimerCallback;
    onMatchTimeout: TimerCallback;
  }): void {
    this.onTurnTimeout = handlers.onTurnTimeout;
    this.onAuctionTimeout = handlers.onAuctionTimeout;
    this.onMatchTimeout = handlers.onMatchTimeout;
  }

  /**
   * Starts a 25-second decision timer.
   */
  public static startTurnTimer(gameId: string, durationMs: number = 25000): void {
    this.clearTurnTimer(gameId);
    const timer = setTimeout(async () => {
      this.turnTimers.delete(gameId);
      if (this.onTurnTimeout) {
        try {
          await this.onTurnTimeout(gameId);
        } catch (e) {
          console.error(`[TimerManager] Error in turn timeout callback for ${gameId}:`, e);
        }
      }
    }, durationMs);

    this.turnTimers.set(gameId, timer);
  }

  public static clearTurnTimer(gameId: string): void {
    const timer = this.turnTimers.get(gameId);
    if (timer) {
      clearTimeout(timer);
      this.turnTimers.delete(gameId);
    }
  }

  /**
   * Starts a 10-second auction timer.
   */
  public static startAuctionTimer(gameId: string, durationMs: number = 10000): void {
    this.clearAuctionTimer(gameId);
    const timer = setTimeout(async () => {
      this.auctionTimers.delete(gameId);
      if (this.onAuctionTimeout) {
        try {
          await this.onAuctionTimeout(gameId);
        } catch (e) {
          console.error(`[TimerManager] Error in auction timeout callback for ${gameId}:`, e);
        }
      }
    }, durationMs);

    this.auctionTimers.set(gameId, timer);
  }

  public static clearAuctionTimer(gameId: string): void {
    const timer = this.auctionTimers.get(gameId);
    if (timer) {
      clearTimeout(timer);
      this.auctionTimers.delete(gameId);
    }
  }

  /**
   * Starts the 30-minute match deadline timer.
   */
  public static startMatchTimer(gameId: string, durationMs: number = 30 * 60 * 1000): void {
    this.clearMatchTimer(gameId);
    const timer = setTimeout(async () => {
      this.matchTimers.delete(gameId);
      if (this.onMatchTimeout) {
        try {
          await this.onMatchTimeout(gameId);
        } catch (e) {
          console.error(`[TimerManager] Error in match timeout callback for ${gameId}:`, e);
        }
      }
    }, durationMs);

    this.matchTimers.set(gameId, timer);
  }

  public static clearMatchTimer(gameId: string): void {
    const timer = this.matchTimers.get(gameId);
    if (timer) {
      clearTimeout(timer);
      this.matchTimers.delete(gameId);
    }
  }

  public static clearAllForGame(gameId: string): void {
    this.clearTurnTimer(gameId);
    this.clearAuctionTimer(gameId);
    this.clearMatchTimer(gameId);
  }
}
