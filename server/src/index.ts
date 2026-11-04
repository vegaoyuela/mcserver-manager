import http from 'http';
import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import { ConfigService } from './services/config.service';
import { ProcessService } from './services/process.service';
import { BedrockProcessService } from './services/bedrock-process.service';
import { PlayitService } from './services/playit.service';
import { authMiddleware } from './middlewares/auth.middleware';
import { setupConsoleWebSocket } from './ws/console.ws';

import authRoutes from './routes/auth.routes';
import settingsRoutes from './routes/settings.routes';
import statusRoutes from './routes/status.routes';
import versionsRoutes from './routes/versions.routes';
import propertiesRoutes from './routes/properties.routes';
import playersRoutes from './routes/players.routes';
import modsRoutes from './routes/mods.routes';
import playitRoutes from './routes/playit.routes';
import filesRoutes from './routes/files.routes';
import bedrockRoutes from './routes/bedrock.routes';

dotenv.config();

const app = express();
const server = http.createServer(app);
const configService = ConfigService.getInstance();
const config = configService.getConfig();
const processService = ProcessService.getInstance();
const bedrockProcessService = BedrockProcessService.getInstance();
const playitService = PlayitService.getInstance();

// CORS setup
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow localhost dev servers or same-origin
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all origins for Dokploy/Cloudflare tunnel
      }
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount Routes with Auth Middleware
app.use('/api/auth', authRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);
app.use('/api/status', authMiddleware, statusRoutes);
app.use('/api', authMiddleware, statusRoutes); // for /api/server/action
app.use('/api/versions', authMiddleware, versionsRoutes);
app.use('/api/properties', authMiddleware, propertiesRoutes);
app.use('/api/players', authMiddleware, playersRoutes);
app.use('/api/mods', authMiddleware, modsRoutes);
app.use('/api/playit', authMiddleware, playitRoutes);
app.use('/api/files', authMiddleware, filesRoutes);
app.use('/api/bedrock', authMiddleware, bedrockRoutes);

// Serve static frontend in production
const clientDistCandidates = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), 'dist/client'),
];

let clientDistPath: string | null = null;
for (const candidate of clientDistCandidates) {
  if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'index.html'))) {
    clientDistPath = candidate;
    break;
  }
}

if (clientDistPath) {
  console.log(`Serving static client from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath!, 'index.html'));
  });
} else {
  console.log('Client dist not found, API only mode active.');
}

// Attach WebSocket console
setupConsoleWebSocket(server);

const PORT = config.port || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(` MCServer Manager Backend running on port ${PORT}`);
  console.log(` WebSocket console active on ws://0.0.0.0:${PORT}/ws/console`);
  console.log(` Server root directory: ${config.rootPath}`);
  console.log(` Bedrock directory: ${configService.getBedrockDir()}`);
  console.log(` File explorer root: ${configService.getFileExplorerRoot()}`);
  console.log(` Initial setup done: ${config.initialSetupDone}`);
  console.log(`=======================================================`);

  if (process.env.MINECRAFT_AUTOSTART !== 'false') {
    processService.start().then((result) => console.log(`[Minecraft Java] ${result.message}`)).catch((error) => {
      console.error(`[Minecraft Java] ${error.message}`);
    });
  }

  if (process.env.BEDROCK_AUTOSTART === 'true') {
    bedrockProcessService.start().then((result) => console.log(`[Minecraft Bedrock] ${result.message}`)).catch((error) => {
      console.error(`[Minecraft Bedrock] ${error.message}`);
    });
  }

  if (process.env.PLAYIT_AUTOSTART === 'true') {
    playitService.start().then((result) => console.log(`[Playit] ${result.message}`)).catch((error) => {
      console.error(`[Playit] ${error.message}`);
    });
  }
});

// Handle graceful shutdown
const shutdown = async () => {
  console.log('Shutting down server gracefully...');
  await Promise.allSettled([
    processService.shutdown(),
    bedrockProcessService.shutdown(),
    playitService.shutdown(),
  ]);
  server.close(() => {
    console.log('HTTP and WebSocket server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
