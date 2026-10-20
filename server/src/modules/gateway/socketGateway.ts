import { Server as SocketIOServer, Socket } from 'socket.io';
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  GameJoinPayload,
  GameReadyPayload,
  RollDicePayload,
  PayJailFinePayload,
  SkipJailTurnPayload,
  BuyPropertyPayload,
  DeclinePropertyPayload,
  BuildPropertyPayload,
  TakeLoanPayload,
  RepayLoanPayload,
  MortgagePropertyPayload,
  UnmortgagePropertyPayload,
  PlaceBidPayload,
  EndTurnPayload,
  RequestSnapshotPayload,
} from '@block-party/shared';
import { DiscordAuthService, AuthUser } from '../auth/discordAuth.js';
import { GameActionService } from '../game/gameActionService.js';
import { GameStateManager } from '../game/gameStateManager.js';
import { TimerManager } from '../timer/timerManager.js';

interface AuthenticatedSocket extends Socket {
  authUser?: AuthUser;
  currentGameId?: string;
}

export class SocketGateway {
  private static io: SocketIOServer;

  public static initialize(ioServer: SocketIOServer): void {
    this.io = ioServer;

    // Register timer callbacks to broadcast state changes
    TimerManager.registerCallbacks({
      onTurnTimeout: async (gameId: string) => {
        await GameActionService.handleTurnTimeout(gameId);
        await this.broadcastSnapshot(gameId);
      },
      onAuctionTimeout: async (gameId: string) => {
        await GameActionService.closeAuction(gameId);
        await this.broadcastSnapshot(gameId);
      },
      onMatchTimeout: async (gameId: string) => {
        await GameActionService.finishMatch(gameId, 'TIME_EXPIRED');
        await this.broadcastSnapshot(gameId);
      },
    });

    // Socket authentication middleware
    ioServer.use((socket: AuthenticatedSocket, next) => {
      const token = socket.handshake.auth?.token || (socket.handshake.query?.token as string);
      const mockUser = socket.handshake.query?.mockUser as string;

      if (token) {
        try {
          socket.authUser = DiscordAuthService.verifyToken(token);
          return next();
        } catch {
          // Token invalid, check mock user fallback
        }
      }

      // Dev-mode fallback for local multiplayer tabs (?mockUser=user1, user2)
      if (mockUser || process.env.ALLOW_DEV_AUTH === 'true' || process.env.NODE_ENV !== 'production') {
        const user = DiscordAuthService.getMockUser(mockUser || 'user1');
        socket.authUser = user;
        return next();
      }

      return next(new Error('Authentication failed: Missing or invalid token'));
    });

    ioServer.on('connection', (socket: AuthenticatedSocket) => {
      const user = socket.authUser!;
      console.log(`[Socket] User connected: ${user.username} (${user.userId})`);

      socket.on(CLIENT_EVENTS.GAME_JOIN, async (payload: GameJoinPayload) => {
        try {
          const gameId = payload.gameId;
          socket.join(`game_${gameId}`);
          socket.currentGameId = gameId;

          await GameActionService.joinGame(gameId, user);
          await this.broadcastSnapshot(gameId);
        } catch (err) {
          socket.emit(SERVER_EVENTS.ACTION_ERROR, {
            code: 'JOIN_ERROR',
            message: (err as Error).message,
            version: 0,
          });
        }
      });

      socket.on(CLIENT_EVENTS.GAME_READY, async (payload: GameReadyPayload) => {
        if (!socket.currentGameId) return;
        try {
          await GameActionService.setReady(socket.currentGameId, user.userId, payload.ready);
          await this.broadcastSnapshot(socket.currentGameId);
        } catch (err) {
          socket.emit(SERVER_EVENTS.ACTION_ERROR, {
            code: 'READY_ERROR',
            message: (err as Error).message,
          });
        }
      });

      socket.on(CLIENT_EVENTS.GAME_START, async () => {
        if (!socket.currentGameId) return;
        try {
          await GameActionService.startGame(socket.currentGameId, user.userId);
          await this.broadcastSnapshot(socket.currentGameId);
        } catch (err) {
          socket.emit(SERVER_EVENTS.ACTION_ERROR, {
            code: 'START_ERROR',
            message: (err as Error).message,
          });
        }
      });

      socket.on(CLIENT_EVENTS.GAME_REMATCH, async () => {
        if (!socket.currentGameId) return;
        try {
          await GameActionService.rematchGame(socket.currentGameId, user.userId);
          await this.broadcastSnapshot(socket.currentGameId);
        } catch (err) {
          socket.emit(SERVER_EVENTS.ACTION_ERROR, {
            code: 'REMATCH_ERROR',
            message: (err as Error).message,
          });
        }
      });

      socket.on(CLIENT_EVENTS.GAME_END, async () => {
        if (!socket.currentGameId) return;
        try {
          await GameActionService.finishMatch(socket.currentGameId, 'CONCESSION');
          await this.broadcastSnapshot(socket.currentGameId);
        } catch (err) {
          socket.emit(SERVER_EVENTS.ACTION_ERROR, {
            code: 'END_GAME_ERROR',
            message: (err as Error).message,
          });
        }
      });

      socket.on(CLIENT_EVENTS.ROLL_DICE, async (payload: RollDicePayload) => {
        if (!socket.currentGameId) return;
        try {
          await GameActionService.rollDice(socket.currentGameId, user.userId, payload.actionId);
          await this.broadcastSnapshot(socket.currentGameId);
        } catch (err) {
          socket.emit(SERVER_EVENTS.ACTION_ERROR, {
            actionId: payload.actionId,
            code: 'ROLL_ERROR',
            message: (err as Error).message,
          });
        }
      });

      socket.on(CLIENT_EVENTS.PAY_JAIL_FINE, async (payload: PayJailFinePayload) => {
        if (!socket.currentGameId) return;
        try {
          await GameActionService.payJailFine(socket.currentGameId, user.userId, payload.actionId);
          await this.broadcastSnapshot(socket.currentGameId);
        } catch (err) {
          socket.emit(SERVER_EVENTS.ACTION_ERROR, {
            actionId: payload.actionId,
            code: 'JAIL_FINE_ERROR',
            message: (err as Error).message,
          });
        }
      });

      socket.on(CLIENT_EVENTS.SKIP_JAIL_TURN, async (payload: SkipJailTurnPayload) => {
        if (!socket.currentGameId) return;
        try {
          await GameActionService.skipJailTurn(socket.currentGameId, user.userId, payload.actionId);
          await this.broadcastSnapshot(socket.currentGameId);
        } catch (err) {
          socket.emit(SERVER_EVENTS.ACTION_ERROR, {
            actionId: payload.actionId,
            code: 'JAIL_SKIP_ERROR',
            message: (err as Error).message,
          });
        }
      });

      socket.on(CLIENT_EVENTS.BUY_PROPERTY, async (payload: BuyPropertyPayload) => {
        if (!socket.currentGameId) return;
        try {
          await GameActionService.buyProperty(
            socket.currentGameId,
            user.userId,
            payload.propertyId,
            payload.actionId
          );
          await this.broadcastSnapshot(socket.currentGameId);
        } catch (err) {
          socket.emit(SERVER_EVENTS.ACTION_ERROR, {
            actionId: payload.actionId,
            code: 'BUY_ERROR',
            message: (err as Error).message,
          });
        }
      });

      socket.on(CLIENT_EVENTS.DECLINE_PROPERTY, async (payload: DeclinePropertyPayload) => {
        if (!socket.currentGameId) return;
        try {
          await GameActionService.declineProperty(
            socket.currentGameId,
            user.userId,
            payload.propertyId,
            payload.actionId
          );
          await this.broadcastSnapshot(socket.currentGameId);
        } catch (err) {
          socket.emit(SERVER_EVENTS.ACTION_ERROR, {
            actionId: payload.actionId,
            code: 'DECLINE_ERROR',
            message: (err as Error).message,
          });
        }
      });

      socket.on(CLIENT_EVENTS.PLACE_BID, async (payload: PlaceBidPayload) => {
        if (!socket.currentGameId) return;
        try {
          await GameActionService.placeBid(
            socket.currentGameId,
            user.userId,
            payload.auctionId,
            payload.amount,
            payload.actionId
          );
          await this.broadcastSnapshot(socket.currentGameId);
        } catch (err) {
          socket.emit(SERVER_EVENTS.ACTION_ERROR, {
            actionId: payload.actionId,
            code: 'BID_ERROR',
            message: (err as Error).message,
          });
        }
      });

      socket.on(CLIENT_EVENTS.BUILD_PROPERTY, async (payload: BuildPropertyPayload) => {
        if (!socket.currentGameId) return;
        try {
          await GameActionService.buildProperty(
            socket.currentGameId,
            user.userId,
            payload.propertyId,
            payload.actionId
          );
          await this.broadcastSnapshot(socket.currentGameId);
        } catch (err) {
          socket.emit(SERVER_EVENTS.ACTION_ERROR, {
            actionId: payload.actionId,
            code: 'BUILD_ERROR',
            message: (err as Error).message,
          });
        }
      });

      socket.on(CLIENT_EVENTS.TAKE_LOAN, async (payload: TakeLoanPayload) => {
        if (!socket.currentGameId) return;
        try {
          await GameActionService.takeLoan(
            socket.currentGameId,
            user.userId,
            payload.amount,
            payload.actionId
          );
          await this.broadcastSnapshot(socket.currentGameId);
        } catch (err) {
          socket.emit(SERVER_EVENTS.ACTION_ERROR, {
            actionId: payload.actionId,
            code: 'LOAN_ERROR',
            message: (err as Error).message,
          });
        }
      });

      socket.on(CLIENT_EVENTS.REPAY_LOAN, async (payload: RepayLoanPayload) => {
        if (!socket.currentGameId) return;
        try {
          await GameActionService.repayLoan(
            socket.currentGameId,
            user.userId,
            payload.amount,
            payload.actionId
          );
          await this.broadcastSnapshot(socket.currentGameId);
        } catch (err) {
          socket.emit(SERVER_EVENTS.ACTION_ERROR, {
            actionId: payload.actionId,
            code: 'REPAY_ERROR',
            message: (err as Error).message,
          });
        }
      });

      socket.on(CLIENT_EVENTS.MORTGAGE_PROPERTY, async (payload: MortgagePropertyPayload) => {
        if (!socket.currentGameId) return;
        try {
          await GameActionService.mortgageProperty(
            socket.currentGameId,
            user.userId,
            payload.propertyId,
            payload.actionId
          );
          await this.broadcastSnapshot(socket.currentGameId);
        } catch (err) {
          socket.emit(SERVER_EVENTS.ACTION_ERROR, {
            actionId: payload.actionId,
            code: 'MORTGAGE_ERROR',
            message: (err as Error).message,
          });
        }
      });

      socket.on(CLIENT_EVENTS.UNMORTGAGE_PROPERTY, async (payload: UnmortgagePropertyPayload) => {
        if (!socket.currentGameId) return;
        try {
          await GameActionService.unmortgageProperty(
            socket.currentGameId,
            user.userId,
            payload.propertyId,
            payload.actionId
          );
          await this.broadcastSnapshot(socket.currentGameId);
        } catch (err) {
          socket.emit(SERVER_EVENTS.ACTION_ERROR, {
            actionId: payload.actionId,
            code: 'UNMORTGAGE_ERROR',
            message: (err as Error).message,
          });
        }
      });

      socket.on(CLIENT_EVENTS.END_TURN, async (payload: EndTurnPayload) => {
        if (!socket.currentGameId) return;
        try {
          await GameActionService.endTurn(socket.currentGameId, user.userId, payload.actionId);
          await this.broadcastSnapshot(socket.currentGameId);
        } catch (err) {
          socket.emit(SERVER_EVENTS.ACTION_ERROR, {
            actionId: payload.actionId,
            code: 'END_TURN_ERROR',
            message: (err as Error).message,
          });
        }
      });

      socket.on(CLIENT_EVENTS.REQUEST_SNAPSHOT, async (payload: RequestSnapshotPayload) => {
        try {
          const instance = await GameStateManager.getGame(payload.gameId);
          if (instance) {
            const snapshot = GameStateManager.getSnapshot(instance);
            socket.emit(SERVER_EVENTS.GAME_STATE_SNAPSHOT, {
              version: snapshot.version,
              snapshot,
            });
          }
        } catch (e) {
          console.error('[Socket] Error sending snapshot:', e);
        }
      });

      socket.on('disconnect', async () => {
        if (socket.currentGameId) {
          const instance = await GameStateManager.getGame(socket.currentGameId);
          if (instance && instance.players.has(user.userId)) {
            const player = instance.players.get(user.userId)!;
            player.connected = false;
            instance.version++;
            await this.broadcastSnapshot(socket.currentGameId);
          }
        }
        console.log(`[Socket] User disconnected: ${user.username}`);
      });
    });
  }

  public static async broadcastSnapshot(gameId: string): Promise<void> {
    const instance = await GameStateManager.getGame(gameId);
    if (!instance || !this.io) return;

    const snapshot = GameStateManager.getSnapshot(instance);
    this.io.to(`game_${gameId}`).emit(SERVER_EVENTS.GAME_STATE_SNAPSHOT, {
      version: snapshot.version,
      snapshot,
    });
  }
}
