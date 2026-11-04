export interface PanelConfig {
  rootPath: string;
  port: number;
  jwtSecret: string;
  passwordHash: string;
  initialSetupDone: boolean;
  aiDiagnosticEnabled?: boolean;
  aiApiKey?: string;
  aiModel?: string;
}

export interface CrashDiagnostic {
  modName: string;
  error: string;
  solution: string;
  severity?: 'error' | 'warning';
  missingDependencies?: string[];
  details?: string[];
}

export interface ServerStatusResponse {
  isRunning: boolean;
  pid: number | null;
  status: 'online' | 'offline' | 'starting' | 'stopping' | 'crashed';
  state?: string;
  uptime: number;
  version?: string | null;
  serverDir?: string;
  cpu: {
    host: number;
    java: number;
  };
  hostCpu: number;
  ram: {
    used: number;
    total: number;
    percent: number;
    maxAllocated: number;
    systemUsed?: number;
    systemTotal?: number;
    systemPercent?: number;
  };
  disk: {
    used: number;
    total: number;
    free: number;
    percent: number;
    serverSizeMb?: number;
    serverSizeFormatted?: string;
  };
  tps: {
    current: number | null;
    avgTickMs?: number | null;
    history: number[];
  };
  players: {
    online: number;
    max: number;
    list: PlayerInfo[];
  };
  installedVersion?: any;
  controlError?: string | null;
  crashDiagnostic?: CrashDiagnostic | null;
  bedrock?: BedrockStatus;
}

export interface BedrockStatus {
  isInstalled: boolean;
  isRunning: boolean;
  pid: number | null;
  status: 'online' | 'offline' | 'starting' | 'stopping' | 'crashed';
  uptime: number;
  version: string | null;
  port: number;
  ipv6Port: number;
  players: {
    online: number;
    max: number;
    list: string[];
  };
  lastError?: string | null;
}

export interface PlayerInfo {
  name: string;
  uuid?: string;
  isOp?: boolean;
  opLevel?: number;
  avatarUrl?: string;
}

export interface ModItem {
  name: string;
  filename: string;
  size: number;
  modified: string;
  isEnabled: boolean;
}

export interface PlayitStatus {
  isRunning: boolean;
  pid: number | null;
  tunnels: PlayitTunnel[];
  publicAddress?: string;
  agentId?: string;
  binaryPath?: string | null;
  secretPath?: string;
  localPort?: number;
  lastError?: string | null;
  logs: string[];
}

export interface PlayitTunnel {
  id: string;
  name: string;
  proto: 'tcp' | 'udp';
  publicAddress: string;
  assignedDomain: string;
  publicPort: number;
  localPort: number;
}

export interface McVersionManifest {
  latest: {
    release: string;
    snapshot: string;
  };
  versions: {
    id: string;
    type: 'release' | 'snapshot';
    url: string;
    releaseTime: string;
  }[];
}

export interface InstalledVersionInfo {
  installed: boolean;
  mcVersion?: string;
  loader?: 'neoforge' | 'forge' | 'vanilla' | 'custom';
  loaderVersion?: string;
  javaVersion?: string;
  allocatedRamMin?: string;
  allocatedRamMax?: string;
  eulaAccepted: boolean;
  serverJarFound: boolean;
  runScriptFound: boolean;
  serverDir?: string;
  formattedVersion?: string;
}
