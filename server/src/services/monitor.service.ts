import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import si from 'systeminformation';
import pidusage from 'pidusage';
import os from 'os';
import { ConfigService } from './config.service';
import { ProcessService } from './process.service';
import { PropertiesService } from './properties.service';
import { VersionsService } from './versions.service';
import { BedrockProcessService } from './bedrock-process.service';
import { SUBDIRS } from '../config/constants';
import { PlayerInfo, ServerStatusResponse } from '../types';

export class MonitorService {
  private static instance: MonitorService;
  private configService: ConfigService;
  private processService: ProcessService;
  private propertiesService: PropertiesService;
  private versionsService: VersionsService;
  private bedrockProcessService: BedrockProcessService;
  private lastDiskCheck = 0;
  private cachedDiskSize: { mb: number; formatted: string } = { mb: 0, formatted: '0 MB' };

  private constructor() {
    this.configService = ConfigService.getInstance();
    this.processService = ProcessService.getInstance();
    this.propertiesService = PropertiesService.getInstance();
    this.versionsService = VersionsService.getInstance();
    this.bedrockProcessService = BedrockProcessService.getInstance();
  }

  public static getInstance(): MonitorService {
    if (!MonitorService.instance) MonitorService.instance = new MonitorService();
    return MonitorService.instance;
  }

  private getJavaPid(parentPid: number): number {
    try {
      const comm = execFileSync('ps', ['-p', String(parentPid), '-o', 'comm='], { encoding: 'utf-8' }).trim();
      if (comm.toLowerCase().includes('java')) return parentPid;
      const children = execFileSync('pgrep', ['-P', String(parentPid)], { encoding: 'utf-8' })
        .trim().split(/\s+/).map(Number).filter(Boolean);
      for (const childPid of children) {
        const childComm = execFileSync('ps', ['-p', String(childPid), '-o', 'comm='], { encoding: 'utf-8' }).trim();
        if (childComm.toLowerCase().includes('java')) return childPid;
        const nestedPid = this.getJavaPid(childPid);
        if (nestedPid !== childPid) return nestedPid;
      }
    } catch {}
    return parentPid;
  }

  private getMaxAllocatedRamMb(serverDir: string): number {
    const candidates = [path.join(serverDir, 'user_jvm_args.txt'), path.join(serverDir, 'run.sh'), this.configService.resolvePath(SUBDIRS.START_SCRIPT)];
    for (const candidate of candidates) {
      try {
        if (!fs.existsSync(candidate)) continue;
        const content = fs.readFileSync(candidate, 'utf8');
        const match = content.match(/-Xmx([0-9]+)([gGmM])/);
        if (!match) continue;
        const value = Number(match[1]);
        return match[2].toLowerCase() === 'g' ? value * 1024 : value;
      } catch {}
    }
    return 8192;
  }

  private getDirectorySize(dirPath: string): { mb: number; formatted: string } {
    const now = Date.now();
    if (this.lastDiskCheck > 0 && now - this.lastDiskCheck < 30000) {
      return this.cachedDiskSize;
    }
    try {
      if (fs.existsSync(dirPath)) {
        if (process.platform !== 'win32') {
          const output = execFileSync('du', ['-sm', dirPath], { encoding: 'utf8', timeout: 5000 });
          const match = output.trim().match(/^([0-9]+)/);
          if (match) {
            const mb = Number(match[1]);
            const formatted = mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb} MB`;
            this.cachedDiskSize = { mb, formatted };
            this.lastDiskCheck = now;
            return this.cachedDiskSize;
          }
        }
      }
    } catch {}
    return this.cachedDiskSize;
  }

  private getPlayersFromLog(serverDir: string): PlayerInfo[] {
    const logPath = path.join(serverDir, 'logs', 'latest.log');
    if (!fs.existsSync(logPath)) return [];
    try {
      const content = fs.readFileSync(logPath, 'utf8');
      const lines = content.split('\n');
      const playerMap = new Map<string, PlayerInfo>();
      for (const line of lines.slice(-2000)) {
        const joinMatch = line.match(/:\s*([a-zA-Z0-9_]{2,16})\s*\[.*\]\s*logged in with entity id/i)
          || line.match(/:\s*([a-zA-Z0-9_]{2,16}) joined the game/i);
        if (joinMatch) {
          playerMap.set(joinMatch[1], { name: joinMatch[1] });
          continue;
        }
        const leaveMatch = line.match(/:\s*([a-zA-Z0-9_]{2,16}) left the game/i)
          || line.match(/:\s*([a-zA-Z0-9_]{2,16}) lost connection/i);
        if (leaveMatch) {
          playerMap.delete(leaveMatch[1]);
        }
      }
      return Array.from(playerMap.values());
    } catch {
      return [];
    }
  }

  private getFilesystemUsage(targetDir: string): { total: number; used: number; free: number; percent: number } {
    try {
      if (fs.existsSync(targetDir) && typeof (fs as any).statfsSync === 'function') {
        const stats = (fs as any).statfsSync(targetDir);
        const total = Math.round((Number(stats.blocks) * Number(stats.bsize)) / (1024 * 1024 * 1024));
        const free = Math.round((Number(stats.bavail) * Number(stats.bsize)) / (1024 * 1024 * 1024));
        const used = Math.max(0, total - free);
        const percent = total > 0 ? Math.round((used / total) * 100) : 0;
        return { total, used, free, percent };
      }
    } catch {}
    return { total: 0, used: 0, free: 0, percent: 0 };
  }

  public async getStatus(): Promise<ServerStatusResponse> {
    const procStatus = await this.processService.getStatus();
    const serverDir = this.configService.getServerDir();
    const maxAllocatedRamMb = this.getMaxAllocatedRamMb(serverDir);

    let javaCpu = 0;
    let javaMemMb = 0;
    if (procStatus.isRunning && procStatus.pid) {
      try {
        const javaPid = this.getJavaPid(procStatus.pid);
        const stats = await pidusage(javaPid);
        javaCpu = Math.round(stats.cpu);
        javaMemMb = Math.round(stats.memory / (1024 * 1024));
      } catch {}
    }

    let hostCpu = 0;
    try {
      const load = await si.currentLoad();
      hostCpu = Math.round(load.currentLoad);
    } catch {
      const cpus = os.cpus();
      if (cpus.length > 0) {
        const idle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
        const total = cpus.reduce((acc, cpu) => acc + Object.values(cpu.times).reduce((a, b) => a + b, 0), 0);
        hostCpu = Math.max(0, Math.min(100, Math.round(100 - (idle / total) * 100)));
      }
    }

    const memTotal = Math.round(os.totalmem() / (1024 * 1024));
    const memFree = Math.round(os.freemem() / (1024 * 1024));
    const memUsed = Math.max(0, memTotal - memFree);
    const memPercent = memTotal > 0 ? Math.round((memUsed / memTotal) * 100) : 0;
    const ramPercent = maxAllocatedRamMb > 0 ? Math.min(100, Math.round((javaMemMb / maxAllocatedRamMb) * 100)) : 0;

    const serverDirSize = this.getDirectorySize(serverDir);
    const filesystem = this.getFilesystemUsage(serverDir);

    let maxPlayers = 0;
    const propertiesPath = this.configService.resolvePath(SUBDIRS.PROPERTIES);
    if (fs.existsSync(propertiesPath)) {
      try {
        const { properties } = this.propertiesService.getProperties();
        const configuredMax = Number(properties['max-players']);
        if (Number.isFinite(configuredMax)) maxPlayers = configuredMax;
      } catch {}
    }

    const playerList = procStatus.isRunning ? this.getPlayersFromLog(serverDir) : [];
    const installed = this.versionsService.getInstalledVersion();
    let displayVersion: string | null = null;
    if (installed.installed) {
      if (installed.formattedVersion) displayVersion = installed.formattedVersion;
      else if (installed.mcVersion && installed.loaderVersion) displayVersion = `Minecraft ${installed.mcVersion} (${installed.loader === 'neoforge' ? 'NeoForge' : installed.loader} ${installed.loaderVersion})`;
      else if (installed.mcVersion) displayVersion = `Minecraft ${installed.mcVersion} (${installed.loader === 'neoforge' ? 'NeoForge' : 'Vanilla'})`;
      else if (installed.loaderVersion) displayVersion = `NeoForge ${installed.loaderVersion}`;
    }

    let bedrockStatus;
    try {
      bedrockStatus = await this.bedrockProcessService.getStatus();
    } catch {}

    return {
      isRunning: procStatus.isRunning,
      state: procStatus.status,
      status: procStatus.status,
      pid: procStatus.pid,
      uptime: procStatus.uptime,
      controlError: procStatus.controlError || null,
      version: displayVersion,
      serverDir: installed.serverDir || serverDir,
      installedVersion: installed,
      cpu: { host: hostCpu, java: javaCpu },
      hostCpu,
      ram: {
        used: procStatus.isRunning ? javaMemMb : 0,
        total: memTotal,
        percent: ramPercent,
        maxAllocated: maxAllocatedRamMb,
        systemUsed: memUsed,
        systemTotal: memTotal,
        systemPercent: memPercent,
      },
      disk: {
        used: filesystem.used,
        total: filesystem.total,
        free: filesystem.free,
        percent: filesystem.percent,
        serverSizeMb: serverDirSize.mb,
        serverSizeFormatted: serverDirSize.formatted,
      },
      tps: { current: null, avgTickMs: null, history: [] },
      players: { online: playerList.length, max: maxPlayers, list: playerList },
      crashDiagnostic: procStatus.crashDiagnostic || null,
      bedrock: bedrockStatus,
    };
  }
}
