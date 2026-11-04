import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { ConfigService } from '../services/config.service';
import { ProcessService } from '../services/process.service';
import { VersionsService } from '../services/versions.service';
import { BedrockProcessService } from '../services/bedrock-process.service';
import { BedrockVersionsService } from '../services/bedrock-versions.service';
import { SUBDIRS } from '../config/constants';

interface ConsoleMessage {
  type: 'command' | 'ping';
  command?: string;
  target?: 'java' | 'bedrock';
}

export function setupConsoleWebSocket(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws/console' });
  const configService = ConfigService.getInstance();
  const processService = ProcessService.getInstance();
  const versionsService = VersionsService.getInstance();
  const bedrockProcessService = BedrockProcessService.getInstance();
  const bedrockVersionsService = BedrockVersionsService.getInstance();

  // Forward version installer logs to all connected WebSocket clients
  versionsService.onLog((logLine) => {
    broadcast(wss, JSON.stringify({ type: 'installer', server: 'java', data: logLine }));
  });

  bedrockVersionsService.onLog((logLine) => {
    broadcast(wss, JSON.stringify({ type: 'installer', server: 'bedrock', data: logLine }));
  });

  // Bedrock live process logs
  bedrockProcessService.onLog((logChunk) => {
    const lines = logChunk.split(/\r?\n/).filter((l) => l.trim().length > 0);
    for (const line of lines) {
      broadcast(wss, JSON.stringify({ type: 'log', server: 'bedrock', data: line }));
    }
  });

  // Track file read offset for tailing Java latest.log
  let lastLogSize = 0;

  const getLogPath = () => configService.resolvePath(SUBDIRS.LATEST_LOG);

  const checkAndStreamLogs = () => {
    const logPath = getLogPath();
    if (!fs.existsSync(logPath)) {
      lastLogSize = 0;
      return;
    }

    try {
      const stats = fs.statSync(logPath);
      if (stats.size < lastLogSize) {
        lastLogSize = 0;
      }

      if (stats.size > lastLogSize) {
        const stream = fs.createReadStream(logPath, {
          start: lastLogSize,
          end: stats.size,
          encoding: 'utf-8',
        });

        let buffer = '';
        stream.on('data', (chunk) => {
          buffer += chunk;
        });

        stream.on('end', () => {
          const lines = buffer.split(/\r?\n/);
          for (const line of lines) {
            if (line.trim()) {
              broadcast(wss, JSON.stringify({ type: 'log', server: 'java', data: line }));
            }
          }
        });

        lastLogSize = stats.size;
      }
    } catch {}
  };

  // Poll log file every 300ms for lowest latency
  setInterval(checkAndStreamLogs, 300);

  wss.on('connection', (ws: WebSocket, req) => {
    const config = configService.getConfig();

    // Authenticate client
    let authenticated = !config.initialSetupDone;
    if (!authenticated) {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const queryToken = url.searchParams.get('token');

      let cookieToken = '';
      if (req.headers.cookie) {
        const match = req.headers.cookie.match(/mc_token=([^;]+)/);
        if (match) cookieToken = match[1];
      }

      const token = queryToken || cookieToken;
      if (token) {
        try {
          jwt.verify(token, config.jwtSecret);
          authenticated = true;
        } catch {}
      }
    }

    if (!authenticated) {
      ws.send(JSON.stringify({ type: 'error', data: 'Unauthorized WebSocket connection' }));
      ws.close(4001, 'Unauthorized');
      return;
    }

    // Send initial greeting
    ws.send(JSON.stringify({ type: 'log', server: 'system', data: '§a[MCServer Manager] Dual Console stream connected (Java & Bedrock).' }));

    // Send the last 80 lines of Java latest.log if exists
    const logPath = getLogPath();
    if (fs.existsSync(logPath)) {
      try {
        const content = fs.readFileSync(logPath, 'utf-8');
        const allLines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
        const recent = allLines.slice(-80);
        for (const line of recent) {
          ws.send(JSON.stringify({ type: 'log', server: 'java', data: line }));
        }
        const stats = fs.statSync(logPath);
        lastLogSize = stats.size;
      } catch {}
    }

    ws.on('message', async (data) => {
      try {
        const parsed: ConsoleMessage = JSON.parse(data.toString());

        if (parsed.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        if (parsed.type === 'command' && parsed.command) {
          const cmd = parsed.command.trim();
          const target = parsed.target || 'java';

          ws.send(JSON.stringify({ type: 'log', server: target, data: `§7[${target.toUpperCase()}] > ${cmd}` }));

          if (target === 'bedrock') {
            const sent = bedrockProcessService.sendCommand(cmd);
            if (!sent) {
              ws.send(
                JSON.stringify({
                  type: 'log',
                  server: 'bedrock',
                  data: '§c[Error] El servidor Bedrock está detenido o no acepta comandos.',
                })
              );
            }
          } else {
            const sent = processService.sendCommand(cmd);
            if (!sent) {
              ws.send(
                JSON.stringify({
                  type: 'log',
                  server: 'java',
                  data: '§c[Error] El servidor Java está detenido o todavía no acepta comandos.',
                })
              );
            }
          }
        }
      } catch (err: any) {
        ws.send(JSON.stringify({ type: 'error', data: err.message }));
      }
    });
  });

  return wss;
}

function broadcast(wss: WebSocketServer, message: string): void {
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}
