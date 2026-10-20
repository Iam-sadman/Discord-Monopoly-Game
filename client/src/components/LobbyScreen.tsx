import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Crown,
  CheckCircle2,
  Circle,
  Play,
  Copy,
  Sun,
  Moon,
  PlusCircle,
  LogIn,
  Compass,
  Check,
  Share2,
  Dice5,
  Sparkles,
  X,
} from 'lucide-react';
import { useGame } from '../context/GameContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { GAME_RULES } from '@block-party/shared';

const SUGGESTED_ROOMS = [
  'dhaka-arena',
  'padma-clash',
  'coxs-bazaar',
  'sylhet-thunder',
  'bogura-curd',
  'sundarban-wild',
  'chattogram-port',
  'rajshahi-mango',
];

export const LobbyScreen: React.FC = () => {
  const {
    userSession,
    snapshot,
    gameId,
    isConnected,
    setReady,
    startGame,
    switchMockUser,
    createNewRoom,
    joinRoom,
  } = useGame();
  const { theme, toggleTheme } = useTheme();

  const [activePanel, setActivePanel] = useState<'none' | 'create' | 'join'>('none');
  const [newRoomInput, setNewRoomInput] = useState('');
  const [joinRoomInput, setJoinRoomInput] = useState('');
  const [copiedType, setCopiedType] = useState<'link' | 'code' | null>(null);

  if (!snapshot || !userSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-lg font-bold text-slate-600 dark:text-slate-300">Entering Block Party Lobby...</p>
      </div>
    );
  }

  const isHost = snapshot.hostUserId === userSession.userId;
  const myPlayer = snapshot.players.find((p) => p.userId === userSession.userId);
  const canStart = isHost && snapshot.players.length >= GAME_RULES.MIN_PLAYERS;

  const mockUsers = [
    { id: 'user1', name: 'Shakib (Dhaka)' },
    { id: 'user2', name: 'Tamim (Chattogram)' },
    { id: 'user3', name: 'Mushfiq (Bogura)' },
    { id: 'user4', name: 'Mahmudullah (Mymensingh)' },
  ];

  const currentMockId = new URLSearchParams(window.location.search).get('mockUser') || 'user1';

  const handleRandomizeName = () => {
    const picked = SUGGESTED_ROOMS[Math.floor(Math.random() * SUGGESTED_ROOMS.length)];
    const randomSuffix = Math.floor(10 + Math.random() * 90);
    setNewRoomInput(`${picked}-${randomSuffix}`);
  };

  const handleCreateRoom = () => {
    const name = newRoomInput.trim() || `room-${Math.random().toString(36).substring(2, 8)}`;
    createNewRoom(name);
  };

  const handleJoinRoom = () => {
    if (!joinRoomInput.trim()) return;
    joinRoom(joinRoomInput.trim());
  };

  const copyRoomLink = () => {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('gameId', gameId);
    if (userSession.isMock) {
      // In dev mode, provide user2 for quick 2-player testing
      url.searchParams.set('mockUser', 'user2');
    }
    navigator.clipboard.writeText(url.toString());
    setCopiedType('link');
    setTimeout(() => setCopiedType(null), 2500);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(gameId);
    setCopiedType('code');
    setTimeout(() => setCopiedType(null), 2500);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 transition-colors">
      {/* Top Controls: Dev Switcher & Theme Toggle */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-6 gap-3">
        {userSession.isMock ? (
          <div className="neu-flat p-3 rounded-2xl flex-1 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-500 bg-amber-500/20 px-2.5 py-0.5 rounded-full mr-2">
                Dev Mode
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-300">
                Playing as: <strong className="text-amber-500 dark:text-amber-400">{userSession.username}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 hidden sm:inline">Switch Tab:</span>
              {mockUsers.map((mu) => (
                <button
                  key={mu.id}
                  onClick={() => switchMockUser(mu.id)}
                  className={`text-xs px-2.5 py-1 rounded-xl font-bold transition-all ${
                    currentMockId === mu.id
                      ? 'neu-inset text-amber-500 font-black'
                      : 'neu-btn text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {mu.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="neu-btn p-3 rounded-2xl flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer shrink-0"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-indigo-600" />
          )}
        </button>
      </div>

      {/* Main Neumorphic Lobby Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl neu-flat-lg rounded-3xl p-6 md:p-8 relative overflow-hidden transition-all"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            animate={{ rotate: [-0.5, 0.5, -0.5] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            className="inline-block"
          >
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-emerald-500 to-sky-500 tracking-tight drop-shadow-sm">
              BLOCK PARTY! 🎲
            </h1>
          </motion.div>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-semibold text-sm">
            Bangladesh Strategy Board Game for Discord
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {isConnected ? 'Connected to Room' : 'Connecting to Server...'}
            </span>
          </div>
        </div>

        {/* Room Management & Custom Room Bar */}
        <div className="mb-8 neu-inset p-4 md:p-5 rounded-2xl flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl neu-flat flex items-center justify-center text-amber-500 shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Active Room Code
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-amber-500 dark:text-amber-400 font-mono tracking-wide">
                    {gameId}
                  </span>
                  <button
                    onClick={copyRoomCode}
                    title="Copy Room Code"
                    className="neu-btn p-1.5 rounded-lg text-slate-500 hover:text-amber-500 cursor-pointer"
                  >
                    {copiedType === 'code' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <button
                onClick={copyRoomLink}
                className="neu-btn text-xs px-3.5 py-2 rounded-xl font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
              >
                {copiedType === 'link' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Share2 className="w-3.5 h-3.5 text-sky-500" />
                )}
                <span>{copiedType === 'link' ? 'Link Copied!' : 'Copy Invite Link'}</span>
              </button>

              <button
                onClick={() => {
                  if (activePanel !== 'create' && !newRoomInput) {
                    handleRandomizeName();
                  }
                  setActivePanel(activePanel === 'create' ? 'none' : 'create');
                }}
                className={`neu-btn text-xs px-3.5 py-2 rounded-xl font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                  activePanel === 'create'
                    ? 'neu-inset text-amber-500'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create New Room</span>
              </button>

              <button
                onClick={() => setActivePanel(activePanel === 'join' ? 'none' : 'join')}
                className={`neu-btn text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  activePanel === 'join'
                    ? 'neu-inset text-indigo-500'
                    : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                <LogIn className="w-3.5 h-3.5 text-indigo-500" />
                <span>Join Code</span>
              </button>
            </div>
          </div>

          {/* Expandable: Create New Room Form */}
          <AnimatePresence>
            {activePanel === 'create' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pt-3 border-t border-slate-700/20 dark:border-slate-700/40"
              >
                <div className="neu-flat p-4 rounded-2xl flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" /> Create a New Match Room (2–6 Players)
                    </h3>
                    <button
                      onClick={() => setActivePanel('none')}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400">
                    Each room is completely isolated. Multiple 6-player teams can play at the same time in separate rooms!
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <div className="relative flex-1 w-full">
                      <input
                        type="text"
                        value={newRoomInput}
                        onChange={(e) => setNewRoomInput(e.target.value)}
                        placeholder="e.g. padma-clash or dhaka-arena"
                        className="w-full neu-inset px-4 py-2.5 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
                      />
                    </div>
                    <button
                      onClick={handleRandomizeName}
                      title="Pick random Bangladesh landmark name"
                      className="neu-btn px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Dice5 className="w-4 h-4 text-amber-500" />
                      <span>Random Name</span>
                    </button>
                    <button
                      onClick={handleCreateRoom}
                      className="neu-btn px-5 py-2.5 rounded-xl text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1.5 cursor-pointer shadow-md shrink-0 active:neu-inset"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Launch Room</span>
                    </button>
                  </div>

                  {/* Quick suggested names */}
                  <div className="flex items-center flex-wrap gap-1.5 mt-1">
                    <span className="text-[11px] font-bold text-slate-500 mr-1">Suggestions:</span>
                    {SUGGESTED_ROOMS.map((name) => (
                      <button
                        key={name}
                        onClick={() => setNewRoomInput(name)}
                        className="text-[11px] neu-btn px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:text-amber-500 cursor-pointer"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Expandable: Join Another Room Form */}
            {activePanel === 'join' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pt-3 border-t border-slate-700/20 dark:border-slate-700/40"
              >
                <div className="neu-flat p-4 rounded-2xl flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                      <LogIn className="w-4 h-4" /> Join Existing Room
                    </h3>
                    <button
                      onClick={() => setActivePanel('none')}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400">
                    Enter the Room Code shared by your party host.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="text"
                      value={joinRoomInput}
                      onChange={(e) => setJoinRoomInput(e.target.value)}
                      placeholder="e.g. dhaka-arena or room-abc123"
                      className="w-full flex-1 neu-inset px-4 py-2.5 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none"
                      onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                    />
                    <button
                      onClick={handleJoinRoom}
                      disabled={!joinRoomInput.trim()}
                      className={`neu-btn px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shrink-0 ${
                        joinRoomInput.trim()
                          ? 'text-indigo-600 dark:text-indigo-400 cursor-pointer active:neu-inset'
                          : 'text-slate-400 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Enter Room</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Player Slots Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm md:text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              Players in Room ({snapshot.players.length} / {GAME_RULES.MAX_PLAYERS})
            </h2>
            <span className="text-xs text-slate-500 font-semibold">
              Min {GAME_RULES.MIN_PLAYERS} to launch
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {snapshot.players.map((player, idx) => {
              const isCurrentMe = player.userId === userSession.userId;
              const isPlayerHost = player.userId === snapshot.hostUserId;

              return (
                <div
                  key={player.userId}
                  className={`p-4 rounded-2xl transition-all ${
                    isCurrentMe ? 'neu-inset' : 'neu-flat-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl neu-flat flex items-center justify-center font-black text-amber-500 dark:text-amber-400 text-sm">
                        {player.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate max-w-[100px]">
                            {player.username}
                          </p>
                          {isPlayerHost && (
                            <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {isCurrentMe ? 'You' : `Player #${idx + 1}`}
                        </p>
                      </div>
                    </div>

                    <div>
                      {player.ready ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 neu-inset px-2.5 py-1 rounded-xl">
                          <CheckCircle2 className="w-3 h-3" /> Ready
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 neu-inset px-2.5 py-1 rounded-xl">
                          <Circle className="w-3 h-3" /> Waiting
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Empty Slots */}
            {Array.from({ length: GAME_RULES.MAX_PLAYERS - snapshot.players.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="p-4 rounded-2xl border border-dashed border-slate-400/30 dark:border-slate-700/40 flex items-center justify-center text-xs text-slate-400 font-medium"
              >
                Waiting for player...
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-700/20 dark:border-slate-700/40">
          {myPlayer && (
            <button
              onClick={() => setReady(!myPlayer.ready)}
              className={`w-full sm:w-auto px-6 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                myPlayer.ready
                  ? 'neu-inset text-slate-600 dark:text-slate-400'
                  : 'neu-btn text-emerald-600 dark:text-emerald-400 font-black'
              }`}
            >
              {myPlayer.ready ? (
                <>
                  <Circle className="w-4 h-4" /> Cancel Ready
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> I'm Ready!
                </>
              )}
            </button>
          )}

          {isHost ? (
            <button
              onClick={startGame}
              disabled={!canStart}
              className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2.5 shadow-md ${
                canStart
                  ? 'neu-btn text-amber-600 dark:text-amber-300 cursor-pointer active:neu-inset'
                  : 'neu-flat-sm text-slate-400 cursor-not-allowed opacity-50'
              }`}
            >
              <Play className="w-5 h-5 fill-current" />
              Start Match (2–6 Players)
            </button>
          ) : (
            <div className="text-xs text-slate-500 dark:text-slate-400 italic">
              Waiting for party host to launch match...
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
