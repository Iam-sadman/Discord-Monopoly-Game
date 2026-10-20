import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BoardTile,
  GamePropertyState,
  PlayerState,
  BUILDING_CONFIG,
  BuildingLevel,
} from '@block-party/shared';
import { Home, Building2, Zap, Train, ShieldAlert } from 'lucide-react';
import { getTileVisual } from '../services/tileImagery.js';
import { useGame } from '../context/GameContext.js';

interface TileViewProps {
  tile: BoardTile;
  propertyState?: GamePropertyState;
  playersOnTile: PlayerState[];
  isCurrentPlayerTile: boolean;
  onInspect: () => void;
  col: number;
  row: number;
}

const PLAYER_COLORS = [
  'bg-amber-400 text-slate-950 ring-amber-300 shadow-amber-500/50',
  'bg-emerald-400 text-slate-950 ring-emerald-300 shadow-emerald-500/50',
  'bg-sky-400 text-slate-950 ring-sky-300 shadow-sky-500/50',
  'bg-rose-400 text-slate-950 ring-rose-300 shadow-rose-500/50',
  'bg-purple-400 text-slate-950 ring-purple-300 shadow-purple-500/50',
  'bg-orange-400 text-slate-950 ring-orange-300 shadow-orange-500/50',
];

export const TileView: React.FC<TileViewProps> = ({
  tile,
  propertyState,
  playersOnTile,
  isCurrentPlayerTile,
  onInspect,
  col,
  row,
}) => {
  const { userSession, snapshot } = useGame();

  const isCorner = tile.index % 10 === 0;
  const isUpgradable = tile.type === 'PROPERTY';
  const isMortgaged = propertyState?.mortgaged ?? false;
  const buildingLevel = (propertyState?.buildingLevel ?? 0) as BuildingLevel;
  const isOwned = Boolean(propertyState?.ownerUserId);

  const owner = propertyState?.ownerUserId && snapshot
    ? snapshot.players.find((p) => p.userId === propertyState.ownerUserId)
    : null;
  const isMe = Boolean(userSession && propertyState?.ownerUserId === userSession.userId);

  const visual = getTileVisual(tile.index);
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={onInspect}
      style={{
        gridColumn: col,
        gridRow: row,
      }}
      className={`relative p-1 md:p-1.5 flex flex-col justify-between rounded-xl md:rounded-2xl neu-flat cursor-pointer overflow-hidden group select-none transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:neu-inset ${
        isCorner ? 'p-1.5 md:p-2' : ''
      } ${
        isCurrentPlayerTile
          ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-400/40 z-10'
          : isOwned
          ? isMe
            ? 'ring-2 ring-amber-500/90 shadow-md shadow-amber-500/25'
            : 'ring-2 ring-emerald-500/90 shadow-md shadow-emerald-500/25'
          : ''
      }`}
    >
      {/* Category Accent Bar */}
      {tile.categoryColor && tile.categoryId !== 'NONE' && (
        <div
          className="h-1.5 w-full rounded-full mb-1 shrink-0 shadow-sm"
          style={{ backgroundColor: tile.categoryColor }}
        />
      )}

      {/* Miniature Photo Card Container */}
      <div className="relative w-full aspect-[4/3] rounded-lg md:rounded-xl overflow-hidden mb-1 shrink-0 bg-slate-800/80 shadow-inner">
        {!imgError ? (
          <img
            src={visual.imageUrl}
            alt={tile.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-xl"
            style={{ backgroundColor: `${visual.accentColor}25` }}
          >
            <span>{visual.emoji}</span>
          </div>
        )}

        {/* Soft bottom vignette for contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

        {/* Ownership Badge on Photo (Top-Left) */}
        {isOwned && (
          <div className="absolute top-1 left-1 z-10 flex items-center">
            {isMe ? (
              <span className="text-[7px] md:text-[8px] font-black uppercase tracking-tight bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
                👑 YOU
              </span>
            ) : (
              <span className="text-[7px] md:text-[8px] font-black uppercase tracking-tight bg-emerald-600 text-white px-1.5 py-0.5 rounded shadow flex items-center gap-0.5 truncate max-w-[55px]">
                👤 {owner?.username ? owner.username.split(' ')[0] : 'OWNED'}
              </span>
            )}
          </div>
        )}

        {/* Building Level Badge on Photo (Top-Right) */}
        {isUpgradable && buildingLevel > 0 && (
          <div className="absolute top-1 right-1 z-10 flex items-center">
            {buildingLevel < 4 ? (
              <span className="text-[7px] md:text-[8px] font-black bg-emerald-800/95 text-emerald-200 border border-emerald-400/40 px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
                <Home className="w-2.5 h-2.5 fill-current text-emerald-300" />
                L{buildingLevel}
              </span>
            ) : (
              <span className="text-[7px] md:text-[8px] font-black bg-amber-500 text-slate-950 border border-amber-300 px-1.5 py-0.5 rounded shadow flex items-center gap-0.5 animate-pulse">
                <Building2 className="w-2.5 h-2.5 fill-current" />
                HOTEL
              </span>
            )}
          </div>
        )}

        {/* Soft bottom vignette for contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Primary Landmark Title Display */}
      <div className="flex-1 min-h-0 flex items-center justify-center py-0.5 px-0.5">
        <p className="text-[9.5px] sm:text-[11px] md:text-[12.5px] font-black text-slate-900 dark:text-slate-50 text-center leading-[1.15] tracking-tight line-clamp-2 drop-shadow-sm">
          {tile.name}
        </p>
      </div>

      {/* Footer Pill: Price / Rent / Ownership Status */}
      <div className="flex items-center justify-between mt-auto pt-0.5 shrink-0 text-[8.5px] sm:text-[9.5px] md:text-[10px]">
        {isOwned ? (
          <div className="flex items-center gap-0.5 font-black text-emerald-600 dark:text-emerald-400">
            <span className="text-[7.5px] sm:text-[8.5px] uppercase opacity-75">Rent:</span>
            <span className="font-mono font-black">
              {Math.floor(
                (tile.baseRent ?? 0) * (BUILDING_CONFIG[buildingLevel]?.multiplier ?? 1)
              )}c
            </span>
          </div>
        ) : tile.price ? (
          <div className="flex items-center gap-0.5 font-black text-amber-500 dark:text-amber-400">
            <span className="text-[7.5px] sm:text-[8.5px] uppercase opacity-75">Buy:</span>
            <span className="font-mono font-black">{tile.price}c</span>
          </div>
        ) : (
          <span className="font-black text-slate-400 text-[8px] sm:text-[9px] uppercase">{tile.type}</span>
        )}

        {/* Ownership Status Pill */}
        {isOwned ? (
          <span
            className={`text-[7.5px] sm:text-[8.5px] font-black px-1.5 py-0.5 rounded-full ${
              isMe
                ? 'bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {isMe ? 'YOU' : 'OWNED'}
          </span>
        ) : (
          <span className="text-[7.5px] sm:text-[8.5px] text-slate-400 uppercase font-black">FREE</span>
        )}
      </div>

      {/* Mortgaged Ribbon Overlay */}
      {isMortgaged && (
        <div className="absolute inset-0 bg-red-950/85 backdrop-blur-[2px] flex items-center justify-center p-1 z-20">
          <span className="text-[8px] md:text-[10px] font-black uppercase tracking-wider text-red-200 bg-red-800/90 px-1.5 py-0.5 rounded rotate-[-12deg] border border-red-500/50 shadow-md">
            MORTGAGED
          </span>
        </div>
      )}

      {/* Animated Player Tokens */}
      {playersOnTile.length > 0 && (
        <div className="absolute top-1 right-1 flex -space-x-1 z-30">
          {playersOnTile.map((p) => {
            const colorClass = PLAYER_COLORS[p.turnOrder % PLAYER_COLORS.length];
            return (
              <motion.div
                key={p.userId}
                animate={{ y: [-2, 1, -2] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className={`w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center text-[8px] md:text-[9px] font-black ring-1.5 shadow-md ${colorClass}`}
                title={p.username}
              >
                {p.username.charAt(0).toUpperCase()}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
