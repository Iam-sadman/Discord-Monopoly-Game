import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coins,
  Landmark,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  Sun,
  Moon,
  Compass,
  Copy,
  Check,
  StopCircle,
  AlertOctagon,
  X,
} from 'lucide-react';
import { useGame } from '../context/GameContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { BankEngine } from '../services/bankUtils.js';

export const PlayerHUD: React.FC = () => {
  const { userSession, snapshot, myPlayerState, myLoan, setIsBankDrawerOpen, endGame } = useGame();
  const { theme, toggleTheme } = useTheme();
  const [copiedRoom, setCopiedRoom] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  if (!snapshot || !myPlayerState || !userSession) return null;

  // Calculate live interest rate tier
  const now = Date.now();
  const currentInterestRate = snapshot.startedAt
    ? BankEngine.getCurrentRatePerMinute(snapshot.startedAt, now)
    : 0.01;

  const currentRatePercent = Math.round(currentInterestRate * 100);

  // Count owned properties
  const myProperties = snapshot.properties.filter((p) => p.ownerUserId === myPlayerState.userId);
  const mortgagedCount = myProperties.filter((p) => p.mortgaged).length;
  const isHost = snapshot.hostUserId === userSession.userId;

  return (
    <>
      <header className="w-full neu-flat px-4 py-3 sticky top-0 z-30 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* User Identity & Avatar Bubble */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl neu-flat flex items-center justify-center font-black text-amber-500 dark:text-amber-400 light:text-amber-600 text-base shadow-sm">
              {myPlayerState.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-slate-800 dark:text-slate-100">
                  {myPlayerState.username}
                </span>
                {isHost && (
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full neu-inset">
                    Host
                  </span>
                )}
                {myPlayerState.jailed && (
                  <span className="text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 neu-inset">
                    <ShieldAlert className="w-3 h-3" /> In Jail
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {myProperties.length} Properties Owned{' '}
                {mortgagedCount > 0 && `(${mortgagedCount} Mortgaged)`}
              </p>
            </div>
          </div>

          {/* Financial Badges & Action Controls */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Cash Balance Neumorphic Pill */}
            <div className="flex items-center gap-1.5 neu-inset px-3.5 py-1.5 rounded-xl text-amber-600 dark:text-amber-300 font-black text-sm">
              <Coins className="w-4 h-4 text-amber-500" />
              <span>{myPlayerState.cash.toLocaleString()}</span>
              <span className="text-[10px] opacity-75 uppercase">Coins</span>
            </div>

            {/* Active Debt / Bank Button */}
            {myLoan && myLoan.status === 'ACTIVE' ? (
              <button
                onClick={() => setIsBankDrawerOpen(true)}
                className="flex items-center gap-1.5 neu-btn px-3 py-1.5 rounded-xl text-rose-500 dark:text-rose-300 font-bold text-xs cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                <span>Debt: {myLoan.principal + myLoan.accruedInterest}c</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-md font-mono font-bold">
                  {currentRatePercent}%/min
                </span>
              </button>
            ) : (
              <button
                onClick={() => setIsBankDrawerOpen(true)}
                className="flex items-center gap-1.5 neu-btn px-3 py-1.5 rounded-xl text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
              >
                <Landmark className="w-3.5 h-3.5 text-sky-500" />
                <span>Bank & Loans</span>
              </button>
            )}

            {/* Unpaid Bills Alert if any */}
            {myPlayerState.unpaidBills > 0 && (
              <div className="flex items-center gap-1.5 neu-inset px-3 py-1.5 rounded-xl text-red-500 dark:text-red-400 font-bold text-xs">
                <span>Unpaid: {myPlayerState.unpaidBills}c</span>
              </div>
            )}

            {/* Room Code Badge */}
            <button
              onClick={() => {
                const url = new URL(window.location.origin + window.location.pathname);
                url.searchParams.set('gameId', snapshot.gameId);
                navigator.clipboard.writeText(url.toString());
                setCopiedRoom(true);
                setTimeout(() => setCopiedRoom(false), 2000);
              }}
              title="Click to copy Room Link"
              className="flex items-center gap-1.5 neu-inset px-2.5 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 text-xs font-bold hover:text-amber-500 cursor-pointer transition"
            >
              <Compass className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-mono text-[11px]">{snapshot.gameId}</span>
              {copiedRoom ? (
                <Check className="w-3 h-3 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3 text-slate-400" />
              )}
            </button>

            {/* End Match Button */}
            <button
              onClick={() => setShowEndConfirm(true)}
              className="flex items-center gap-1.5 neu-btn px-3 py-1.5 rounded-xl text-rose-500 hover:text-rose-600 dark:text-rose-400 text-xs font-extrabold transition active:neu-inset cursor-pointer"
              title="End match early and view final scoreboard"
            >
              <StopCircle className="w-3.5 h-3.5" />
              <span>End Match</span>
            </button>

            {/* Dark / Light Mode Toggle Button (Neumorphic) */}
            <button
              onClick={toggleTheme}
              className="neu-btn p-2 rounded-xl text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center cursor-pointer"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* End Match Confirmation Modal */}
      <AnimatePresence>
        {showEndConfirm && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              className="w-full max-w-md neu-flat-lg rounded-3xl p-6 text-center relative border border-rose-500/20 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-3 neu-inset">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">
                End Match Early?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Are you sure you want to conclude this match? The current standings, property values, and the final winner will be calculated immediately based on everyone's total Net Worth!
              </p>

              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl neu-btn text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowEndConfirm(false);
                    endGame();
                  }}
                  className="flex-1 py-2.5 rounded-xl neu-btn text-xs font-black text-rose-600 dark:text-rose-400 cursor-pointer active:neu-inset flex items-center justify-center gap-1.5"
                >
                  <StopCircle className="w-4 h-4" />
                  <span>Yes, End Match</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
