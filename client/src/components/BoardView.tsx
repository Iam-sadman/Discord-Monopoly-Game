import React from 'react';
import { BOARD_TILES, BoardTile } from '@block-party/shared';
import { useGame } from '../context/GameContext.js';
import { TileView } from './TileView.js';
import { CenterDashboard } from './CenterDashboard.js';

export function getTileGridPosition(index: number): { col: number; row: number } {
  if (index >= 0 && index <= 10) {
    // Bottom edge: index 0 is at (11, 11), index 10 is at (1, 11)
    return { col: 11 - index, row: 11 };
  } else if (index > 10 && index <= 20) {
    // Left edge: index 11 is at (1, 10), index 20 is at (1, 1)
    return { col: 1, row: 11 - (index - 10) };
  } else if (index > 20 && index <= 30) {
    // Top edge: index 21 is at (2, 1), index 30 is at (11, 1)
    return { col: 1 + (index - 20), row: 1 };
  } else {
    // Right edge: index 31 is at (11, 2), index 39 is at (11, 10)
    return { col: 11, row: 1 + (index - 30) };
  }
}

export const BoardView: React.FC = () => {
  const { snapshot, currentPlayer, setInspectedProperty } = useGame();

  if (!snapshot) return null;

  return (
    <div className="w-full max-w-[min(96vw,calc(100vh-85px))] aspect-square mx-auto p-1 md:p-2 flex items-center justify-center transition-all">
      <div className="board-grid w-full h-full neu-flat-lg rounded-2xl md:rounded-3xl p-1.5 md:p-2.5 relative overflow-hidden transition-all duration-300 gap-1 md:gap-1.5">
        {/* Render 40 perimeter photo card tiles */}
        {BOARD_TILES.map((tile: BoardTile) => {
          const { col, row } = getTileGridPosition(tile.index);
          const propState = snapshot.properties.find((p) => p.boardIndex === tile.index);
          const playersOnTile = snapshot.players.filter((p) => p.position === tile.index);
          const isCurrentPlayerTile = currentPlayer?.position === tile.index;

          return (
            <TileView
              key={tile.index}
              tile={tile}
              propertyState={propState}
              playersOnTile={playersOnTile}
              isCurrentPlayerTile={isCurrentPlayerTile}
              onInspect={() => {
                if (propState) setInspectedProperty(propState);
              }}
              col={col}
              row={row}
            />
          );
        })}

        {/* Center Dashboard in 9x9 inner area */}
        <CenterDashboard />
      </div>
    </div>
  );
};
