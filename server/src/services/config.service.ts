import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { PanelConfig } from '../types';
import {
  DEFAULT_FILE_EXPLORER_ROOT,
  DEFAULT_SERVER_ROOT,
  DEFAULT_PORT,
  PANEL_CONFIG_FILE,
  SUBDIRS,
} from '../config/constants';

export class ConfigService {
  private static instance: ConfigService;
  private config: PanelConfig;

  private constructor() {
    this.config = this.loadConfig();
    this.ensureDirectoryStructure();
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  private loadConfig(): PanelConfig {
    if (fs.existsSync(PANEL_CONFIG_FILE)) {
      try {
        const raw = fs.readFileSync(PANEL_CONFIG_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        let configChanged = false;

        // A persisted configuration from the old /home-based deployment must
        // not silently retain access to a path that is no longer mounted.
        if (typeof parsed.rootPath !== 'string' || path.resolve(parsed.rootPath) !== path.resolve(DEFAULT_SERVER_ROOT)) {
          parsed.rootPath = DEFAULT_SERVER_ROOT;
          configChanged = true;
        }

        if (!parsed.passwordHash) {
          parsed.passwordHash = bcrypt.hashSync(process.env.MASTER_PASSWORD || 'admin', 10);
          parsed.initialSetupDone = true;
          configChanged = true;
        }
        if (configChanged) this.saveConfig(parsed);
        return parsed;
      } catch (err) {
        console.error('Failed to parse panel-config.json, re-initializing:', err);
      }
    }

    // Default configuration
    const envMasterPassword = process.env.MASTER_PASSWORD || 'admin';
    const defaultSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
    const passwordHash = bcrypt.hashSync(envMasterPassword, 10);

    const newConfig: PanelConfig = {
      rootPath: DEFAULT_SERVER_ROOT,
      port: DEFAULT_PORT,
      jwtSecret: defaultSecret,
      passwordHash,
      initialSetupDone: true,
    };

    this.saveConfig(newConfig);
    return newConfig;
  }

  public getConfig(): PanelConfig {
    return { ...this.config };
  }

  public saveConfig(newConfig: PanelConfig): void {
    const tmpFile = `${PANEL_CONFIG_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(newConfig, null, 2), 'utf-8');
    fs.renameSync(tmpFile, PANEL_CONFIG_FILE);
    this.config = newConfig;
  }

  public setRootPath(newPath: string): { success: boolean; message?: string } {
    if (!newPath || typeof newPath !== 'string') {
      return { success: false, message: 'Invalid directory path' };
    }

    const resolved = path.resolve(newPath);
    if (resolved !== path.resolve(DEFAULT_SERVER_ROOT)) {
      return { success: false, message: `La raíz de almacenamiento del panel es ${DEFAULT_SERVER_ROOT}` };
    }
    if (!this.isPathAllowed(resolved)) {
      return {
        success: false,
        message: `Path must be inside one of the configured roots: ${this.getAllowedRoots().join(', ')}`,
      };
    }

    if (fs.existsSync(resolved) && !fs.statSync(resolved).isDirectory()) {
      return { success: false, message: 'Configured root path is not a directory' };
    }

    this.config.rootPath = resolved;
    this.saveConfig(this.config);
    this.ensureDirectoryStructure();
    return { success: true };
  }

  public setPassword(rawPassword: string): void {
    const hash = bcrypt.hashSync(rawPassword, 10);
    this.config.passwordHash = hash;
    this.config.initialSetupDone = true;
    this.saveConfig(this.config);
  }

  public setAiSettings(enabled: boolean, apiKey?: string, model?: string): void {
    this.config.aiDiagnosticEnabled = enabled;
    if (apiKey !== undefined) {
      this.config.aiApiKey = apiKey;
    }
    if (model !== undefined) {
      this.config.aiModel = model;
    }
    this.saveConfig(this.config);
  }

  public getRootPath(): string {
    return this.config.rootPath;
  }

  /** The single persistent storage root visible to the manager. */
  public getFileExplorerRoot(): string {
    const explorerRoot = path.resolve(process.env.FILE_EXPLORER_ROOT || DEFAULT_FILE_EXPLORER_ROOT);
    return this.isLexicallyAllowed(explorerRoot) ? explorerRoot : this.config.rootPath;
  }

  public getServerDir(): string {
    const root = this.config.rootPath;
    const standardServerDir = path.join(root, SUBDIRS.SERVER);

    const indicators = [
      'server.properties',
      'server.jar',
      'libraries',
      'run.sh',
      'start.sh',
      'eula.txt',
      'world',
      'version-info.json',
    ];
    const hasIndicators = indicators.some((f) => fs.existsSync(path.join(root, f)));
    if (hasIndicators) {
      return root;
    }

    return standardServerDir;
  }

  public getBedrockDir(): string {
    return path.join(this.config.rootPath, SUBDIRS.BEDROCK);
  }

  public resolvePath(...subpaths: string[]): string {
    if (subpaths.length > 0) {
      const fullSubpath = path.join(...subpaths);
      if (fullSubpath === 'server' || fullSubpath === SUBDIRS.SERVER) {
        return this.getServerDir();
      }
      if (fullSubpath.startsWith('server' + path.sep) || fullSubpath.startsWith('server/')) {
        const rel = fullSubpath.slice(7);
        return path.resolve(this.getServerDir(), rel);
      }
      if (fullSubpath === 'bedrock' || fullSubpath === SUBDIRS.BEDROCK) {
        return this.getBedrockDir();
      }
      if (fullSubpath.startsWith('bedrock' + path.sep) || fullSubpath.startsWith('bedrock/')) {
        const rel = fullSubpath.slice(8);
        return path.resolve(this.getBedrockDir(), rel);
      }
    }
    return path.resolve(this.config.rootPath, ...subpaths);
  }

  public ensureDirectoryStructure(): void {
    const root = this.config.rootPath;
    const serverDir = this.getServerDir();
    const bedrockDir = this.getBedrockDir();
    const dirs = [
      root,
      serverDir,
      path.join(serverDir, 'mods'),
      path.join(serverDir, 'logs'),
      bedrockDir,
      path.join(bedrockDir, 'logs'),
      path.join(root, SUBDIRS.PLAYIT),
      path.join(root, SUBDIRS.SCRIPTS),
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
        } catch (err) {
          console.warn(`Could not create directory ${dir}:`, err);
        }
      }
    }
  }

  public validateDirectories(targetPath?: string): {
    rootExists: boolean;
    serverExists: boolean;
    modsExists: boolean;
    logsExists: boolean;
    propertiesExists: boolean;
    playitExists: boolean;
    scriptsExists: boolean;
    bedrockExists: boolean;
  } {
    const root = targetPath ? path.resolve(targetPath) : this.config.rootPath;
    if (!this.isPathAllowed(root)) {
      throw new Error(`Path is outside the configured roots: ${root}`);
    }

    const serverDir = this.getServerDirForRoot(root);
    const bedrockDir = path.join(root, SUBDIRS.BEDROCK);
    return {
      rootExists: fs.existsSync(root),
      serverExists: fs.existsSync(serverDir),
      modsExists: fs.existsSync(path.join(serverDir, 'mods')),
      logsExists: fs.existsSync(path.join(serverDir, 'logs')),
      propertiesExists: fs.existsSync(path.join(serverDir, 'server.properties')),
      playitExists: fs.existsSync(path.join(root, SUBDIRS.PLAYIT)),
      scriptsExists: fs.existsSync(path.join(root, SUBDIRS.SCRIPTS)),
      bedrockExists: fs.existsSync(bedrockDir),
    };
  }

  public getAllowedRoots(): string[] {
    return (process.env.ALLOWED_ROOTS || '/data')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => path.resolve(entry));
  }

  public isPathAllowed(targetPath: string): boolean {
    const candidate = path.resolve(targetPath);
    if (!this.isLexicallyAllowed(candidate)) return false;

    try {
      const existingPath = this.findExistingAncestor(candidate);
      const realCandidate = fs.realpathSync(existingPath);
      return this.getAllowedRoots().some((allowedRoot) => {
        const realRoot = fs.existsSync(allowedRoot) ? fs.realpathSync(allowedRoot) : allowedRoot;
        return this.isWithin(realRoot, realCandidate);
      });
    } catch {
      return false;
    }
  }

  private getServerDirForRoot(root: string): string {
    const standardServerDir = path.join(root, SUBDIRS.SERVER);
    const indicators = ['server.properties', 'server.jar', 'libraries', 'run.sh', 'start.sh', 'eula.txt', 'world', 'version-info.json'];
    if (indicators.some((indicator) => fs.existsSync(path.join(root, indicator)))) return root;
    return standardServerDir;
  }

  private findExistingAncestor(candidate: string): string {
    let current = candidate;
    while (!fs.existsSync(current)) {
      const parent = path.dirname(current);
      if (parent === current) return current;
      current = parent;
    }
    return current;
  }

  private isWithin(base: string, candidate: string): boolean {
    const relative = path.relative(path.resolve(base), path.resolve(candidate));
    return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
  }

  private isLexicallyAllowed(candidate: string): boolean {
    return this.getAllowedRoots().some((allowedRoot) => this.isWithin(allowedRoot, candidate));
  }
}
