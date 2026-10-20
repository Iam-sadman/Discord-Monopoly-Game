import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Home, Building2, AlertTriangle, CheckCircle, Hammer, Landmark } from 'lucide-react';
import { useGame } from '../context/GameContext.js';
import {
  getTileByIndex,
  BUILDING_CONFIG,
  BuildingLevel,
} from '@block-party/shared';
import { PropertyEngine } from '../services/propertyUtils.js';
import { getTileVisual } from '../services/tileImagery.js';

export const PropertyModal: React.FC = () => {
  const {
    inspectedProperty,
    setInspectedProperty,
    snapshot,
    myPlayerState,
    buildProperty,
    mortgageProperty,
    unmortgageProperty,
  } = useGame();

  if (!inspectedProperty || !snapshot || !myPlayerState) return null;

  // Derive latest live property from snapshot so upgrades & ownership update instantly!
  const liveProperty =
    snapshot.properties.find((p) => p.boardIndex === inspectedProperty.boardIndex) ||
    inspectedProperty;

  const tile = getTileByIndex(liveProperty.boardIndex);
  const visual = getTileVisual(tile.index);
  const isOwner = liveProperty.ownerUserId === myPlayerState.userId;
  const ownerPlayer = liveProperty.ownerUserId
    ? snapshot.players.find((p) => p.userId === liveProperty.ownerUserId)
    : null;
  const isUpgradable = tile.type === 'PROPERTY';

  // Check complete set
  const allProps = snapshot.properties;
  const isComplete = PropertyEngine.isCategoryComplete(
    tile.categoryId,
    liveProperty.ownerUserId || myPlayerState.userId,
    allProps
  );

  const nextLevel = (liveProperty.buildingLevel + 1) as BuildingLevel;
  const canUpgrade =
    isOwner &&
    isUpgradable &&
    liveProperty.buildingLevel < 4 &&
    !liveProperty.mortgaged;

  let upgradeCost = { baseCost: 0, vat: 0, totalCost: 0 };
  if (canUpgrade) {
    upgradeCost = PropertyEngine.calculateUpgradeCost(liveProperty.buildingLevel, isComplete);
  }

  const hasCashForUpgrade = myPlayerState.cash >= upgradeCost.totalCost;

  const mortgageProceeds = PropertyEngine.calculateMortgageProceeds(tile.price ?? 0);
  const unmortgageCost = PropertyEngine.calculateUnmortgageCost(tile.price ?? 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-md neu-flat rounded-3xl p-6 shadow-2xl relative overflow-hidden"
        >
          {/* Top Landmark Photo Card Banner */}
          <div className="relative h-44 -mx-6 -mt-6 mb-5 overflow-hidden">
            <img
              src={visual.imageUrl}
              alt={tile.name}
              className="w-full h-full object-cover"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

            {/* Category Pill on top left */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span
                className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full text-white shadow-md"
                style={{ backgroundColor: visual.accentColor }}
              >
                {tile.categoryId !== 'NONE' ? tile.categoryId.replace('_', ' ') : tile.type}
              </span>
            </div>

            {/* Close Button on top right */}
            <button
              onClick={() => setInspectedProperty(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 transition shadow"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Landmark Title on bottom of photo */}
            <div className="absolute bottom-3 left-4 right-4">
              <div className="flex items-center gap-2">
                <span className="text-xl drop-shadow">{visual.emoji}</span>
                <h3 className="text-2xl font-black text-white tracking-tight drop-shadow-md">
                  {tile.name}
                </h3>
              </div>
              <p className="text-xs text-slate-300 drop-shadow italic">{visual.tagline}</p>
            </div>
          </div>

          {/* Ownership Status Card */}
          <div className="neu-flat p-3 rounded-2xl mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Ownership:</span>
            {ownerPlayer ? (
              <span
                className={`text-xs font-black px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-sm ${
                  isOwner
                    ? 'bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 neu-inset'
                    : 'bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {isOwner ? '👑 Owned by You' : `👤 Owned by ${ownerPlayer.username}`}
              </span>
            ) : (
              <span className="text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-xl border border-sky-500/20">
                🏷️ Unowned (Price: {tile.price}c)
              </span>
            )}
          </div>

          {/* Pricing & Rent Breakdown (Neumorphic Inset Card) */}
          <div className="neu-inset rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-500 dark:text-slate-400">Purchase Price:</span>
              <span className="font-bold text-amber-500 dark:text-amber-300 font-mono">
                {tile.price ? `${tile.price} coins` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-500 dark:text-slate-400">Base Rent:</span>
              <span className="font-bold text-slate-700 dark:text-slate-200 font-mono">
                {tile.baseRent ? `${tile.baseRent} coins` : 'N/A'}
              </span>
            </div>

            {/* Complete Set Status */}
            {tile.categoryId !== 'NONE' && (
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-700/20 dark:border-slate-700/40">
                <span className="text-slate-500 dark:text-slate-400">Category Set:</span>
                {isComplete ? (
                  <span className="flex items-center gap-1 font-bold text-emerald-500 dark:text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5" /> Complete (1.25x Rent Bonus)
                  </span>
                ) : (
                  <span className="flex items-center gap-1 font-bold text-amber-500">
                    Incomplete Set
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Building Multipliers Ladder */}
          {isUpgradable && (
            <div className="mb-4">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                Building Level Multipliers (Live: Level {liveProperty.buildingLevel})
              </p>
              <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
                {([0, 1, 2, 3, 4] as BuildingLevel[]).map((lvl) => {
                  const cfg = BUILDING_CONFIG[lvl];
                  const isCurrent = liveProperty.buildingLevel === lvl;
                  const estimatedRent = Math.floor(
                    (tile.baseRent ?? 0) * cfg.multiplier * (isComplete ? 1.25 : 1)
                  );

                  return (
                    <div
                      key={lvl}
                      className={`p-2 rounded-2xl transition-all ${
                        isCurrent
                          ? 'neu-inset text-amber-500 dark:text-amber-400 font-black ring-1 ring-amber-400/50'
                          : 'neu-flat-sm text-slate-500 dark:text-slate-400 font-medium'
                      }`}
                    >
                      <p className="text-[10px] uppercase font-bold">L{lvl}</p>
                      <p className="text-xs font-mono font-bold mt-0.5">{cfg.multiplier}x</p>
                      <p className="text-[9px] opacity-75 font-mono mt-0.5">{estimatedRent}c</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* +25% VAT Surcharge Highlight Banner */}
          {canUpgrade && !isComplete && (
            <div className="neu-flat p-3.5 rounded-2xl mb-4 text-xs border-l-4 border-amber-500">
              <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>+25% Incomplete-Set Construction VAT</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                Upgrading without the full set incurs <strong>25% VAT</strong> (rounded up). Base:{' '}
                {upgradeCost.baseCost}c + VAT: {upgradeCost.vat}c ={' '}
                <strong className="text-amber-500">{upgradeCost.totalCost} coins</strong>.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-700/20 dark:border-slate-700/40">
            {canUpgrade && (
              <button
                onClick={() => buildProperty(liveProperty.propertyId)}
                disabled={!hasCashForUpgrade}
                className="w-full py-3 neu-btn text-emerald-600 dark:text-emerald-400 font-black text-sm rounded-xl transition shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <Hammer className="w-4 h-4" />
                Upgrade to Level {nextLevel} ({upgradeCost.totalCost} coins)
              </button>
            )}

            {liveProperty.buildingLevel === 4 && (
              <div className="w-full py-2.5 neu-inset text-amber-500 dark:text-amber-400 font-black text-xs rounded-xl flex items-center justify-center gap-1.5">
                <Building2 className="w-4 h-4 fill-current text-amber-400" />
                Maximum Upgrade (Hotel) Reached
              </div>
            )}

            {isOwner && (
              <div className="flex gap-2">
                {!liveProperty.mortgaged && liveProperty.buildingLevel === 0 && (
                  <button
                    onClick={() => mortgageProperty(liveProperty.propertyId)}
                    className="flex-1 py-2.5 neu-btn text-rose-500 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Landmark className="w-3.5 h-3.5" /> Mortgage (+{mortgageProceeds}c)
                  </button>
                )}

                {liveProperty.mortgaged && (
                  <button
                    onClick={() => unmortgageProperty(liveProperty.propertyId)}
                    disabled={myPlayerState.cash < unmortgageCost}
                    className="flex-1 py-2.5 neu-btn text-emerald-500 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <Landmark className="w-3.5 h-3.5" /> Unmortgage (-{unmortgageCost}c)
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
