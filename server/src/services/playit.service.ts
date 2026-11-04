import fs from 'fs';
import path from 'path';
import net from 'net';
import { spawn, ChildProcess } from 'child_process';
import { ConfigService } from './config.service';
import { SUBDIRS } from '../config/constants';
import { PlayitStatus, PlayitTunnel } from '../types';

interface PlayitManagerConfig {
  localPort: number;
  bedrockLocalPort?: number;
}

/** Runs the Playit agent next to Minecraft (Java + Bedrock) and keeps its state in /data. */
export class PlayitService {
  private static instance: PlayitService;
  private configService: ConfigService;
  private playitProcess: ChildProcess | null = null;
  private recentLogs: string[] = [];
  private readonly maxLogs = 200;
  private publicAddress = '';
  private tunnelsMap: Map<string, PlayitTunnel> = new Map();
  private lastError: string | null = null;
  private ipcRequestId = 0;

  private constructor() {
    this.configService = ConfigService.getInstance();
  }

  public static getInstance(): PlayitService {
    if (!PlayitService.instance) PlayitService.instance = new PlayitService();
    return PlayitService.instance;
  }

  private getPlayitDir(): string {
    return path.join(this.configService.getRootPath(), SUBDIRS.PLAYIT);
  }

  private getSecretPath(): string {
    return path.join(this.getPlayitDir(), 'playit.toml');
  }

  private getManagerConfigPath(): string {
    return path.join(this.getPlayitDir(), 'manager.json');
  }

  public getLocalPort(): number {
    try {
      const configPath = this.getManagerConfigPath();
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Partial<PlayitManagerConfig>;
        if (Number.isInteger(config.localPort) && Number(config.localPort) >= 1 && Number(config.localPort) <= 65535) {
          return Number(config.localPort);
        }
      }
    } catch {}
    const fromEnv = Number(process.env.PLAYIT_LOCAL_PORT || 25565);
    return Number.isInteger(fromEnv) && fromEnv >= 1 && fromEnv <= 65535 ? fromEnv : 25565;
  }

  public getBedrockLocalPort(): number {
    try {
      const configPath = this.getManagerConfigPath();
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Partial<PlayitManagerConfig>;
        if (Number.isInteger(config.bedrockLocalPort) && Number(config.bedrockLocalPort) >= 1 && Number(config.bedrockLocalPort) <= 65535) {
          return Number(config.bedrockLocalPort);
        }
      }
    } catch {}
    const fromEnv = Number(process.env.PLAYIT_BEDROCK_PORT || 19132);
    return Number.isInteger(fromEnv) && fromEnv >= 1 && fromEnv <= 65535 ? fromEnv : 19132;
  }

  public getConfig(): {
    configured: boolean;
    localPort: number;
    bedrockLocalPort: number;
    secretPath: string;
    binaryPath: string | null;
  } {
    return {
      configured: fs.existsSync(this.getSecretPath()),
      localPort: this.getLocalPort(),
      bedrockLocalPort: this.getBedrockLocalPort(),
      secretPath: this.getSecretPath(),
      binaryPath: this.findPlayitBinary(),
    };
  }

  public saveConfig(input: { localPort?: number; bedrockLocalPort?: number }): {
    success: boolean;
    localPort: number;
    bedrockLocalPort: number;
  } {
    let currentLocalPort = this.getLocalPort();
    let currentBedrockPort = this.getBedrockLocalPort();

    if (input.localPort !== undefined) {
      const port = Number(input.localPort);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('El puerto local Java debe ser un número entre 1 y 65535');
      }
      currentLocalPort = port;
    }

    if (input.bedrockLocalPort !== undefined) {
      const bPort = Number(input.bedrockLocalPort);
      if (!Number.isInteger(bPort) || bPort < 1 || bPort > 65535) {
        throw new Error('El puerto local Bedrock debe ser un número entre 1 y 65535');
      }
      currentBedrockPort = bPort;
    }

    const dir = this.getPlayitDir();
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      this.getManagerConfigPath(),
      JSON.stringify({ localPort: currentLocalPort, bedrockLocalPort: currentBedrockPort }, null, 2) + '\n',
      'utf8'
    );
    return { success: true, localPort: currentLocalPort, bedrockLocalPort: currentBedrockPort };
  }

  public getStatus(): PlayitStatus {
    const isRunning = this.playitProcess !== null && !this.playitProcess.killed;
    const config = this.getConfig();
    return {
      isRunning,
      pid: this.playitProcess?.pid || null,
      tunnels: Array.from(this.tunnelsMap.values()),
      publicAddress: this.publicAddress || undefined,
      binaryPath: config.binaryPath,
      secretPath: config.secretPath,
      localPort: config.localPort,
      lastError: this.lastError,
      logs: this.recentLogs.slice(-50),
    };
  }

  private findPlayitBinary(): string | null {
    const localBinary = path.join(this.getPlayitDir(), 'playit');
    if (fs.existsSync(localBinary)) {
      try { fs.chmodSync(localBinary, 0o755); } catch {}
      return localBinary;
    }
    for (const candidate of ['/usr/local/bin/playit', '/usr/bin/playit']) {
      if (fs.existsSync(candidate)) return candidate;
    }
    return null;
  }

  public async start(): Promise<{ success: boolean; message: string }> {
    if (this.playitProcess && !this.playitProcess.killed) {
      return { success: false, message: 'Playit ya está ejecutándose' };
    }

    const binary = this.findPlayitBinary();
    if (!binary) throw new Error('No se encontró el binario de Playit dentro del contenedor');

    const playitDir = this.getPlayitDir();
    fs.mkdirSync(playitDir, { recursive: true });
    this.lastError = null;

    const child = spawn(binary, ['--secret-path', this.getSecretPath()], {
      cwd: playitDir,
      env: {
        ...process.env,
        PLAYIT_LOCAL_PORT: String(this.getLocalPort()),
        PLAYIT_BEDROCK_PORT: String(this.getBedrockLocalPort()),
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.playitProcess = child;

    child.stdout?.on('data', (chunk) => this.handleOutput(chunk.toString()));
    child.stderr?.on('data', (chunk) => this.handleOutput(chunk.toString()));
    child.on('close', (code) => {
      this.appendLog(`Proceso de Playit finalizado con código ${code}`);
      this.playitProcess = null;
    });
    child.on('error', (error) => {
      this.lastError = error.message;
      this.appendLog(`Error de Playit: ${error.message}`);
      this.playitProcess = null;
    });

    return { success: true, message: 'Agente Playit iniciado' };
  }

  public async provisionSecret(secret: string): Promise<{ success: boolean; message: string }> {
    const normalizedSecret = secret.trim();
    if (normalizedSecret.length < 8) {
      throw new Error('La clave de Playit parece demasiado corta');
    }

    if (!this.playitProcess || this.playitProcess.killed) {
      await this.start();
    }

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        const response = await this.requestIpc({
          type: 'set_secret',
          secret: normalizedSecret,
        });

        if (response.type !== 'set_secret') {
          throw new Error('Playit respondió con un estado de vinculación inesperado');
        }

        this.lastError = null;
        return { success: true, message: 'Agente Playit vinculado correctamente' };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if ((lastError as NodeJS.ErrnoException).code === 'PLAYIT_IPC_RESPONSE') break;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }

    throw lastError || new Error('No se pudo conectar con el agente de Playit');
  }

  public stop(): { success: boolean; message: string } {
    if (!this.playitProcess || this.playitProcess.killed) {
      return { success: false, message: 'Playit no está ejecutándose' };
    }
    this.playitProcess.kill('SIGTERM');
    this.appendLog('Agente Playit detenido');
    return { success: true, message: 'Agente Playit detenido' };
  }

  public async restart(): Promise<{ success: boolean; message: string }> {
    this.stop();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return this.start();
  }

  public async shutdown(): Promise<void> {
    if (this.playitProcess && !this.playitProcess.killed) this.playitProcess.kill('SIGTERM');
  }

  private getIpcSocketPath(): string {
    return process.env.PLAYIT_IPC_SOCKET_PATH || '/run/playit/playitd.sock';
  }

  private requestIpc(request: Record<string, unknown>): Promise<{ type: string; data?: unknown }> {
    const socketPath = this.getIpcSocketPath();
    const requestId = ++this.ipcRequestId;

    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ path: socketPath });
      let buffer = '';
      let frameIndex = 0;
      let settled = false;

      const finishError = (error: Error): void => {
        if (settled) return;
        settled = true;
        socket.destroy();
        reject(error);
      };

      const finish = (response: { type: string; data?: unknown }): void => {
        if (settled) return;
        settled = true;
        socket.end();
        resolve(response);
      };

      const readFrame = (line: string): void => {
        if (!line.trim()) return;

        let payload: unknown;
        try {
          payload = JSON.parse(line);
        } catch {
          finishError(new Error('Playit devolvió una respuesta IPC inválida'));
          return;
        }

        if (frameIndex === 0) {
          frameIndex = 1;
          return;
        }

        const envelope = payload as {
          response?: { type?: unknown; data?: unknown };
          data?: { response?: { type?: unknown; data?: unknown } };
        };
        const response = envelope.data?.response || envelope.response;
        if (!response || typeof response.type !== 'string') {
          finishError(new Error('Playit devolvió una respuesta IPC desconocida'));
          return;
        }

        if (response.type === 'error') {
          const responseData = response.data as { message?: unknown } | string | undefined;
          const message =
            typeof responseData === 'string'
              ? responseData
              : responseData && typeof responseData.message === 'string'
                ? responseData.message
                : 'Playit rechazó la clave de vinculación';
          const error = new Error(
            message
          ) as NodeJS.ErrnoException;
          error.code = 'PLAYIT_IPC_RESPONSE';
          finishError(error);
          return;
        }

        finish({ type: response.type, data: response.data });
      };

      socket.setTimeout(5000, () => finishError(new Error('Tiempo agotado al conectar con el agente de Playit')));
      socket.on('connect', () => {
        socket.write(`${JSON.stringify({ ipc_version: 2, request_id: requestId, request })}\n`);
      });
      socket.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf8');
        let newlineIndex = buffer.indexOf('\n');
        while (newlineIndex >= 0) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          readFrame(line);
          if (settled) return;
          newlineIndex = buffer.indexOf('\n');
        }
      });
      socket.on('error', (error) => finishError(error));
      socket.on('close', () => {
        if (!settled) finishError(new Error('El socket IPC de Playit se cerró sin responder'));
      });
    });
  }

  private handleOutput(text: string): void {
    for (const line of text.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean)) {
      this.appendLog(line);
      const match = line.match(/([a-zA-Z0-9.-]+\.(?:ply\.gg|playit\.gg))(?:\s*:\s*(\d+))?/i);
      if (!match?.[1] || !match[2]) continue;

      const domain = match[1];
      const publicPort = Number(match[2]);
      this.publicAddress = domain;

      // Identify whether this line corresponds to Bedrock UDP or Java TCP
      const isUdp = /udp/i.test(line) || /bedrock/i.test(line) || line.includes('19132');
      const tunnelId = isUdp ? 'minecraft-bedrock' : 'minecraft-java';
      const tunnelName = isUdp ? 'Minecraft Bedrock' : 'Minecraft Java';
      const proto = isUdp ? 'udp' : 'tcp';
      const localPort = isUdp ? this.getBedrockLocalPort() : this.getLocalPort();

      const tunnel: PlayitTunnel = {
        id: tunnelId,
        name: tunnelName,
        proto,
        publicAddress: domain,
        assignedDomain: domain,
        publicPort,
        localPort,
      };

      this.tunnelsMap.set(tunnelId, tunnel);
    }
  }

  private appendLog(line: string): void {
    const timestamp = new Date().toISOString().slice(11, 19);
    this.recentLogs.push(`[${timestamp}] ${line}`);
    if (this.recentLogs.length > this.maxLogs) this.recentLogs.shift();
  }
}
