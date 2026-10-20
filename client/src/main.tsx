import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import { GameProvider } from './context/GameContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <GameProvider>
        <App />
      </GameProvider>
    </ThemeProvider>
  </React.StrictMode>
);
