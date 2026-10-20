import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { db } from './db/index.js';
import { DiscordAuthService } from './modules/auth/discordAuth.js';
import { GameStateManager } from './modules/game/gameStateManager.js';
import { SocketGateway } from './modules/gateway/socketGateway.js';

dotenv.config();

const PORT = Number(process.env.PORT) || 3001;

async function bootstrap() {
  await db.initialize();

  const app = express();
  app.use(cors({ origin: '*' }));
  app.use(express.json());

  const server = http.createServer(app);

  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  SocketGateway.initialize(io);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'block-party-server',
      timestamp: Date.now(),
    });
  });

  // Discord OAuth2 & Dev Mode Mock Auth
  app.post('/api/auth/discord', async (req, res) => {
    try {
      const { code, mockUser } = req.body;

      // 1. If dev mock user requested or allowed
      if (mockUser || process.env.ALLOW_DEV_AUTH === 'true' || !code) {
        const user = DiscordAuthService.getMockUser(mockUser || 'user1');
        const token = DiscordAuthService.generateToken(user);
        return res.json({ token, user, isMock: true });
      }

      // 2. Real Discord OAuth2 code exchange
      const accessToken = await DiscordAuthService.exchangeCodeForToken(code);
      const user = await DiscordAuthService.fetchDiscordUser(accessToken);
      const token = DiscordAuthService.generateToken(user);

      return res.json({ token, user, isMock: false });
    } catch (err) {
      console.error('[Auth Error]', err);
      return res.status(400).json({ error: (err as Error).message });
    }
  });

  // Create new game lobby
  app.post('/api/game/create', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const mockUser = req.query.mockUser as string;
      let user;

      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        user = DiscordAuthService.verifyToken(token);
      } else if (mockUser || process.env.ALLOW_DEV_AUTH === 'true' || process.env.NODE_ENV !== 'production') {
        user = DiscordAuthService.getMockUser(mockUser || 'user1');
      } else {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const gameId = uuidv4();
      const instance = await GameStateManager.createGame(gameId, user);
      const snapshot = GameStateManager.getSnapshot(instance);

      res.json({ gameId, snapshot });
    } catch (err) {
      console.error('[Create Game Error]', err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Get game snapshot
  app.get('/api/game/:gameId', async (req, res) => {
    try {
      const { gameId } = req.params;
      const instance = await GameStateManager.getGame(gameId);
      if (!instance) {
        return res.status(404).json({ error: 'Game not found' });
      }

      const snapshot = GameStateManager.getSnapshot(instance);
      res.json({ snapshot });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Serve compiled client static assets if available
  const clientDistPath = path.resolve(process.cwd(), 'client/dist');
  if (fs.existsSync(clientDistPath)) {
    console.log(`[Static] Serving frontend client from ${clientDistPath}`);
    app.use(express.static(clientDistPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        return next();
      }
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  server.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🎉 Block Party Server running on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🎲 Bangladesh-themed Real-Estate Strategy Game`);
    console.log(`===============================================`);
  });
}

bootstrap().catch((err) => {
  console.error('[Fatal Error] Failed to start Block Party server:', err);
  process.exit(1);
});
