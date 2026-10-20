import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gavel, Clock, User, Plus } from 'lucide-react';
import { useGame } from '../context/GameContext.js';
import { getTileByIndex, GAME_RULES } from '@block-party/shared';
import { getTileVisual } from '../services/tileImagery.js';

export const AuctionOverlay: React.FC = () => {
  const { snapshot, myPlayerState, placeBid } = useGame();
  const [secondsLeft, setSecondsLeft] = useState<number>(10);

  const auction = snapshot?.activeAuction;
  const isAuctionActive = Boolean(auction && auction.status === 'ACTIVE');

  useEffect(() => {
    if (!auction?.endsAt || !isAuctionActive) return;

    const interval = setInterval(() => {
      const remainingMs = Math.max(0, auction.endsAt - Date.now());
      const sec = Math.ceil(remainingMs / 1000);
      setSecondsLeft(sec);
    }, 100);

    return () => clearInterval(interval);
  }, [auction?.endsAt, isAuctionActive]);

  if (!isAuctionActive || !auction || !snapshot || !myPlayerState) return null;

  const tile = getTileByIndex(auction.boardIndex);
  const visual = getTileVisual(tile.index);
  const highestBidder = auction.highestBidderId
    ? snapshot.players.find((p) => p.userId === auction.highestBidderId)
    : null;

  const minBid =
    auction.highestBid > 0
      ? auction.highestBid + GAME_RULES.AUCTION_MIN_INCREMENT
      : auction.startingBid;

  const currentBid = auction.highestBid > 0 ? auction.highestBid : auction.startingBid;
  const progressPercent = Math.min(100, Math.max(0, (secondsLeft / 10) * 100));

  const handleQuickBid = (increment: number) => {
    const targetAmount = (auction.highestBid > 0 ? auction.highestBid : auction.startingBid) + increment;
    if (myPlayerState.cash >= targetAmount) {
      placeBid(auction.id, targetAmount);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-md neu-flat rounded-3xl p-6 shadow-2xl relative overflow-hidden"
        >
          {/* Animated 10s Timer Bar */}
          <div className="w-full neu-inset h-2.5 rounded-full overflow-hidden mb-4">
            <motion.div
              className={`h-full ${
                secondsLeft <= 3 ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-400 to-emerald-400'
              }`}
              style={{ width: `${progressPercent}%` }}
              transition={{ ease: 'linear' }}
            />
          </div>

          {/* Landmark Photo Thumbnail & Title */}
          <div className="flex items-center gap-3 mb-4 p-3 neu-inset rounded-2xl">
            <img
              src={visual.imageUrl}
              alt={tile.name}
              className="w-14 h-14 rounded-xl object-cover shadow-sm shrink-0"
            />
            <div className="text-left flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black uppercase text-amber-500">
                  <Gavel className="w-3.5 h-3.5 inline mr-1" /> 10s Live Auction
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 truncate">
                {tile.name}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Original Price: {tile.price}c | Starting: {auction.startingBid}c
              </p>
            </div>
          </div>

          {/* Current Highest Bid Box */}
          <div className="neu-flat p-4 rounded-2xl text-center mb-5">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">
              Current Highest Bid
            </p>
            <div className="text-3xl font-black text-amber-500 dark:text-amber-300 font-mono">
              {auction.highestBid > 0 ? `${auction.highestBid} coins` : 'Awaiting Opening Bid'}
            </div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {highestBidder ? highestBidder.username : 'No bids placed yet'}
              </span>
            </div>
          </div>

          {/* Quick-Bid Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => placeBid(auction.id, minBid)}
              disabled={myPlayerState.cash < minBid || myPlayerState.userId === auction.highestBidderId}
              className="w-full py-3 neu-btn text-amber-600 dark:text-amber-300 font-black text-sm rounded-xl transition shadow flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              Bid Minimum Required ({minBid} coins)
            </button>

            <div className="grid grid-cols-3 gap-2">
              {[10, 25, 50].map((inc) => {
                const target = currentBid + inc;
                const canAfford = myPlayerState.cash >= target;

                return (
                  <button
                    key={inc}
                    onClick={() => handleQuickBid(inc)}
                    disabled={!canAfford || myPlayerState.userId === auction.highestBidderId}
                    className="py-2.5 neu-btn text-amber-500 font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                  >
                    <Plus className="w-3 h-3" />
                    +{inc} ({target}c)
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-center text-slate-500 mt-4">
            Your cash balance: <strong className="text-amber-500">{myPlayerState.cash} coins</strong>
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
