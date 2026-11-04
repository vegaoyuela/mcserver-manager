import fs from 'fs';
import path from 'path';
import { ConfigService } from './config.service';
import { SUBDIRS } from '../config/constants';

const DEFAULT_BEDROCK_PROPERTIES: Record<string, string> = {
  'server-name': 'MCServer Bedrock Dedicated',
  'gamemode': 'survival',
  'force-gamemode': 'false',
  'difficulty': 'normal',
  'allow-cheats': 'false',
  'max-players': '10',
  'online-mode': 'true',
  'allow-list': 'false',
  'server-port': '19132',
  'server-portv6': '19133',
  'view-distance': '32',
  'tick-distance': '4',
  'player-idle-timeout': '30',
  'max-threads': '8',
  'level-name': 'Bedrock level',
  'level-seed': '',
  'default-player-permission-level': 'member',
  'texturepack-required': 'false',
  'content-log-file-enabled': 'false',
  'compression-threshold': '1',
  'compression-algorithm': 'zlib',
  'server-authoritative-movement': 'server-auth',
  'player-movement-score-threshold': '20',
  'player-movement-action-direction-threshold': '0.85',
  'player-movement-distance-threshold': '0.3',
  'player-movement-duration-threshold-in-ms': '500',
  'correct-player-movement': 'false',
  'server-authoritative-block-breaking': 'false',
  'chat-restriction': 'None',
  'disable-player-interaction': 'false',
  'client-throttle-threshold': '0',
  'sync-chunk-writing': 'true',
  'emit-server-telemetry': 'false',
};

export class BedrockPropertiesService {
  private static instance: BedrockPropertiesService;
  private configService: ConfigService;

  private constructor() {
    this.configService = ConfigService.getInstance();
  }

  public static getInstance(): BedrockPropertiesService {
    if (!BedrockPropertiesService.instance) {
      BedrockPropertiesService.instance = new BedrockPropertiesService();
    }
    return BedrockPropertiesService.instance;
  }

  public getPropertiesPath(): string {
    return path.join(this.configService.getBedrockDir(), 'server.properties');
  }

  public ensurePropertiesFile(): void {
    const propPath = this.getPropertiesPath();
    if (!fs.existsSync(propPath)) {
      const dir = path.dirname(propPath);
      fs.mkdirSync(dir, { recursive: true });
      this.writeProperties(DEFAULT_BEDROCK_PROPERTIES);
    }
  }

  public readProperties(): { properties: Record<string, string>; raw: string } {
    this.ensurePropertiesFile();
    const propPath = this.getPropertiesPath();
    const content = fs.readFileSync(propPath, 'utf-8');
    const properties: Record<string, string> = {};

    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        properties[key] = value;
      }
    }

    return { properties, raw: content };
  }

  public writeProperties(newProps: Record<string, any>): void {
    const propPath = this.getPropertiesPath();
    const dir = path.dirname(propPath);
    fs.mkdirSync(dir, { recursive: true });

    let existingLines: string[] = [];
    if (fs.existsSync(propPath)) {
      existingLines = fs.readFileSync(propPath, 'utf-8').split(/\r?\n/);
    }

    const updatedKeys = new Set<string>();
    const outLines: string[] = [];

    for (const line of existingLines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        outLines.push(line);
        continue;
      }
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        if (key in newProps) {
          outLines.push(`${key}=${newProps[key]}`);
          updatedKeys.add(key);
        } else {
          outLines.push(line);
        }
      } else {
        outLines.push(line);
      }
    }

    // Append any newly added keys
    for (const [key, value] of Object.entries(newProps)) {
      if (!updatedKeys.has(key)) {
        outLines.push(`${key}=${value}`);
      }
    }

    const tmpPath = `${propPath}.tmp`;
    fs.writeFileSync(tmpPath, outLines.join('\n') + '\n', 'utf-8');
    fs.renameSync(tmpPath, propPath);
  }

  public getPort(): number {
    try {
      const { properties } = this.readProperties();
      const port = parseInt(properties['server-port'] || '19132', 10);
      return Number.isInteger(port) && port > 0 ? port : 19132;
    } catch {
      return 19132;
    }
  }

  public getIpv6Port(): number {
    try {
      const { properties } = this.readProperties();
      const port = parseInt(properties['server-portv6'] || '19133', 10);
      return Number.isInteger(port) && port > 0 ? port : 19133;
    } catch {
      return 19133;
    }
  }
}
