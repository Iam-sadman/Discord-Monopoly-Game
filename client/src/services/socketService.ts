import { io, Socket } from 'socket.io-client';
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  GameSnapshot,
  SnapshotEventPayload,
  ActionErrorEventPayload,
} from '@block-party/shared';

let socket: Socket | null = null;

export interface SocketCallbacks {
  onSnapshot: (snapshot: GameSnapshot) => void;
  onError: (error: ActionErrorEventPayload) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function generateActionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function connectSocket(token: string, mockUser?: string, callbacks?: SocketCallbacks): Socket {
  if (socket) {
    socket.disconnect();
  }

  socket = io({
    auth: { token },
    query: mockUser ? { mockUser } : undefined,
    transports: ['websocket', 'polling'],
  });

  if (callbacks) {
    socket.on('connect', () => {
      console.log('[Socket] Connected to server');
      callbacks.onConnect?.();
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected from server');
      callbacks.onDisconnect?.();
    });

    socket.on(SERVER_EVENTS.GAME_STATE_SNAPSHOT, (payload: SnapshotEventPayload) => {
      callbacks.onSnapshot(payload.snapshot);
    });

    socket.on(SERVER_EVENTS.ACTION_ERROR, (error: ActionErrorEventPayload) => {
      console.error('[Socket Action Error]', error);
      callbacks.onError(error);
    });
  }

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function emitJoinGame(gameId: string): void {
  socket?.emit(CLIENT_EVENTS.GAME_JOIN, { gameId });
}

export function emitReady(ready: boolean): void {
  socket?.emit(CLIENT_EVENTS.GAME_READY, { ready });
}

export function emitStartGame(): void {
  socket?.emit(CLIENT_EVENTS.GAME_START, {});
}

export function emitRollDice(): void {
  socket?.emit(CLIENT_EVENTS.ROLL_DICE, { actionId: generateActionId() });
}

export function emitPayJailFine(): void {
  socket?.emit(CLIENT_EVENTS.PAY_JAIL_FINE, { actionId: generateActionId() });
}

export function emitSkipJailTurn(): void {
  socket?.emit(CLIENT_EVENTS.SKIP_JAIL_TURN, { actionId: generateActionId() });
}

export function emitBuyProperty(propertyId: number): void {
  socket?.emit(CLIENT_EVENTS.BUY_PROPERTY, { propertyId, actionId: generateActionId() });
}

export function emitDeclineProperty(propertyId: number): void {
  socket?.emit(CLIENT_EVENTS.DECLINE_PROPERTY, { propertyId, actionId: generateActionId() });
}

export function emitBuildProperty(propertyId: number): void {
  socket?.emit(CLIENT_EVENTS.BUILD_PROPERTY, { propertyId, actionId: generateActionId() });
}

export function emitTakeLoan(amount: number): void {
  socket?.emit(CLIENT_EVENTS.TAKE_LOAN, { amount, actionId: generateActionId() });
}

export function emitRepayLoan(amount: number): void {
  socket?.emit(CLIENT_EVENTS.REPAY_LOAN, { amount, actionId: generateActionId() });
}

export function emitMortgageProperty(propertyId: number): void {
  socket?.emit(CLIENT_EVENTS.MORTGAGE_PROPERTY, { propertyId, actionId: generateActionId() });
}

export function emitUnmortgageProperty(propertyId: number): void {
  socket?.emit(CLIENT_EVENTS.UNMORTGAGE_PROPERTY, { propertyId, actionId: generateActionId() });
}

export function emitPlaceBid(auctionId: string, amount: number): void {
  socket?.emit(CLIENT_EVENTS.PLACE_BID, { auctionId, amount, actionId: generateActionId() });
}

export function emitEndTurn(): void {
  socket?.emit(CLIENT_EVENTS.END_TURN, { actionId: generateActionId() });
}

export function emitRequestSnapshot(gameId: string): void {
  socket?.emit(CLIENT_EVENTS.REQUEST_SNAPSHOT, { gameId });
}

export function emitRematchGame(): void {
  socket?.emit(CLIENT_EVENTS.GAME_REMATCH);
}

export function emitEndGame(): void {
  socket?.emit(CLIENT_EVENTS.GAME_END);
}
