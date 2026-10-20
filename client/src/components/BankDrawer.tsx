import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Landmark,
  Coins,
  AlertTriangle,
} from 'lucide-react';
import { useGame } from '../context/GameContext.js';
import { getTileByIndex } from '@block-party/shared';
import { PropertyEngine } from '../services/propertyUtils.js';
import { BankEngine } from '../services/bankUtils.js';
import { getTileVisual } from '../services/tileImagery.js';

export const BankDrawer: React.FC = () => {
  const {
    isBankDrawerOpen,
    setIsBankDrawerOpen,
    snapshot,
    myPlayerState,
    myLoan,
    takeLoan,
    repayLoan,
    mortgageProperty,
    unmortgageProperty,
  } = useGame();

  if (!isBankDrawerOpen || !snapshot || !myPlayerState) return null;

  const now = Date.now();
  const currentInterestRate = snapshot.startedAt
    ? BankEngine.getCurrentRatePerMinute(snapshot.startedAt, now)
    : 0.01;
  const currentRatePercent = Math.round(currentInterestRate * 100);

  const myProperties = snapshot.properties.filter(
    (p) => p.ownerUserId === myPlayerState.userId
  );

  const hasActiveLoan = Boolean(myLoan && myLoan.status === 'ACTIVE');
  const totalDebt = hasActiveLoan ? myLoan!.principal + myLoan!.accruedInterest : 0;

  const handleTakeLoan = (amount: number) => {
    takeLoan(amount);
  };

  const handleRepay = (amount: number) => {
    if (amount > 0 && myPlayerState.cash >= amount) {
      repayLoan(amount);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/75 backdrop-blur-sm pointer-events-auto">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-md neu-flat h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto"
        >
          {/* Header */}
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/20 dark:border-slate-700/40 mb-6">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-sky-500" />
                <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">National Bank of Bangladesh</h2>
              </div>
              <button
                onClick={() => setIsBankDrawerOpen(false)}
                className="neu-btn p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cash & Loan Summary Card */}
            <div className="neu-inset rounded-2xl p-4 mb-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-500 dark:text-slate-400">Available Cash:</span>
                <span className="font-bold text-amber-500 dark:text-amber-300 font-mono text-base">
                  {myPlayerState.cash.toLocaleString()} coins
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Active Bank Debt:</span>
                <span
                  className={`font-bold font-mono text-base ${
                    hasActiveLoan ? 'text-rose-500' : 'text-slate-400'
                  }`}
                >
                  {totalDebt > 0 ? `${totalDebt} coins` : '0 coins'}
                </span>
              </div>
            </div>

            {/* Bank Loans Section */}
            <div className="mb-6">
              <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>Bank Loan System</span>
                <span className="text-xs text-sky-500 neu-flat-sm px-2 py-0.5 rounded-md font-mono font-bold">
                  Tier: {currentRatePercent}%/min
                </span>
              </h3>

              {hasActiveLoan ? (
                /* Repay Active Loan Form */
                <div className="neu-flat p-4 rounded-2xl">
                  <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    <span>Principal: {myLoan!.principal}c</span>
                    <span>Interest: {myLoan!.accruedInterest}c</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Repayments apply to interest first, then principal.
                  </p>

                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => handleRepay(Math.min(myPlayerState.cash, totalDebt))}
                      disabled={myPlayerState.cash <= 0}
                      className="flex-1 py-2.5 neu-btn text-emerald-600 dark:text-emerald-400 font-black text-xs rounded-xl shadow cursor-pointer disabled:opacity-40"
                    >
                      Pay Full Debt ({Math.min(myPlayerState.cash, totalDebt)}c)
                    </button>
                    <button
                      onClick={() => handleRepay(Math.min(myPlayerState.cash, 50))}
                      disabled={myPlayerState.cash < 50 || totalDebt < 50}
                      className="py-2.5 px-3.5 neu-btn text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer disabled:opacity-40"
                    >
                      Pay 50c
                    </button>
                  </div>
                </div>
              ) : (
                /* Take Loan Form */
                <div className="neu-flat p-4 rounded-2xl">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                    Borrow up to <strong>300 coins</strong> with time-tiered simple interest (1%
                    min 0-10m, 2% min 10-20m, 3% min 20-30m).
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    {[100, 200, 300].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => handleTakeLoan(amt)}
                        className="py-2.5 neu-btn text-sky-600 dark:text-sky-300 font-black text-xs rounded-xl cursor-pointer"
                      >
                        +{amt} coins
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mortgage / Unmortgage Section */}
            <div>
              <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Mortgage / Unmortgage ({myProperties.length} Properties)
              </h3>

              {myProperties.length === 0 ? (
                <div className="p-4 rounded-2xl border border-dashed border-slate-400/30 text-center text-xs text-slate-400">
                  You do not own any properties yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {myProperties.map((prop) => {
                    const tile = getTileByIndex(prop.boardIndex);
                    const visual = getTileVisual(tile.index);
                    const proceeds = PropertyEngine.calculateMortgageProceeds(tile.price ?? 0);
                    const unmortgageCost = PropertyEngine.calculateUnmortgageCost(tile.price ?? 0);
                    const canMortgage = !prop.mortgaged && prop.buildingLevel === 0;

                    return (
                      <div
                        key={prop.propertyId}
                        className="flex items-center justify-between p-2.5 rounded-xl neu-flat-sm gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={visual.imageUrl}
                            alt={tile.name}
                            className="w-9 h-9 rounded-lg object-cover shadow-sm shrink-0"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                              {tile.name}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {prop.mortgaged ? (
                                <span className="text-rose-500 font-semibold">Mortgaged (0 Rent)</span>
                              ) : (
                                <span>Level {prop.buildingLevel}</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div>
                          {canMortgage && (
                            <button
                              onClick={() => mortgageProperty(prop.propertyId)}
                              className="px-2.5 py-1.5 neu-btn text-rose-500 font-bold text-[11px] rounded-lg cursor-pointer"
                            >
                              Mortgage (+{proceeds}c)
                            </button>
                          )}

                          {prop.mortgaged && (
                            <button
                              onClick={() => unmortgageProperty(prop.propertyId)}
                              disabled={myPlayerState.cash < unmortgageCost}
                              className="px-2.5 py-1.5 neu-btn text-emerald-500 font-bold text-[11px] rounded-lg cursor-pointer disabled:opacity-40"
                            >
                              Unmortgage (-{unmortgageCost}c)
                            </button>
                          )}

                          {!prop.mortgaged && prop.buildingLevel > 0 && (
                            <span className="text-[10px] text-slate-400 italic">Has Buildings</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700/20 dark:border-slate-700/40 text-center">
            <button
              onClick={() => setIsBankDrawerOpen(false)}
              className="w-full py-2.5 neu-btn text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
            >
              Close Bank Drawer
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
