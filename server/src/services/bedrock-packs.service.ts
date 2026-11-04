import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { ConfigService } from './config.service';
import { BedrockPropertiesService } from './bedrock-properties.service';

export interface BedrockPackInfo {
  id: string;
  uuid: string;
  name: string;
  description: string;
  version: string;
  type: 'resource' | 'behavior';
  folderName: string;
  sizeBytes: number;
  sizeFormatted: string;
  iconBase64?: string;
  isActiveInWorld: boolean;
  minEngineVersion?: string;
  installedAt?: string;
}

export class BedrockPacksService {
  private static instance: BedrockPacksService;
  private configService: ConfigService;
  private propertiesService: BedrockPropertiesService;

  private constructor() {
    this.configService = ConfigService.getInstance();
    this.propertiesService = BedrockPropertiesService.getInstance();
    this.ensurePackDirectories();
  }

  public static getInstance(): BedrockPacksService {
    if (!BedrockPacksService.instance) {
      BedrockPacksService.instance = new BedrockPacksService();
    }
    return BedrockPacksService.instance;
  }

  private ensurePackDirectories(): void {
    const bedrockDir = this.configService.getBedrockDir();
    const rpDir = path.join(bedrockDir, 'resource_packs');
    const bpDir = path.join(bedrockDir, 'behavior_packs');
    if (!fs.existsSync(rpDir)) fs.mkdirSync(rpDir, { recursive: true });
    if (!fs.existsSync(bpDir)) fs.mkdirSync(bpDir, { recursive: true });
  }

  private getActiveWorldDir(): string {
    const bedrockDir = this.configService.getBedrockDir();
    let levelName = 'Bedrock level';
    try {
      const props = this.propertiesService.readProperties();
      if (props.properties && props.properties['level-name']) {
        levelName = String(props.properties['level-name']);
      }
    } catch {}

    const worldDir = path.join(bedrockDir, 'worlds', levelName);
    if (!fs.existsSync(worldDir)) {
      try {
        fs.mkdirSync(worldDir, { recursive: true });
      } catch {}
    }
    return worldDir;
  }

  private getActiveWorldPacks(type: 'resource' | 'behavior'): Array<{ pack_id: string; version?: any }> {
    const worldDir = this.getActiveWorldDir();
    const fileName = type === 'resource' ? 'world_resource_packs.json' : 'world_behavior_packs.json';
    const filePath = path.join(worldDir, fileName);

    if (!fs.existsSync(filePath)) return [];
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return [];
  }

  private saveActiveWorldPacks(type: 'resource' | 'behavior', packs: Array<{ pack_id: string; version?: any }>): void {
    const worldDir = this.getActiveWorldDir();
    const fileName = type === 'resource' ? 'world_resource_packs.json' : 'world_behavior_packs.json';
    const filePath = path.join(worldDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(packs, null, 2), 'utf-8');
  }

  private getDirSize(dirPath: string): number {
    let size = 0;
    try {
      const files = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(dirPath, file.name);
        if (file.isDirectory()) {
          size += this.getDirSize(fullPath);
        } else if (file.isFile()) {
          try {
            size += fs.statSync(fullPath).size;
          } catch {}
        }
      }
    } catch {}
    return size;
  }

  private formatBytes(bytes: number): string {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${bytes} B`;
  }

  private parseManifest(manifestPath: string): any {
    try {
      const content = fs.readFileSync(manifestPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private readPackIcon(packDir: string): string | undefined {
    const iconNames = ['pack_icon.png', 'pack_icon.jpg', 'icon.png'];
    for (const name of iconNames) {
      const iconPath = path.join(packDir, name);
      if (fs.existsSync(iconPath)) {
        try {
          const buf = fs.readFileSync(iconPath);
          const ext = name.endsWith('.jpg') ? 'jpeg' : 'png';
          return `data:image/${ext};base64,${buf.toString('base64')}`;
        } catch {}
      }
    }
    return undefined;
  }

  public getPacks(): {
    packs: BedrockPackInfo[];
    total: number;
    resourceCount: number;
    behaviorCount: number;
    activeCount: number;
  } {
    this.ensurePackDirectories();
    const bedrockDir = this.configService.getBedrockDir();
    const rpDir = path.join(bedrockDir, 'resource_packs');
    const bpDir = path.join(bedrockDir, 'behavior_packs');

    const activeRp = this.getActiveWorldPacks('resource');
    const activeBp = this.getActiveWorldPacks('behavior');
    const activeRpIds = new Set(activeRp.map((p) => p.pack_id));
    const activeBpIds = new Set(activeBp.map((p) => p.pack_id));

    const results: BedrockPackInfo[] = [];

    const scanDir = (dirPath: string, type: 'resource' | 'behavior') => {
      if (!fs.existsSync(dirPath)) return;
      try {
        const folders = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const item of folders) {
          if (!item.isDirectory()) continue;
          const folderPath = path.join(dirPath, item.name);
          const manifestPath = path.join(folderPath, 'manifest.json');
          if (!fs.existsSync(manifestPath)) continue;

          const manifest = this.parseManifest(manifestPath);
          if (!manifest || !manifest.header) continue;

          const header = manifest.header;
          const uuid = header.uuid || item.name;
          const name = header.name || item.name;
          const description = header.description || 'Sin descripción';
          const versionArr = Array.isArray(header.version) ? header.version : [1, 0, 0];
          const version = versionArr.join('.');
          const minEngine = Array.isArray(header.min_engine_version)
            ? header.min_engine_version.join('.')
            : undefined;

          const sizeBytes = this.getDirSize(folderPath);
          const sizeFormatted = this.formatBytes(sizeBytes);
          const iconBase64 = this.readPackIcon(folderPath);
          const isActive = type === 'resource' ? activeRpIds.has(uuid) : activeBpIds.has(uuid);

          results.push({
            id: `${type}-${uuid}`,
            uuid,
            name,
            description,
            version,
            type,
            folderName: item.name,
            sizeBytes,
            sizeFormatted,
            iconBase64,
            isActiveInWorld: isActive,
            minEngineVersion: minEngine,
            installedAt: fs.statSync(folderPath).mtime.toISOString(),
          });
        }
      } catch (err) {
        console.error(`Error scanning ${type} packs:`, err);
      }
    };

    scanDir(rpDir, 'resource');
    scanDir(bpDir, 'behavior');

    const resourceCount = results.filter((p) => p.type === 'resource').length;
    const behaviorCount = results.filter((p) => p.type === 'behavior').length;
    const activeCount = results.filter((p) => p.isActiveInWorld).length;

    return {
      packs: results,
      total: results.length,
      resourceCount,
      behaviorCount,
      activeCount,
    };
  }

  public togglePack(uuid: string, type: 'resource' | 'behavior', enable: boolean): {
    success: boolean;
    isActive: boolean;
    message: string;
  } {
    const current = this.getActiveWorldPacks(type);
    let updated = current.filter((p) => p.pack_id !== uuid);

    if (enable) {
      // Find pack's version from disk
      const all = this.getPacks().packs;
      const found = all.find((p) => p.uuid === uuid && p.type === type);
      const vArr = found
        ? found.version.split('.').map((n) => parseInt(n, 10) || 0)
        : [1, 0, 0];
      updated.push({ pack_id: uuid, version: vArr });
    }

    this.saveActiveWorldPacks(type, updated);
    return {
      success: true,
      isActive: enable,
      message: enable
        ? `Pack activado correctamente en el mundo activo.`
        : `Pack desactivado del mundo activo.`,
    };
  }

  public deletePack(type: 'resource' | 'behavior', folderName: string): {
    success: boolean;
    message: string;
  } {
    const bedrockDir = this.configService.getBedrockDir();
    const targetDir = path.join(bedrockDir, type === 'resource' ? 'resource_packs' : 'behavior_packs', folderName);

    if (!fs.existsSync(targetDir)) {
      throw new Error(`El pack "${folderName}" no existe en ${type}_packs.`);
    }

    // Read manifest to get UUID for world deactivation
    const manifestPath = path.join(targetDir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = this.parseManifest(manifestPath);
      if (manifest?.header?.uuid) {
        this.togglePack(manifest.header.uuid, type, false);
      }
    }

    fs.rmSync(targetDir, { recursive: true, force: true });
    return {
      success: true,
      message: `Pack "${folderName}" eliminado con éxito.`,
    };
  }

  public async installPackFromBuffer(
    buffer: Buffer,
    originalFilename: string
  ): Promise<{ success: boolean; installedPacks: string[]; message: string }> {
    this.ensurePackDirectories();
    const bedrockDir = this.configService.getBedrockDir();
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    const installedPacks: string[] = [];

    // Helper to sanitize folder names
    const sanitizeFolderName = (name: string) => {
      return name
        .replace(/[^\w.-]/g, '_')
        .replace(/_+/g, '_')
        .trim()
        .toLowerCase();
    };

    // Check if it's an .mcaddon containing nested .mcpack files
    const nestedPacks = zipEntries.filter(
      (e) => !e.isDirectory && (e.entryName.endsWith('.mcpack') || e.entryName.endsWith('.zip'))
    );

    if (nestedPacks.length > 0 && originalFilename.endsWith('.mcaddon')) {
      for (const nested of nestedPacks) {
        const nestedBuffer = nested.getData();
        const nestedResult = await this.installSingleZip(nestedBuffer, nested.entryName);
        if (nestedResult.packName) {
          installedPacks.push(nestedResult.packName);
        }
      }
    } else {
      // Single pack (.mcpack, .rp, .bp, or .zip)
      const result = await this.installSingleZip(buffer, originalFilename);
      if (result.packName) {
        installedPacks.push(result.packName);
      }
    }

    if (installedPacks.length === 0) {
      throw new Error(
        'No se pudo encontrar un manifest.json válido en el archivo subido. Asegúrate de que sea un .mcpack, .mcaddon, .rp o .bp válido.'
      );
    }

    return {
      success: true,
      installedPacks,
      message: `¡${installedPacks.length} pack(s) instalado(s) con éxito: ${installedPacks.join(', ')}!`,
    };
  }

  private async installSingleZip(
    buffer: Buffer,
    filename: string
  ): Promise<{ packName?: string; type?: 'resource' | 'behavior' }> {
    const bedrockDir = this.configService.getBedrockDir();
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    // Find manifest.json in the zip
    const manifestEntry = zipEntries.find(
      (e) => !e.isDirectory && (e.entryName === 'manifest.json' || e.entryName.endsWith('/manifest.json'))
    );

    if (!manifestEntry) {
      return {};
    }

    let manifest: any = null;
    try {
      const manifestStr = manifestEntry.getData().toString('utf-8');
      manifest = JSON.parse(manifestStr);
    } catch {
      return {};
    }

    if (!manifest || !manifest.header) {
      return {};
    }

    // Determine type: resource or behavior
    let type: 'resource' | 'behavior' = 'resource';
    if (filename.toLowerCase().endsWith('.bp')) {
      type = 'behavior';
    } else if (filename.toLowerCase().endsWith('.rp')) {
      type = 'resource';
    } else if (Array.isArray(manifest.modules)) {
      const isBehavior = manifest.modules.some(
        (m: any) => m.type === 'data' || m.type === 'javascript' || m.type === 'world_template'
      );
      if (isBehavior) type = 'behavior';
    }

    const packName = manifest.header.name || path.parse(filename).name;
    const cleanName = packName
      .replace(/[^\w.-]/g, '_')
      .replace(/_+/g, '_')
      .trim()
      .toLowerCase();

    const destDirName = `${cleanName}_${manifest.header.uuid ? manifest.header.uuid.slice(0, 8) : Date.now()}`;
    const targetFolder = path.join(
      bedrockDir,
      type === 'resource' ? 'resource_packs' : 'behavior_packs',
      destDirName
    );

    if (fs.existsSync(targetFolder)) {
      fs.rmSync(targetFolder, { recursive: true, force: true });
    }
    fs.mkdirSync(targetFolder, { recursive: true });

    // Determine prefix path if manifest was inside a root folder
    const prefix = manifestEntry.entryName.includes('/')
      ? manifestEntry.entryName.substring(0, manifestEntry.entryName.lastIndexOf('/') + 1)
      : '';

    // Extract entries
    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      let relName = entry.entryName;
      if (prefix && relName.startsWith(prefix)) {
        relName = relName.slice(prefix.length);
      }
      if (!relName) continue;

      const destFilePath = path.join(targetFolder, relName);
      fs.mkdirSync(path.dirname(destFilePath), { recursive: true });
      fs.writeFileSync(destFilePath, entry.getData());
    }

    // Auto-activate in world by default
    if (manifest.header.uuid) {
      try {
        this.togglePack(manifest.header.uuid, type, true);
      } catch {}
    }

    return { packName, type };
  }
}
