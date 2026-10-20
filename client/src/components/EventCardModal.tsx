import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Sparkles, AlertTriangle, ArrowRight, Dices, Gift } from 'lucide-react';
import { useGame } from '../context/GameContext.js';

export const EventCardModal: React.FC = () => {
  const { snapshot, myPlayerState } = useGame();
  const [dismissedCardId, setDismissedCardId] = useState<string | null>(null);

  const activeCard = snapshot?.activeEventCard;
  const isVisible = Boolean(activeCard && dismissedCardId !== activeCard.cardId);

  useEffect(() => {
    if (activeCard && dismissedCardId !== activeCard.cardId) {
      if (activeCard.type === 'REWARD' || (activeCard.cashDelta && activeCard.cashDelta > 0)) {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    }
  }, [activeCard?.cardId, dismissedCardId]);

  if (!isVisible || !activeCard) return null;

  const isReward = activeCard.type === 'REWARD' || (activeCard.cashDelta && activeCard.cashDelta > 0);
  const isPenalty = activeCard.type === 'PENALTY' || (activeCard.cashDelta && activeCard.cashDelta < 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.7, rotate: -6 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.8, rotate: 6 }}
          transition={{ type: 'spring', damping: 20, stiffness: 220 }}
          className={`w-full max-w-sm neu-flat rounded-3xl p-6 shadow-2xl relative overflow-hidden border-2 ${
            isReward
              ? 'border-amber-400/60 shadow-amber-500/20'
              : isPenalty
              ? 'border-rose-500/60 shadow-rose-500/20'
              : 'border-sky-400/60 shadow-sky-500/20'
          }`}
        >
          {/* Top Badge */}
          <div className="flex items-center justify-between mb-4">
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1 shadow-sm ${
                isReward
                  ? 'bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/40'
                  : isPenalty
                  ? 'bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/40'
                  : 'bg-sky-500/20 text-sky-500 dark:text-sky-400 border border-sky-500/40'
              }`}
            >
              {isReward ? <Sparkles className="w-3 h-3" /> : isPenalty ? <AlertTriangle className="w-3 h-3" /> : <Gift className="w-3 h-3" />}
              {activeCard.type === 'REWARD' ? 'CHANCE REWARD' : activeCard.type === 'PENALTY' ? 'CHANCE PENALTY' : 'EVENT CARD'}
            </span>
            <span className="text-xl">🎲</span>
          </div>

          {/* Card Icon Header */}
          <div
            className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 neu-inset ${
              isReward ? 'text-amber-500' : isPenalty ? 'text-rose-500' : 'text-sky-500'
            }`}
          >
            {isReward ? (
              <Sparkles className="w-8 h-8" />
            ) : isPenalty ? (
              <AlertTriangle className="w-8 h-8" />
            ) : (
              <Gift className="w-8 h-8" />
            )}
          </div>

          {/* Card Title */}
          <h3 className="text-xl font-black text-center text-slate-800 dark:text-slate-100 tracking-tight mb-2">
            {activeCard.title}
          </h3>

          {/* Description */}
          <p className="text-xs text-center text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
            {activeCard.description}
          </p>

          {/* Cash Delta Badge */}
          {activeCard.cashDelta !== undefined && activeCard.cashDelta !== 0 && (
            <div className="neu-inset p-3 rounded-2xl mb-5 text-center">
              <span
                className={`font-mono font-black text-lg ${
                  activeCard.cashDelta > 0
                    ? 'text-emerald-500 dark:text-emerald-400'
                    : 'text-rose-500 dark:text-rose-400'
                }`}
              >
                {activeCard.cashDelta > 0 ? `+${activeCard.cashDelta} Coins` : `${activeCard.cashDelta} Coins`}
              </span>
            </div>
          )}

          {/* Dismiss Button */}
          <button
            onClick={() => setDismissedCardId(activeCard.cardId)}
            className={`w-full py-3.5 neu-btn font-black text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg transition ${
              isReward
                ? 'text-amber-600 dark:text-amber-400'
                : isPenalty
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-sky-600 dark:text-sky-400'
            }`}
          >
            Continue Playing <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
