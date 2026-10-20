import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Dices,
  Clock,
  Hourglass,
  ShoppingBag,
  ChevronRight,
  ShieldAlert,
  Flame,
  Hammer,
  CheckCircle,
} from 'lucide-react';
import { useGame } from '../context/GameContext.js';
import { getTileByIndex } from '@block-party/shared';
import { getTileVisual } from '../services/tileImagery.js';

export const CenterDashboard: React.FC = () => {
  const {
    snapshot,
    myPlayerState,
    currentPlayer,
    isMyTurn,
    rollDice,
    payJailFine,
    skipJailTurn,
    buyProperty,
    declineProperty,
    endTurn,
    setInspectedProperty,
    setIsBankDrawerOpen,
  } = useGame();

  const [matchTimeLeft, setMatchTimeLeft] = useState<string>('30:00');
  const [turnSecondsLeft, setTurnSecondsLeft] = useState<number>(25);

  // Match countdown calculation
  useEffect(() => {
    if (!snapshot?.endsAt) return;
    const interval = setInterval(() => {
      const remainingMs = Math.max(0, snapshot.endsAt! - Date.now());
      const totalSec = Math.floor(remainingMs / 1000);
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      setMatchTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [snapshot?.endsAt]);

  // Turn decision timer countdown
  useEffect(() => {
    if (!snapshot?.turnDeadline) {
      setTurnSecondsLeft(25);
      return;
    }
    const interval = setInterval(() => {
      const remainingMs = Math.max(0, snapshot.turnDeadline! - Date.now());
      const sec = Math.ceil(remainingMs / 1000);
      setTurnSecondsLeft(sec);
    }, 200);
    return () => clearInterval(interval);
  }, [snapshot?.turnDeadline]);

  if (!snapshot || !currentPlayer) return null;

  const currentTile = getTileByIndex(currentPlayer.position);
  const currentPropertyState = snapshot.properties.find(
    (p) => p.boardIndex === currentPlayer.position
  );
  const currentVisual = getTileVisual(currentPlayer.position);

  const isBuyableTile =
    (currentTile.type === 'PROPERTY' ||
      currentTile.type === 'TRANSIT' ||
      currentTile.type === 'UTILITY') &&
    currentPropertyState &&
    !currentPropertyState.ownerUserId;

  const isMyProperty = Boolean(
    currentPropertyState &&
      myPlayerState &&
      currentPropertyState.ownerUserId === myPlayerState.userId
  );

  const isOtherPlayerProperty = Boolean(
    currentPropertyState &&
      myPlayerState &&
      currentPropertyState.ownerUserId &&
      currentPropertyState.ownerUserId !== myPlayerState.userId
  );

  const turnProgressPercent = snapshot.turnDeadline
    ? Math.min(100, Math.max(0, (turnSecondsLeft / 25) * 100))
    : 100;

  return (
    <div
      style={{
        gridColumn: '2 / 11',
        gridRow: '2 / 11',
      }}
      className="p-3 md:p-6 flex flex-col justify-between rounded-3xl neu-inset m-1 relative overflow-hidden transition-all duration-300"
    >
      {/* Top Bar: Match Timer & 25s Decision Timer */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-700/20 dark:border-slate-700/40">
        {/* Match Timer Pill */}
        <div className="flex items-center gap-1.5 text-xs font-mono neu-flat-sm px-3 py-1.5 rounded-xl font-bold text-slate-700 dark:text-slate-300">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>Match: {matchTimeLeft}</span>
        </div>

        {/* Turn Phase Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {isMyTurn ? (
              <span className="text-amber-500 dark:text-amber-400 font-black flex items-center gap-1 animate-pulse">
                <Flame className="w-3.5 h-3.5 fill-current" /> YOUR TURN
              </span>
            ) : (
              <span>Turn: {currentPlayer.username}</span>
            )}
          </span>

          {/* 25s Turn & Roll Timer Badge */}
          {snapshot.turnDeadline && (
            <div
              className={`flex items-center gap-1.5 neu-flat-sm px-2.5 py-1 rounded-xl transition-all ${
                turnSecondsLeft <= 7
                  ? 'text-rose-500 font-black animate-pulse'
                  : 'text-sky-500 font-bold'
              }`}
            >
              <Hourglass className="w-3 h-3 animate-spin" />
              <span className="text-xs">
                {turnSecondsLeft}s
                {snapshot.turnPhase === 'WAITING_ROLL' ? ' (Roll or -10c)' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Decision / Roll Timer Progress Bar */}
      {snapshot.turnDeadline && (
        <div className="w-full neu-inset h-2 rounded-full overflow-hidden my-2">
          <motion.div
            className={`h-full ${
              turnSecondsLeft <= 7
                ? 'bg-rose-500'
                : 'bg-gradient-to-r from-amber-400 via-orange-400 to-sky-400'
            }`}
            style={{ width: `${turnProgressPercent}%` }}
            transition={{ ease: 'linear' }}
          />
        </div>
      )}

      {/* Center Action & Dice Area */}
      <div className="flex-1 flex flex-col items-center justify-center my-auto py-2">
        {/* Tactile Neumorphic 3D Dice Display */}
        {snapshot.lastDice && (
          <motion.div
            key={snapshot.version}
            initial={{ scale: 0.6, rotate: -25 }}
            animate={{ scale: 1, rotate: 0 }}
            className="flex items-center gap-3.5 mb-3"
          >
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl neu-flat flex items-center justify-center text-2xl md:text-3xl font-black text-amber-500 dark:text-amber-300 light:text-amber-600 shadow-md">
              {snapshot.lastDice[0]}
            </div>
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl neu-flat flex items-center justify-center text-2xl md:text-3xl font-black text-amber-500 dark:text-amber-300 light:text-amber-600 shadow-md">
              {snapshot.lastDice[1]}
            </div>
          </motion.div>
        )}

        {/* Action Controls for Active Player */}
        {isMyTurn && (
          <div className="w-full max-w-md flex flex-col items-center gap-2.5">
            {/* Jailed Controls */}
            {myPlayerState?.jailed && snapshot.turnPhase === 'WAITING_ROLL' && (
              <div className="w-full neu-flat p-4 rounded-2xl text-center border-l-4 border-rose-500">
                <p className="text-xs text-rose-500 dark:text-rose-400 font-bold mb-2 flex items-center justify-center gap-1">
                  <ShieldAlert className="w-4 h-4" /> You are in Jail!
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={payJailFine}
                    disabled={myPlayerState.cash < 100}
                    className="px-4 py-2 neu-btn bg-rose-500/20 text-rose-500 font-bold text-xs rounded-xl"
                  >
                    Pay 100c Fine
                  </button>
                  <button
                    onClick={skipJailTurn}
                    className="px-4 py-2 neu-btn text-slate-700 dark:text-slate-300 text-xs rounded-xl font-bold"
                  >
                    Skip Turn
                  </button>
                </div>
              </div>
            )}

            {/* Roll Dice Button (Tactile Convex Button) */}
            {!myPlayerState?.jailed && snapshot.turnPhase === 'WAITING_ROLL' && (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={rollDice}
                className="px-8 py-3.5 neu-btn rounded-2xl text-amber-600 dark:text-amber-300 font-black text-lg flex items-center gap-2.5 cursor-pointer shadow-lg"
              >
                <Dices className="w-6 h-6 text-amber-500" />
                ROLL DICE!
              </motion.button>
            )}

            {/* Decision Phase Controls */}
            {snapshot.turnPhase === 'DECISION' && (
              <div className="w-full flex flex-col items-center gap-2">
                {/* Buy Property Banner if on buyable tile */}
                {isBuyableTile && currentPropertyState && (
                  <div className="w-full neu-flat p-3 rounded-2xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={currentVisual.imageUrl}
                        alt={currentTile.name}
                        className="w-10 h-10 rounded-xl object-cover shadow-sm"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {currentTile.name}
                        </p>
                        <p className="text-xs text-amber-500 font-mono font-bold">
                          Price: {currentTile.price}c
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => buyProperty(currentPropertyState.propertyId)}
                        disabled={(myPlayerState?.cash ?? 0) < (currentTile.price ?? 0)}
                        className="px-3.5 py-2 neu-btn text-emerald-600 dark:text-emerald-400 font-black text-xs rounded-xl disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" /> Buy
                      </button>
                      <button
                        onClick={() => declineProperty(currentPropertyState.propertyId)}
                        className="px-3 py-2 neu-btn text-slate-600 dark:text-slate-400 font-bold text-xs rounded-xl cursor-pointer"
                      >
                        Decline (Auction)
                      </button>
                    </div>
                  </div>
                )}

                {/* Owned by Current Player Banner */}
                {isMyProperty && currentPropertyState && (
                  <div className="w-full neu-flat p-3 rounded-2xl flex items-center justify-between gap-2 border-l-4 border-amber-500 shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={currentVisual.imageUrl}
                        alt={currentTile.name}
                        className="w-10 h-10 rounded-xl object-cover shadow-sm ring-1 ring-amber-400"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-amber-500 flex items-center gap-1">
                            👑 Owned by You!
                          </span>
                          <span className="text-[10px] bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.2 rounded neu-inset">
                            Level {currentPropertyState.buildingLevel}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {currentTile.name}
                        </p>
                      </div>
                    </div>
                    {currentTile.type === 'PROPERTY' && currentPropertyState.buildingLevel < 4 && !currentPropertyState.mortgaged && (
                      <button
                        onClick={() => setInspectedProperty(currentPropertyState)}
                        className="px-3 py-2 neu-btn text-emerald-600 dark:text-emerald-400 font-black text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                      >
                        <Hammer className="w-3.5 h-3.5" /> Upgrade
                      </button>
                    )}
                  </div>
                )}

                {/* Owned by Opponent Banner */}
                {isOtherPlayerProperty && currentPropertyState && (
                  <div className="w-full neu-flat p-3 rounded-2xl flex items-center justify-between gap-2 border-l-4 border-rose-500 shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={currentVisual.imageUrl}
                        alt={currentTile.name}
                        className="w-10 h-10 rounded-xl object-cover shadow-sm ring-1 ring-rose-400"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {currentTile.name}
                        </p>
                        <p className="text-xs text-rose-500 font-bold flex items-center gap-1">
                          👤 Owned by {snapshot.players.find((p) => p.userId === currentPropertyState.ownerUserId)?.username || 'Opponent'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-xl">
                      Rent Applied
                    </span>
                  </div>
                )}

                {/* Turn Controls */}
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => {
                      if (currentPropertyState) {
                        setInspectedProperty(currentPropertyState);
                      }
                    }}
                    className="px-3.5 py-2 neu-btn text-slate-700 dark:text-slate-300 text-xs rounded-xl font-bold cursor-pointer"
                  >
                    Inspect Tile
                  </button>

                  <button
                    onClick={() => setIsBankDrawerOpen(true)}
                    className="px-3.5 py-2 neu-btn text-sky-500 dark:text-sky-400 text-xs rounded-xl font-bold cursor-pointer"
                  >
                    Bank & Loans
                  </button>

                  <button
                    onClick={endTurn}
                    className="px-6 py-2.5 neu-btn text-blue-600 dark:text-blue-400 font-black text-sm rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    End Turn <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message for non-active players */}
        {!isMyTurn && (
          <div className="text-center text-xs text-slate-500 dark:text-slate-400">
            Waiting for{' '}
            <strong className="text-slate-700 dark:text-slate-200">{currentPlayer.username}</strong>{' '}
            to take action...
          </div>
        )}
      </div>

      {/* Live Action Notification Banner */}
      <div className="neu-flat-sm p-2.5 rounded-2xl text-center">
        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate">
          {snapshot.lastActionMessage || 'Block Party in progress.'}
        </p>
      </div>
    </div>
  );
};
