import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import pidusage from 'pidusage';
import { ConfigService } from './config.service';
import { BedrockPropertiesService } from './bedrock-properties.service';
import { BedrockStatus } from '../types';

type BedrockProcessState = 'online' | 'offline' | 'starting' | 'stopping' | 'crashed';

export class BedrockProcessService {
  private static instance: BedrockProcessService;
  private configService: ConfigService;
  private propertiesService: BedrockPropertiesService;
  private serverProcess: ChildProcess | null = null;
  private serverStatus: BedrockProcessState = 'offline';
  private startTime: number | null = null;
  private isUserStopping = false;
  private lastError: string | null = null;
  private players: Set<string> = new Set();
  private logListeners: ((chunk: string) => void)[] = [];

  private constructor() {
    this.configService = ConfigService.getInstance();
    this.propertiesService = BedrockPropertiesService.getInstance();
  }

  public static getInstance(): BedrockProcessService {
    if (!BedrockProcessService.instance) {
      BedrockProcessService.instance = new BedrockProcessService();
    }
    return BedrockProcessService.instance;
  }

  public onLog(listener: (chunk: string) => void): () => void {
    this.logListeners.push(listener);
    return () => {
      this.logListeners = this.logListeners.filter((l) => l !== listener);
    };
  }

  private emitLog(chunk: string): void {
    for (const listener of this.logListeners) {
      listener(chunk);
    }
  }

  private hasActiveProcess(processRef: ChildProcess | null = this.serverProcess): boolean {
    return Boolean(processRef && processRef.exitCode === null && processRef.signalCode === null);
  }

  public async getStatus(): Promise<BedrockStatus> {
    const isRunning = this.hasActiveProcess();
    const bedrockDir = this.configService.getBedrockDir();
    const linuxBin = path.join(bedrockDir, 'bedrock_server');
    const winBin = path.join(bedrockDir, 'bedrock_server.exe');
    const isInstalled = fs.existsSync(linuxBin) || fs.existsSync(winBin);

    let version: string | null = null;
    const metaFile = path.join(bedrockDir, 'bedrock-version.json');
    if (fs.existsSync(metaFile)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
        version = meta.version || null;
      } catch {}
    }

    const port = this.propertiesService.getPort();
    const ipv6Port = this.propertiesService.getIpv6Port();

    return {
      isInstalled,
      isRunning,
      pid: isRunning ? this.serverProcess?.pid || null : null,
      status: this.serverStatus,
      uptime: isRunning && this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
      version,
      port,
      ipv6Port,
      players: {
        online: this.players.size,
        max: 10,
        list: Array.from(this.players),
      },
      lastError: this.lastError,
    };
  }

  public async start(): Promise<{ success: boolean; message: string }> {
    if (this.hasActiveProcess()) {
      return { success: false, message: 'El servidor Bedrock ya está ejecutándose' };
    }

    const bedrockDir = this.configService.getBedrockDir();
    const linuxBin = path.join(bedrockDir, 'bedrock_server');
    const winBin = path.join(bedrockDir, 'bedrock_server.exe');

    let binary: string;
    if (process.platform === 'win32' && fs.existsSync(winBin)) {
      binary = winBin;
    } else if (fs.existsSync(linuxBin)) {
      binary = linuxBin;
      try {
        fs.chmodSync(linuxBin, 0o755);
      } catch {}
    } else {
      throw new Error('No se encontró el ejecutable de Bedrock (bedrock_server). Instálalo primero desde la pestaña Versiones.');
    }

    // Ensure properties file is valid
    this.propertiesService.ensurePropertiesFile();

    this.isUserStopping = false;
    this.serverStatus = 'starting';
    this.startTime = Date.now();
    this.lastError = null;
    this.players.clear();

    const logsDir = path.join(bedrockDir, 'logs');
    fs.mkdirSync(logsDir, { recursive: true });
    const logStream = fs.createWriteStream(path.join(logsDir, 'latest.log'), { flags: 'a' });

    try {
      const child = spawn(binary, [], {
        cwd: bedrockDir,
        env: {
          ...process.env,
          LD_LIBRARY_PATH: '.',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.serverProcess = child;

      const handleOutput = (chunk: Buffer | string) => {
        const text = chunk.toString();
        logStream.write(text);
        this.emitLog(text);

        // Detect server online state
        if (text.includes('Server started.') || text.includes('IPv4 supported') || text.includes('Running AutoCompaction')) {
          this.serverStatus = 'online';
        }

        // Track players joining/leaving
        // Bedrock log format: "Player connected: PlayerName, xuid: ..."
        const connectMatch = text.match(/Player connected:\s*([a-zA-Z0-9_ -]+),/i);
        if (connectMatch && connectMatch[1]) {
          this.players.add(connectMatch[1].trim());
        }

        const disconnectMatch = text.match(/Player disconnected:\s*([a-zA-Z0-9_ -]+),/i);
        if (disconnectMatch && disconnectMatch[1]) {
          this.players.delete(disconnectMatch[1].trim());
        }
      };

      child.stdout?.on('data', handleOutput);
      child.stderr?.on('data', handleOutput);

      child.on('close', (code) => {
        if (this.serverProcess !== child) {
          logStream.end();
          return;
        }

        const wasUserStopping = this.isUserStopping || this.serverStatus === 'stopping';
        this.serverProcess = null;
        this.startTime = null;
        this.isUserStopping = false;
        this.players.clear();
        logStream.end();

        if (wasUserStopping || code === 0) {
          this.serverStatus = 'offline';
        } else {
          this.serverStatus = 'crashed';
          this.lastError = `El proceso de Bedrock terminó inesperadamente con código ${code}`;
        }
      });

      child.on('error', (err) => {
        console.error('[BedrockProcessService] Error al iniciar Bedrock:', err);
        this.lastError = err.message;
        if (this.serverProcess === child) this.serverProcess = null;
        this.serverStatus = 'offline';
        this.startTime = null;
        logStream.end();
      });

      // Quick early exit check
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (!this.hasActiveProcess(child)) {
        throw new Error(this.lastError || 'El proceso de Bedrock terminó durante el arranque');
      }

      return { success: true, message: 'Servidor Minecraft Bedrock iniciado correctamente' };
    } catch (err: any) {
      logStream.end();
      this.serverStatus = 'offline';
      this.startTime = null;
      throw new Error(`No se pudo iniciar el proceso de Bedrock: ${err.message}`);
    }
  }

  public async stop(): Promise<{ success: boolean; message: string }> {
    if (!this.hasActiveProcess()) {
      this.serverStatus = 'offline';
      return { success: false, message: 'El servidor Bedrock no está ejecutándose' };
    }

    this.isUserStopping = true;
    this.serverStatus = 'stopping';

    // Bedrock accepts 'stop' via stdin
    const commandSent = this.sendCommand('stop');
    if (commandSent && (await this.waitForExit(20000))) {
      return { success: true, message: 'Servidor Bedrock detenido correctamente' };
    }

    // Force kill if graceful stop timed out
    if (this.serverProcess) {
      try {
        this.serverProcess.kill('SIGTERM');
        if (await this.waitForExit(5000)) {
          return { success: true, message: 'Servidor Bedrock detenido con SIGTERM' };
        }
        this.serverProcess.kill('SIGKILL');
      } catch {}
    }

    this.serverProcess = null;
    this.serverStatus = 'offline';
    this.startTime = null;
    this.isUserStopping = false;
    return { success: true, message: 'Servidor Bedrock forzado a detenerse' };
  }

  public async restart(): Promise<{ success: boolean; message: string }> {
    if (this.hasActiveProcess()) {
      await this.stop();
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return this.start();
  }

  public sendCommand(command: string): boolean {
    const cleanCommand = command.replace(/[\r\n]/g, ' ').trim().replace(/^\/+/, '');
    if (!cleanCommand || !this.hasActiveProcess() || !this.serverProcess?.stdin || this.serverProcess.stdin.destroyed) {
      return false;
    }
    this.serverProcess.stdin.write(`${cleanCommand}\n`);
    return true;
  }

  public async shutdown(): Promise<void> {
    if (this.serverProcess && !this.serverProcess.killed) {
      await this.stop();
    }
  }

  private async waitForExit(timeoutMs: number): Promise<boolean> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      if (!this.hasActiveProcess()) return true;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    return false;
  }
}
