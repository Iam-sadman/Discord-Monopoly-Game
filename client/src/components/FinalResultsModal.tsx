import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, RefreshCw } from 'lucide-react';
import { useGame } from '../context/GameContext.js';
import { PlayerNetWorthBreakdown } from '@block-party/shared';

export const FinalResultsModal: React.FC = () => {
  const { snapshot, userSession, rematchGame, createNewRoom } = useGame();

  const isFinished = snapshot?.status === 'FINISHED';

  useEffect(() => {
    if (isFinished) {
      confetti({
        particleCount: 140,
        spread: 90,
        origin: { y: 0.6 },
      });
    }
  }, [isFinished]);

  if (!isFinished || !snapshot) return null;

  const standings = snapshot.standings || {
    winnerUserId: null,
    rankings: [],
    isTie: false,
  };

  const rankings: PlayerNetWorthBreakdown[] = standings.rankings || [];
  const winner = standings.winnerUserId
    ? snapshot.players.find((p) => p.userId === standings.winnerUserId)
    : null;
  const winnerDisplayName = winner?.username || rankings[0]?.username || 'Winner';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl neu-flat rounded-3xl p-6 md:p-8 shadow-2xl my-auto text-center relative overflow-hidden"
      >
        {/* Trophy & Winner Announcement */}
        <div className="w-16 h-16 rounded-3xl neu-flat text-amber-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Trophy className="w-8 h-8 fill-current" />
        </div>

        <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 tracking-tight mb-2">
          {standings.isTie ? 'Shared Victory! (Tie Game)' : `${winnerDisplayName} Triumphs!`}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mb-6 font-medium">
          30-minute match deadline reached. Final standings calculated by Net Worth.
        </p>

        {/* Standings Table with Full Breakdown */}
        <div className="overflow-x-auto mb-6 rounded-2xl neu-inset p-1">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-700/20 dark:border-slate-700/40">
              <tr>
                <th className="p-3">Rank</th>
                <th className="p-3">Player</th>
                <th className="p-3 text-right">Cash</th>
                <th className="p-3 text-right">Land (100%)</th>
                <th className="p-3 text-right">Buildings (70%)</th>
                <th className="p-3 text-right">Debt</th>
                <th className="p-3 text-right">Net Worth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/10 dark:divide-slate-700/30">
              {rankings.map((r, idx) => {
                const isWinner = r.userId === standings.winnerUserId;
                const isMe = r.userId === userSession?.userId;

                return (
                  <tr
                    key={r.userId}
                    className={`${
                      isWinner
                        ? 'text-amber-600 dark:text-amber-300 font-extrabold'
                        : isMe
                        ? 'text-sky-600 dark:text-sky-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        {idx === 0 ? (
                          <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black text-[10px]">
                            1
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">#{idx + 1}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-bold">
                      {r.username} {isMe && '(You)'}
                    </td>
                    <td className="p-3 text-right font-mono">{r.cash.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono text-emerald-500 dark:text-emerald-400">
                      +{r.landValue.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-500 dark:text-emerald-400">
                      +{r.buildingValue.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-rose-500">
                      -{r.totalDebt.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono font-black text-sm text-amber-500 dark:text-amber-300">
                      {r.netWorth.toLocaleString()}c
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Rematch & New Room Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => rematchGame()}
            className="w-full sm:w-auto px-8 py-3.5 neu-btn text-amber-600 dark:text-amber-300 font-black text-base rounded-2xl shadow-xl transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-5 h-5" /> Play Another Match! (Rematch)
          </button>

          <button
            onClick={() => createNewRoom()}
            className="w-full sm:w-auto px-6 py-3.5 neu-btn text-slate-700 dark:text-slate-200 font-bold text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            Create New Room
          </button>
        </div>
      </motion.div>
    </div>
  );
};
