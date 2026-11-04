import {
  TelemetryData,
  OpPlayer,
  WhitelistPlayer,
  BannedPlayer,
  BannedIp,
  ModFile,
  PlayitStatus,
  PanelSettings,
  UserSession,
  InstalledVersionInfo,
  MinecraftRelease,
  LoaderRelease,
  InstallVersionPayload,
  FilesResponse,
  LocalNeoForgeItem,
  BedrockStatus,
  BedrockPacksResponse,
  BedrockVersionsResponse,
} from './types';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mc_auth_token') : null;
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    if (res.status === 401 && !url.includes('/api/auth/login')) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('mc_auth_token');
        localStorage.removeItem('mc_auth_user');
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('mc_auth_unauthorized'));
      }
    }

    let errorMsg = `Error HTTP ${res.status}`;
    try {
      const text = await res.text();
      try {
        const errJson = JSON.parse(text);
        if (errJson.message) errorMsg = errJson.message;
        else if (errJson.error) errorMsg = errJson.error;
      } catch {
        if (text && text.trim().length > 0) {
          if (text.includes('<html') || text.includes('<!doctype html>')) {
            errorMsg = `El servidor backend no está respondiendo (HTTP ${res.status})`;
          } else {
            errorMsg = text.length > 200 ? text.slice(0, 200) : text;
          }
        }
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await res.json();
  }
  return {} as T;
}

export const api = {
  // Auth
  login: async (password: string): Promise<{ success: boolean; token?: string }> => {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },
  getMe: async (): Promise<UserSession> => {
    return request('/api/auth/me', { method: 'GET' });
  },
  logout: async (): Promise<{ success: boolean }> => {
    return request('/api/auth/logout', { method: 'POST' });
  },
  changePassword: async (currentPassword: string, newPassword: string): Promise<{ success: boolean }> => {
    return request('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // Status & Telemetry
  getStatus: async (): Promise<TelemetryData> => {
    return request('/api/status', { method: 'GET' });
  },

  // Server Actions
  executeServerAction: async (action: 'start' | 'stop' | 'restart' | 'kill'): Promise<{ success: boolean; message: string }> => {
    const result = await request<{ success: boolean; message: string }>('/api/server/action', {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
    if (!result.success) {
      throw new Error(result.message || 'El servidor rechazó la acción solicitada');
    }
    return result;
  },

  // AI Diagnostic
  triggerAiDiagnosis: async (): Promise<{ success: boolean; diagnostic?: any; message?: string }> => {
    return request('/api/status/diagnose-ai', {
      method: 'POST',
    });
  },

  // Server console command
  sendCommand: async (command: string): Promise<{ success: boolean; response?: string }> => {
    return request('/api/server/command', {
      method: 'POST',
      body: JSON.stringify({ command }),
    });
  },

  // Versions & Loaders
  getInstalledVersion: async (): Promise<InstalledVersionInfo> => {
    return request('/api/versions/installed', { method: 'GET' });
  },
  getAvailableMinecraftVersions: async (): Promise<MinecraftRelease[]> => {
    return request('/api/versions/minecraft', { method: 'GET' });
  },
  getAvailableLoaderVersions: async (type: string, mcVersion: string): Promise<LoaderRelease[]> => {
    return request(`/api/versions/loaders?type=${encodeURIComponent(type)}&mcVersion=${encodeURIComponent(mcVersion)}`, {
      method: 'GET',
    });
  },
  installServerVersion: async (payload: InstallVersionPayload): Promise<{ success: boolean; message: string }> => {
    return request('/api/versions/install', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Server Properties
  getProperties: async (): Promise<{ properties: Record<string, any>; raw: string }> => {
    return request('/api/properties', { method: 'GET' });
  },
  saveProperties: async (props: Record<string, any>): Promise<{ success: boolean; message: string }> => {
    return request('/api/properties', {
      method: 'PUT',
      body: JSON.stringify({ properties: props }),
    });
  },

  // Players
  getOps: async (): Promise<OpPlayer[]> => {
    return request('/api/players/ops', { method: 'GET' });
  },
  addOp: async (name: string, level = 4): Promise<OpPlayer> => {
    return request('/api/players/ops', {
      method: 'POST',
      body: JSON.stringify({ name, level }),
    });
  },
  removeOp: async (uuid: string): Promise<{ success: boolean }> => {
    return request(`/api/players/ops/${encodeURIComponent(uuid)}`, {
      method: 'DELETE',
    });
  },

  getWhitelist: async (): Promise<WhitelistPlayer[]> => {
    return request('/api/players/whitelist', { method: 'GET' });
  },
  addWhitelist: async (name: string): Promise<WhitelistPlayer> => {
    return request(`/api/players/whitelist/${encodeURIComponent(name)}`, {
      method: 'POST',
    });
  },
  removeWhitelist: async (name: string): Promise<{ success: boolean }> => {
    return request(`/api/players/whitelist/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
  },

  getBans: async (): Promise<{ players: BannedPlayer[]; ips: BannedIp[] }> => {
    return request('/api/players/bans', { method: 'GET' });
  },
  unbanPlayer: async (name: string): Promise<{ success: boolean }> => {
    return request(`/api/players/bans/player/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
  },
  unbanIp: async (ip: string): Promise<{ success: boolean }> => {
    return request(`/api/players/bans/ip/${encodeURIComponent(ip)}`, {
      method: 'DELETE',
    });
  },
  kickPlayer: async (name: string, reason?: string): Promise<{ success: boolean }> => {
    return request('/api/players/kick', {
      method: 'POST',
      body: JSON.stringify({ name, reason }),
    });
  },

  // Mods
  getMods: async (): Promise<ModFile[]> => {
    return request('/api/mods', { method: 'GET' });
  },
  downloadEnabledMods: async (): Promise<{ blob: Blob; filename: string }> => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mc_auth_token') : null;
    const res = await fetch('/api/mods/download-enabled', {
      method: 'GET',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      let errorMsg = `Error al descargar mods: HTTP ${res.status}`;
      try {
        const payload = await res.json();
        if (payload?.error) errorMsg = payload.error;
      } catch {}
      throw new Error(errorMsg);
    }

    const disposition = res.headers.get('content-disposition') || '';
    const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || 'minecraft-mods-enabled.zip';
    return { blob: await res.blob(), filename };
  },
  toggleMod: async (filename: string, enable: boolean): Promise<{ success: boolean }> => {
    return request('/api/mods/toggle', {
      method: 'PATCH',
      body: JSON.stringify({ filename, enable }),
    });
  },
  deleteMod: async (filename: string): Promise<{ success: boolean }> => {
    return request(`/api/mods/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });
  },
  renameMod: async (oldFilename: string, newFilename: string): Promise<{ success: boolean }> => {
    return request('/api/mods/rename', {
      method: 'PATCH',
      body: JSON.stringify({ oldFilename, newFilename }),
    });
  },
  disableAllMods: async (): Promise<{ success: boolean; count: number }> => {
    return request('/api/mods/disable-all', {
      method: 'POST',
    });
  },
  deleteAllMods: async (): Promise<{ success: boolean; count: number }> => {
    return request('/api/mods/delete-all', {
      method: 'POST',
    });
  },
  uploadMod: async (file: File): Promise<{ success: boolean; filename: string }> => {
    return api.uploadModWithProgress(file);
  },
  uploadModWithProgress: async (
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<{ success: boolean; filename: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mc_auth_token') : null;
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/mods/upload');
      xhr.withCredentials = true;
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
      };

      xhr.onerror = () => reject(new Error('No se pudo conectar con el servidor para subir el mod'));
      xhr.onabort = () => reject(new Error('La subida del mod fue cancelada'));
      xhr.onload = () => {
        let payload: any = null;
        try {
          payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        } catch {
          payload = null;
        }

        if (xhr.status < 200 || xhr.status >= 300) {
          if (xhr.status === 401 && typeof window !== 'undefined') {
            window.dispatchEvent(new Event('mc_auth_unauthorized'));
          }
          reject(new Error(payload?.error || `Error al subir mod: HTTP ${xhr.status}`));
          return;
        }

        onProgress?.(100);
        resolve(payload || { success: true, filename: file.name });
      };

      xhr.send(formData);
    });
  },

  // Playit
  getPlayitStatus: async (): Promise<PlayitStatus> => {
    return request('/api/playit/status', { method: 'GET' });
  },
  getPlayitConfig: async (): Promise<{
    configured: boolean;
    localPort: number;
    bedrockLocalPort: number;
    secretPath: string;
    binaryPath: string | null;
  }> => {
    return request('/api/playit/config', { method: 'GET' });
  },
  savePlayitConfig: async (config: { localPort?: number; bedrockLocalPort?: number }): Promise<{
    success: boolean;
    localPort: number;
    bedrockLocalPort: number;
  }> => {
    return request('/api/playit/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  },
  linkPlayit: async (secret: string): Promise<{ success: boolean; message: string }> => {
    return request('/api/playit/link', {
      method: 'POST',
      body: JSON.stringify({ secret }),
    });
  },
  executePlayitAction: async (action: 'start' | 'stop' | 'restart'): Promise<{ success: boolean; message: string }> => {
    return request('/api/playit/action', {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  },

  // Settings
  getSettings: async (): Promise<PanelSettings> => {
    return request('/api/settings', { method: 'GET' });
  },
  updateSettings: async (settings: Partial<PanelSettings>): Promise<{ success: boolean; settings: PanelSettings }> => {
    return request('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  },
  validatePath: async (path: string): Promise<{ exists: boolean; paths: any }> => {
    return request('/api/settings/validate-path', {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  },
  browseDirectories: async (path?: string): Promise<{
    success: boolean;
    exists: boolean;
    currentPath: string;
    parentPath: string | null;
    directories: { name: string; path: string; isMinecraftCandidate: boolean }[];
    hasMinecraftFiles: boolean;
    shortcuts: { label: string; path: string; exists: boolean }[];
    isDocker?: boolean;
    storageReady?: boolean;
    error?: string;
  }> => {
    return request('/api/settings/browse-dirs', {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  },

  // Local NeoForge Discovery, Upload & Activation
  getLocalNeoForgeVersions: async (): Promise<{
    versions: LocalNeoForgeItem[];
    activeVersion: string | null;
    serverDir?: string;
    detectedMinecraftVersion?: string | null;
  }> => {
    return request('/api/versions/neoforge/local', { method: 'GET' });
  },
  setActiveNeoForgeVersion: async (version: string): Promise<{ success: boolean; activeVersion: string }> => {
    return request('/api/versions/neoforge/active', {
      method: 'POST',
      body: JSON.stringify({ version }),
    });
  },
  uploadNeoForgeJar: async (file: File): Promise<{ success: boolean; message: string; version: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mc_auth_token') : null;
    const res = await fetch('/api/versions/neoforge/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Error al subir NeoForge: HTTP ${res.status}`);
    }
    return await res.json();
  },

  // File Manager / Explorer
  getFiles: async (path = ''): Promise<FilesResponse> => {
    return request(`/api/files?path=${encodeURIComponent(path)}`, { method: 'GET' });
  },
  getFileContent: async (path: string): Promise<{ path: string; content: string }> => {
    return request(`/api/files/content?path=${encodeURIComponent(path)}`, { method: 'GET' });
  },
  saveFileContent: async (path: string, content: string): Promise<{ success: boolean; message: string }> => {
    return request('/api/files/content', {
      method: 'PUT',
      body: JSON.stringify({ path, content }),
    });
  },
  uploadFiles: async (targetPath: string, files: File[]): Promise<{ success: boolean; files: string[] }> => {
    const formData = new FormData();
    for (const f of files) {
      formData.append('files', f);
    }
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mc_auth_token') : null;
    const res = await fetch(`/api/files/upload?path=${encodeURIComponent(targetPath)}`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Error al subir archivo: HTTP ${res.status}`);
    }
    return await res.json();
  },
  createDirectory: async (targetPath: string, name: string): Promise<{ success: boolean; path: string }> => {
    return request('/api/files/mkdir', {
      method: 'POST',
      body: JSON.stringify({ path: targetPath, name }),
    });
  },
  renameItem: async (oldPath: string, newName: string): Promise<{ success: boolean }> => {
    return request('/api/files/rename', {
      method: 'POST',
      body: JSON.stringify({ oldPath, newName }),
    });
  },
  deleteItem: async (path: string): Promise<{ success: boolean }> => {
    return request(`/api/files?path=${encodeURIComponent(path)}`, { method: 'DELETE' });
  },

  // Bedrock Dedicated Server (BDS) Endpoints
  getBedrockStatus: async (): Promise<BedrockStatus> => {
    return request('/api/bedrock/status', { method: 'GET' });
  },
  executeBedrockAction: async (action: 'start' | 'stop' | 'restart'): Promise<{ success: boolean; message: string }> => {
    const result = await request<{ success: boolean; message: string }>('/api/bedrock/action', {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
    if (!result.success) {
      throw new Error(result.message || 'El servidor Bedrock rechazó la acción solicitada');
    }
    return result;
  },
  sendBedrockCommand: async (command: string): Promise<{ success: boolean; message?: string }> => {
    return request('/api/bedrock/command', {
      method: 'POST',
      body: JSON.stringify({ command }),
    });
  },
  getBedrockProperties: async (): Promise<{ properties: Record<string, any>; raw: string }> => {
    return request('/api/bedrock/properties', { method: 'GET' });
  },
  saveBedrockProperties: async (properties: Record<string, any>): Promise<{ success: boolean; message: string }> => {
    return request('/api/bedrock/properties', {
      method: 'PUT',
      body: JSON.stringify({ properties }),
    });
  },
  getBedrockVersions: async (): Promise<BedrockVersionsResponse> => {
    return request('/api/bedrock/versions', { method: 'GET' });
  },
  installBedrockServer: async (payload?: {
    version?: string;
    downloadUrl?: string;
  }): Promise<{ success: boolean; version: string; message: string }> => {
    return request('/api/bedrock/install', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  },

  // Bedrock Packs & Add-ons (RP, BP, MCPACK, MCADDON)
  getBedrockPacks: async (): Promise<BedrockPacksResponse> => {
    return request('/api/bedrock/packs', { method: 'GET' });
  },
  toggleBedrockPack: async (
    uuid: string,
    type: 'resource' | 'behavior',
    enable: boolean
  ): Promise<{ success: boolean; isActive: boolean; message: string }> => {
    return request(`/api/bedrock/packs/${type}/${encodeURIComponent(uuid)}/toggle`, {
      method: 'PUT',
      body: JSON.stringify({ enable }),
    });
  },
  deleteBedrockPack: async (
    type: 'resource' | 'behavior',
    folderName: string
  ): Promise<{ success: boolean; message: string }> => {
    return request(`/api/bedrock/packs/${type}/${encodeURIComponent(folderName)}`, {
      method: 'DELETE',
    });
  },
  uploadBedrockPacks: async (
    files: File[],
    onProgress?: (percent: number) => void
  ): Promise<{ success: boolean; installedPacks: string[]; message: string }> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      for (const file of files) {
        formData.append('files', file);
      }

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/bedrock/packs/upload');
      xhr.withCredentials = true;
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mc_auth_token') : null;
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress?.(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onerror = () => reject(new Error('No se pudo conectar con el servidor para subir packs'));
      xhr.onabort = () => reject(new Error('La subida fue cancelada'));
      xhr.onload = () => {
        let payload: any = null;
        try {
          payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        } catch {
          payload = null;
        }

        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new Error(payload?.error || payload?.message || `Error al subir packs: HTTP ${xhr.status}`));
          return;
        }

        onProgress?.(100);
        resolve(payload || { success: true, installedPacks: [], message: 'Packs subidos con éxito' });
      };

      xhr.send(formData);
    });
  },
};
