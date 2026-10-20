import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { GameSnapshot, GamePropertyState, PlayerState, LoanState } from '@block-party/shared';
import { DiscordUserSession, initializeDiscordOrMockAuth } from '../services/discordSdk.js';
import * as socketService from '../services/socketService.js';

interface GameContextValue {
  userSession: DiscordUserSession | null;
  snapshot: GameSnapshot | null;
  isConnected: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  clearError: () => void;
  // Modals & Panels
  inspectedProperty: GamePropertyState | null;
  setInspectedProperty: (prop: GamePropertyState | null) => void;
  isBankDrawerOpen: boolean;
  setIsBankDrawerOpen: (open: boolean) => void;
  gameId: string;
  joinGame: (gameId: string) => void;
  joinRoom: (roomId: string) => void;
  setReady: (ready: boolean) => void;
  startGame: () => void;
  rollDice: () => void;
  payJailFine: () => void;
  skipJailTurn: () => void;
  buyProperty: (propertyId: number) => void;
  declineProperty: (propertyId: number) => void;
  buildProperty: (propertyId: number) => void;
  takeLoan: (amount: number) => void;
  repayLoan: (amount: number) => void;
  mortgageProperty: (propertyId: number) => void;
  unmortgageProperty: (propertyId: number) => void;
  placeBid: (auctionId: string, amount: number) => void;
  endTurn: () => void;
  rematchGame: () => void;
  endGame: () => void;
  createNewRoom: (customRoomId?: string) => void;
  switchMockUser: (mockUser: string) => void;
  currentPlayer: PlayerState | null;
  myPlayerState: PlayerState | null;
  myLoan: LoanState | null;
  isMyTurn: boolean;
}

const GameContext = createContext<GameContextValue | null>(null);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userSession, setUserSession] = useState<DiscordUserSession | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [inspectedProperty, setInspectedProperty] = useState<GamePropertyState | null>(null);
  const [isBankDrawerOpen, setIsBankDrawerOpen] = useState(false);

  const clearError = () => setErrorMessage(null);

  // Initialize auth
  useEffect(() => {
    let isMounted = true;
    initializeDiscordOrMockAuth()
      .then((session) => {
        if (!isMounted) return;
        setUserSession(session);
        setIsLoading(false);

        // Connect socket
        const urlParams = new URLSearchParams(window.location.search);
        const mockUserParam = urlParams.get('mockUser') || undefined;
        const targetGameId = urlParams.get('gameId') || 'default-room';

        socketService.connectSocket(session.token, mockUserParam, {
          onSnapshot: (snap) => {
            setSnapshot(snap);
            setErrorMessage(null);
          },
          onError: (err) => setErrorMessage(err.message),
          onConnect: () => {
            setIsConnected(true);
            socketService.emitJoinGame(targetGameId);
          },
          onDisconnect: () => setIsConnected(false),
        });
      })
      .catch((err) => {
        console.error('[GameContext] Auth init error:', err);
        setIsLoading(false);
        setErrorMessage(err.message);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const switchMockUser = (mockUser: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('mockUser', mockUser);
    window.location.href = url.toString();
  };

  const joinGame = useCallback((gameId: string) => {
    socketService.emitJoinGame(gameId);
  }, []);

  const setReady = useCallback((ready: boolean) => {
    socketService.emitReady(ready);
  }, []);

  const startGame = useCallback(() => {
    socketService.emitStartGame();
  }, []);

  const rollDice = useCallback(() => {
    socketService.emitRollDice();
  }, []);

  const payJailFine = useCallback(() => {
    socketService.emitPayJailFine();
  }, []);

  const skipJailTurn = useCallback(() => {
    socketService.emitSkipJailTurn();
  }, []);

  const buyProperty = useCallback((propertyId: number) => {
    socketService.emitBuyProperty(propertyId);
  }, []);

  const declineProperty = useCallback((propertyId: number) => {
    socketService.emitDeclineProperty(propertyId);
  }, []);

  const buildProperty = useCallback((propertyId: number) => {
    socketService.emitBuildProperty(propertyId);
  }, []);

  const takeLoan = useCallback((amount: number) => {
    socketService.emitTakeLoan(amount);
  }, []);

  const repayLoan = useCallback((amount: number) => {
    socketService.emitRepayLoan(amount);
  }, []);

  const mortgageProperty = useCallback((propertyId: number) => {
    socketService.emitMortgageProperty(propertyId);
  }, []);

  const unmortgageProperty = useCallback((propertyId: number) => {
    socketService.emitUnmortgageProperty(propertyId);
  }, []);

  const placeBid = useCallback((auctionId: string, amount: number) => {
    socketService.emitPlaceBid(auctionId, amount);
  }, []);

  const endTurn = useCallback(() => {
    socketService.emitEndTurn();
  }, []);

  const rematchGame = useCallback(() => {
    socketService.emitRematchGame();
  }, []);

  const endGame = useCallback(() => {
    socketService.emitEndGame();
  }, []);

  const currentGameId =
    snapshot?.gameId ||
    (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('gameId') : null) ||
    'default-room';

  const createNewRoom = useCallback((customRoomId?: string) => {
    const raw = customRoomId?.trim();
    const finalRoomId =
      raw && raw.length > 0
        ? raw.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 32)
        : `room-${Math.random().toString(36).substring(2, 8)}`;
    const url = new URL(window.location.href);
    url.searchParams.set('gameId', finalRoomId);
    window.location.href = url.toString();
  }, []);

  const joinRoom = useCallback((targetRoomId: string) => {
    const raw = targetRoomId.trim();
    if (!raw) return;
    const finalRoomId = raw.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 32);
    const url = new URL(window.location.href);
    url.searchParams.set('gameId', finalRoomId);
    window.location.href = url.toString();
  }, []);

  const currentPlayer = snapshot?.currentPlayerId
    ? snapshot.players.find((p) => p.userId === snapshot.currentPlayerId) ?? null
    : null;

  const myPlayerState = userSession && snapshot
    ? snapshot.players.find((p) => p.userId === userSession.userId) ?? null
    : null;

  const myLoan = userSession && snapshot?.activeLoans
    ? snapshot.activeLoans[userSession.userId] ?? null
    : null;

  const isMyTurn = Boolean(
    userSession && snapshot && snapshot.currentPlayerId === userSession.userId
  );

  return (
    <GameContext.Provider
      value={{
        userSession,
        snapshot,
        gameId: currentGameId,
        isConnected,
        isLoading,
        errorMessage,
        clearError,
        inspectedProperty,
        setInspectedProperty,
        isBankDrawerOpen,
        setIsBankDrawerOpen,
        joinGame,
        joinRoom,
        setReady,
        startGame,
        rollDice,
        payJailFine,
        skipJailTurn,
        buyProperty,
        declineProperty,
        buildProperty,
        takeLoan,
        repayLoan,
        mortgageProperty,
        unmortgageProperty,
        placeBid,
        endTurn,
        rematchGame,
        endGame,
        createNewRoom,
        switchMockUser,
        currentPlayer,
        myPlayerState,
        myLoan,
        isMyTurn,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextValue => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
