import React from 'react';
import { useGame } from './context/GameContext.js';
import { LobbyScreen } from './components/LobbyScreen.js';
import { BoardView } from './components/BoardView.js';
import { PlayerHUD } from './components/PlayerHUD.js';
import { PropertyModal } from './components/PropertyModal.js';
import { AuctionOverlay } from './components/AuctionOverlay.js';
import { BankDrawer } from './components/BankDrawer.js';
import { FinalResultsModal } from './components/FinalResultsModal.js';
import { EventCardModal } from './components/EventCardModal.js';
import { AlertCircle, X } from 'lucide-react';

export const App: React.FC = () => {
  const { snapshot, isLoading, errorMessage, clearError } = useGame();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-14 h-14 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-black text-amber-400 tracking-tight">BLOCK PARTY! 🎲</h2>
        <p className="text-sm text-slate-400 mt-1">Connecting to party session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-x-hidden">
      {/* Toast Error Alert */}
      {errorMessage && (
        <div className="fixed top-4 right-4 z-50 bg-rose-500/90 text-slate-950 font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 backdrop-blur-md max-w-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-xs flex-1">{errorMessage}</span>
          <button onClick={clearError} className="p-1 rounded-full hover:bg-black/10">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* View Switcher: Lobby vs Active Board */}
      {!snapshot || snapshot.status === 'LOBBY' ? (
        <LobbyScreen />
      ) : (
        <div className="flex-1 flex flex-col">
          <PlayerHUD />
          <main className="flex-1 flex items-center justify-center p-2 md:p-4">
            <BoardView />
          </main>
          {/* Overlays & Drawers */}
          <PropertyModal />
          <AuctionOverlay />
          <BankDrawer />
          <EventCardModal />
          <FinalResultsModal />
        </div>
      )}
    </div>
  );
};
