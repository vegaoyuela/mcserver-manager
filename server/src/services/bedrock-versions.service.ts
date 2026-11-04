import fs from 'fs';
import path from 'path';
import axios from 'axios';
import AdmZip from 'adm-zip';
import { ConfigService } from './config.service';

export interface BedrockInstalledInfo {
  isInstalled: boolean;
  version: string | null;
  binaryFound: boolean;
  serverDir: string;
  lastInstalled?: string;
  platform?: string;
}

export interface BedrockAvailableVersion {
  version: string;
  downloadUrl: string;
  isPreview?: boolean;
  isLatest?: boolean;
}

export interface BedrockVersionsCatalog {
  installed: BedrockInstalledInfo;
  latest: BedrockAvailableVersion;
  versions: BedrockAvailableVersion[];
}

export class BedrockVersionsService {
  private static instance: BedrockVersionsService;
  private configService: ConfigService;
  private isInstalling = false;
  private logListeners: ((line: string) => void)[] = [];
  private cachedCatalog: { timestamp: number; data: BedrockVersionsCatalog } | null = null;

  // Fallback official releases in case of network issues with external catalog
  private static readonly FALLBACK_VERSIONS: string[] = [
    '1.26.61.1',
    '1.26.51.1',
    '1.26.45.1',
    '1.21.51.02',
    '1.21.50.07',
    '1.21.44.01',
    '1.21.43.01',
    '1.21.31.04',
    '1.21.30.03',
    '1.21.22.01',
    '1.21.21.01',
    '1.21.2.02',
    '1.21.1.03',
    '1.21.0.03',
    '1.20.81.01',
    '1.20.80.05',
    '1.20.73.01',
    '1.20.72.01',
    '1.20.71.01',
    '1.20.62.02',
    '1.20.60.23',
    '1.20.51.01',
    '1.20.41.02',
    '1.20.32.03',
    '1.20.31.01',
    '1.20.30.02',
    '1.20.15.01',
    '1.20.14.02',
    '1.20.13.01',
    '1.20.12.01',
    '1.20.11.01',
    '1.20.10.01',
    '1.20.1.02',
    '1.20.0.23',
    '1.19.83.01',
    '1.19.81.01',
    '1.19.80.02',
    '1.19.73.02',
    '1.19.72.01',
    '1.19.71.01',
    '1.19.70.02',
    '1.19.63.01',
    '1.19.62.01',
    '1.19.60.20',
    '1.19.53.01',
    '1.19.52.01',
    '1.19.51.01',
    '1.19.50.07',
    '1.19.41.01',
    '1.19.40.02',
    '1.19.31.01',
    '1.19.30.04',
    '1.19.22.01',
    '1.19.21.01',
    '1.19.20.02',
    '1.19.11.01',
    '1.19.10.03',
    '1.19.2.02',
    '1.19.1.01',
  ];

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

  /**
   * Returns current platform binary folder for BDS on Mojang CDN
   */
  public getPlatformDir(): 'bin-win' | 'bin-linux' {
    return process.platform === 'win32' ? 'bin-win' : 'bin-linux';
  }

  /**
   * Constructs the official Mojang download URL for a given version and platform
   */
  public buildDownloadUrl(version: string): string {
    const platformDir = this.getPlatformDir();
    return `https://www.minecraft.net/bedrockdedicatedserver/${platformDir}/bedrock-server-${version}.zip`;
  }

  public getInstalledInfo(): BedrockInstalledInfo {
    const bedrockDir = this.configService.getBedrockDir();
    const linuxBin = path.join(bedrockDir, 'bedrock_server');
    const winBin = path.join(bedrockDir, 'bedrock_server.exe');
    const isWin = process.platform === 'win32';
    const binaryFound = isWin ? fs.existsSync(winBin) : fs.existsSync(linuxBin);

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
      platform: process.platform,
    };
  }

  /**
   * Fetches the complete list of available Bedrock Dedicated Server versions
   */
  public async getAvailableVersions(): Promise<BedrockVersionsCatalog> {
    const now = Date.now();
    // Cache for 10 minutes
    if (this.cachedCatalog && now - this.cachedCatalog.timestamp < 10 * 60 * 1000) {
      return {
        ...this.cachedCatalog.data,
        installed: this.getInstalledInfo(),
      };
    }

    const isWin = process.platform === 'win32';
    const platformKey = isWin ? 'windows' : 'linux';
    const installed = this.getInstalledInfo();

    let latestStable = '1.26.61.1';
    let availableVersions: BedrockAvailableVersion[] = [];

    try {
      const res = await axios.get('https://raw.githubusercontent.com/Bedrock-OSS/BDS-Versions/main/versions.json', {
        timeout: 6000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) mcserver-manager',
        },
      });

      if (res.data && res.data[platformKey]) {
        const platformData = res.data[platformKey];
        if (platformData.stable) {
          latestStable = platformData.stable;
        }

        const rawList: string[] = Array.isArray(platformData.versions) ? platformData.versions : [];
        // Unique and reverse so newest versions come first
        const unique = Array.from(new Set(rawList)).reverse();

        availableVersions = unique.map((v) => ({
          version: v,
          downloadUrl: this.buildDownloadUrl(v),
          isPreview: false,
          isLatest: v === latestStable,
        }));

        // Also add preview version if available
        if (platformData.preview) {
          availableVersions.unshift({
            version: platformData.preview,
            downloadUrl: this.buildDownloadUrl(platformData.preview),
            isPreview: true,
            isLatest: false,
          });
        }
      }
    } catch (err: any) {
      this.emitLog(`No se pudo consultar el repositorio de versiones (${err.message}). Usando catálogo local.`);
    }

    // Fallback if empty or failed
    if (availableVersions.length === 0) {
      availableVersions = BedrockVersionsService.FALLBACK_VERSIONS.map((v) => ({
        version: v,
        downloadUrl: this.buildDownloadUrl(v),
        isPreview: false,
        isLatest: v === latestStable,
      }));
    }

    const latestItem: BedrockAvailableVersion = {
      version: latestStable,
      downloadUrl: this.buildDownloadUrl(latestStable),
      isLatest: true,
    };

    const catalog: BedrockVersionsCatalog = {
      installed,
      latest: latestItem,
      versions: availableVersions,
    };

    this.cachedCatalog = { timestamp: now, data: catalog };
    return catalog;
  }

  /**
   * Backwards compatible single-version method
   */
  public async getAvailableVersion(): Promise<{ version: string; downloadUrl: string }> {
    const catalog = await this.getAvailableVersions();
    return {
      version: catalog.latest.version,
      downloadUrl: catalog.latest.downloadUrl,
    };
  }

  /**
   * Installs a selected version of Bedrock Dedicated Server.
   * Accepts either an explicit targetVersion or a direct downloadUrl.
   */
  public async install(
    targetUrl?: string,
    targetVersion?: string
  ): Promise<{ success: boolean; version: string; message: string }> {
    if (this.isInstalling) {
      throw new Error('Ya hay una instalación de Bedrock en curso.');
    }

    this.isInstalling = true;
    const bedrockDir = this.configService.getBedrockDir();
    fs.mkdirSync(bedrockDir, { recursive: true });

    try {
      let downloadUrl = targetUrl;
      let detectedVersion = targetVersion || '';

      if (!downloadUrl && targetVersion) {
        downloadUrl = this.buildDownloadUrl(targetVersion);
        detectedVersion = targetVersion;
      }

      if (!downloadUrl) {
        this.emitLog('Obteniendo versión más reciente de Bedrock Dedicated Server...');
        const latest = await this.getAvailableVersion();
        downloadUrl = latest.downloadUrl;
        detectedVersion = latest.version;
      } else if (!detectedVersion) {
        const vMatch = downloadUrl.match(/bedrock-server-([0-9.]+)\.zip/i);
        if (vMatch) detectedVersion = vMatch[1];
        else detectedVersion = 'Personalizada';
      }

      this.emitLog(
        `Descargando BDS v${detectedVersion} para ${process.platform === 'win32' ? 'Windows' : 'Linux'} desde ${downloadUrl}...`
      );

      const response = await axios({
        method: 'GET',
        url: downloadUrl,
        responseType: 'arraybuffer',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 90000,
      });

      const buffer = Buffer.from(response.data);
      this.emitLog(`Descarga completada (${(buffer.length / (1024 * 1024)).toFixed(1)} MB). Preservando configuraciones...`);

      // 1. Backup critical user files before extraction so user settings are NEVER lost
      const preservedFiles: Record<string, string> = {};
      const filesToPreserve = [
        'server.properties',
        'permissions.json',
        'allowlist.json',
        'whitelist.json',
        'world_resource_packs.json',
        'world_behavior_packs.json',
      ];
      for (const file of filesToPreserve) {
        const fullPath = path.join(bedrockDir, file);
        if (fs.existsSync(fullPath)) {
          preservedFiles[file] = fs.readFileSync(fullPath, 'utf-8');
        }
      }

      // 2. Extract using pure Node AdmZip (eliminates PowerShell Expand-Archive failures & platform friction)
      this.emitLog('Extrayendo archivos de Bedrock con motor interno...');
      const zip = new AdmZip(buffer);
      zip.extractAllTo(bedrockDir, true);

      // 3. Restore preserved user settings
      for (const [file, content] of Object.entries(preservedFiles)) {
        fs.writeFileSync(path.join(bedrockDir, file), content, 'utf-8');
        this.emitLog(`Restaurado archivo de configuración existente: ${file}`);
      }

      // 4. Ensure correct executable permissions on Linux
      const binLinux = path.join(bedrockDir, 'bedrock_server');
      if (fs.existsSync(binLinux)) {
        try {
          fs.chmodSync(binLinux, 0o755);
        } catch {}
      }

      // 5. Verify that the correct platform binary exists
      const isWin = process.platform === 'win32';
      const expectedBin = isWin ? path.join(bedrockDir, 'bedrock_server.exe') : binLinux;
      if (!fs.existsSync(expectedBin)) {
        throw new Error(
          `La extracción finalizó pero no se encontró ${isWin ? 'bedrock_server.exe' : 'bedrock_server'} en ${bedrockDir}. Verifica que el paquete descargado sea compatible con ${process.platform}.`
        );
      }

      // 6. Save version metadata
      const meta = {
        version: detectedVersion,
        downloadUrl,
        platform: process.platform,
        installedAt: new Date().toISOString(),
      };
      fs.writeFileSync(path.join(bedrockDir, 'bedrock-version.json'), JSON.stringify(meta, null, 2), 'utf-8');

      // Invalidate cache so UI updates immediately
      this.cachedCatalog = null;

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
}
