import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import axios from 'axios';
import { ConfigService } from './config.service';

export interface BedrockInstalledInfo {
  isInstalled: boolean;
  version: string | null;
  binaryFound: boolean;
  serverDir: string;
  lastInstalled?: string;
}

export class BedrockVersionsService {
  private static instance: BedrockVersionsService;
  private configService: ConfigService;
  private isInstalling = false;
  private logListeners: ((line: string) => void)[] = [];

  private constructor() {
    this.configService = ConfigService.getInstance();
  }

  public static getInstance(): BedrockVersionsService {
    if (!BedrockVersionsService.instance) {
      BedrockVersionsService.instance = new BedrockVersionsService();
    }
    return BedrockVersionsService.instance;
  }

  public onLog(listener: (line: string) => void): () => void {
    this.logListeners.push(listener);
    return () => {
      this.logListeners = this.logListeners.filter((l) => l !== listener);
    };
  }

  private emitLog(line: string): void {
    const formatted = `[BEDROCK INSTALLER] ${line}`;
    for (const listener of this.logListeners) {
      listener(formatted);
    }
  }

  public getInstalledInfo(): BedrockInstalledInfo {
    const bedrockDir = this.configService.getBedrockDir();
    const linuxBin = path.join(bedrockDir, 'bedrock_server');
    const winBin = path.join(bedrockDir, 'bedrock_server.exe');
    const binaryFound = fs.existsSync(linuxBin) || fs.existsSync(winBin);

    let version: string | null = null;
    let lastInstalled: string | undefined;

    const metaFile = path.join(bedrockDir, 'bedrock-version.json');
    if (fs.existsSync(metaFile)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
        version = meta.version || null;
        lastInstalled = meta.installedAt;
      } catch {}
    }

    if (!version && binaryFound) {
      version = 'Bedrock Dedicated Server (Detectado)';
    }

    return {
      isInstalled: binaryFound,
      version,
      binaryFound,
      serverDir: bedrockDir,
      lastInstalled,
    };
  }

  public async getAvailableVersion(): Promise<{ version: string; downloadUrl: string }> {
    const fallbackUrl = 'https://minecraft.azureedge.net/bin-linux/bedrock-server-1.21.51.02.zip';
    const fallbackVersion = '1.21.51.02';

    try {
      const response = await axios.get('https://www.minecraft.net/en-us/download/server/bedrock', {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 8000,
      });

      const html = response.data as string;
      const match = html.match(/https:\/\/(?:minecraft\.azureedge\.net|www\.minecraft\.net)\/bin-linux\/bedrock-server-([0-9.]+)\.zip/i);
      if (match && match[0] && match[1]) {
        return {
          downloadUrl: match[0],
          version: match[1],
        };
      }
    } catch (err: any) {
      this.emitLog(`No se pudo consultar el sitio de Mojang (${err.message}). Usando versión estable de reserva.`);
    }

    return {
      downloadUrl: fallbackUrl,
      version: fallbackVersion,
    };
  }

  public async install(targetUrl?: string): Promise<{ success: boolean; version: string; message: string }> {
    if (this.isInstalling) {
      throw new Error('Ya hay una instalación de Bedrock en curso.');
    }

    this.isInstalling = true;
    const bedrockDir = this.configService.getBedrockDir();
    fs.mkdirSync(bedrockDir, { recursive: true });

    try {
      let downloadUrl = targetUrl;
      let detectedVersion = '1.21.51.02';

      if (!downloadUrl) {
        this.emitLog('Buscando versión más reciente de Bedrock Dedicated Server en Mojang...');
        const latest = await this.getAvailableVersion();
        downloadUrl = latest.downloadUrl;
        detectedVersion = latest.version;
      } else {
        const vMatch = downloadUrl.match(/bedrock-server-([0-9.]+)\.zip/i);
        if (vMatch) detectedVersion = vMatch[1];
      }

      this.emitLog(`Descargando BDS v${detectedVersion} desde ${downloadUrl}...`);
      const zipPath = path.join(bedrockDir, 'bds_package.zip');

      const response = await axios({
        method: 'GET',
        url: downloadUrl,
        responseType: 'stream',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 60000,
      });

      const writer = fs.createWriteStream(zipPath);
      response.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', () => resolve());
        writer.on('error', (err) => reject(err));
      });

      this.emitLog('Descarga completada. Preservando configuraciones existentes...');

      // Backup critical user files before extraction
      const preservedFiles: Record<string, string> = {};
      const filesToPreserve = ['server.properties', 'permissions.json', 'allowlist.json'];
      for (const file of filesToPreserve) {
        const fullPath = path.join(bedrockDir, file);
        if (fs.existsSync(fullPath)) {
          preservedFiles[file] = fs.readFileSync(fullPath, 'utf-8');
        }
      }

      this.emitLog('Extrayendo archivos de Bedrock...');
      await this.extractZip(zipPath, bedrockDir);

      // Restore preserved configuration files so user settings are NEVER overwritten
      for (const [file, content] of Object.entries(preservedFiles)) {
        fs.writeFileSync(path.join(bedrockDir, file), content, 'utf-8');
        this.emitLog(`Restaurado archivo de configuración existente: ${file}`);
      }

      // Cleanup package
      try {
        fs.unlinkSync(zipPath);
      } catch {}

      // Make bedrock_server executable on Linux
      const binPath = path.join(bedrockDir, 'bedrock_server');
      if (fs.existsSync(binPath)) {
        try {
          fs.chmodSync(binPath, 0o755);
        } catch {}
      }

      // Save version metadata
      const meta = {
        version: detectedVersion,
        downloadUrl,
        installedAt: new Date().toISOString(),
      };
      fs.writeFileSync(path.join(bedrockDir, 'bedrock-version.json'), JSON.stringify(meta, null, 2), 'utf-8');

      this.emitLog(`¡Instalación de Bedrock v${detectedVersion} completada con éxito!`);
      return {
        success: true,
        version: detectedVersion,
        message: `Servidor Bedrock v${detectedVersion} instalado correctamente en ${bedrockDir}`,
      };
    } finally {
      this.isInstalling = false;
    }
  }

  private async extractZip(zipPath: string, targetDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (process.platform === 'win32') {
        const ps = spawn('powershell.exe', [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${targetDir}' -Force`,
        ]);
        ps.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Expand-Archive terminó con código ${code}`));
        });
        ps.on('error', reject);
      } else {
        const unzip = spawn('unzip', ['-o', '-q', zipPath, '-d', targetDir]);
        unzip.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`unzip terminó con código ${code}`));
        });
        unzip.on('error', reject);
      }
    });
  }
}
