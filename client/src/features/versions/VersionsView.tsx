import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../../lib/api';
import {
  LocalNeoForgeItem,
  InstalledVersionInfo,
  MinecraftRelease,
  BedrockVersionsResponse,
} from '../../lib/types';
import { AnimatedTabs } from '../../components/rareui/AnimatedTab';
import { RareVersionsIcon, RareTerminalIcon } from '../../components/rareui/RareIcons';
import { InfoTip } from '../../components/common/InfoTip';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Upload,
  Cpu,
  Terminal,
  HardDrive,
  FileBox,
  Check,
  Zap,
  Copy,
  Search,
  Coffee,
  Boxes,
  Smartphone,
  Download,
} from 'lucide-react';

/**
 * Returns runtime requirements and compatibility recommendations for a given Minecraft version.
 */
function getCompatibilityInfo(mcVersion?: string | null) {
  if (!mcVersion) {
    return {
      java: 'Java 21 LTS',
      javaRequired: 'Java 21 LTS (Recomendada)',
      modsDirNotice: 'Los mods deben coincidir con la versión activa de Minecraft',
    };
  }

  const parts = mcVersion.split('.');
  const minor = parseInt(parts[1] || '0', 10);
  const patch = parseInt(parts[2] || '0', 10);

  if (minor >= 21 || (minor === 20 && patch >= 5)) {
    return {
      java: 'Java 21 LTS',
      javaRequired: 'Requiere OpenJDK 21 LTS',
      modsDirNotice: `Mods compatibles con Minecraft ${mcVersion}`,
    };
  } else if (minor >= 18) {
    return {
      java: 'Java 17 LTS',
      javaRequired: 'Requiere OpenJDK 17 LTS',
      modsDirNotice: `Mods compatibles con Minecraft ${mcVersion}`,
    };
  } else if (minor === 17) {
    return {
      java: 'Java 16',
      javaRequired: 'Requiere Java 16',
      modsDirNotice: `Mods compatibles con Minecraft ${mcVersion}`,
    };
  }
  return {
    java: 'Java 8 LTS',
    javaRequired: 'Requiere Java 8 LTS',
    modsDirNotice: `Mods compatibles con Minecraft ${mcVersion}`,
  };
}

export const VersionsView: React.FC = () => {
  const [engineTab, setEngineTab] = useState<'neoforge' | 'minecraft' | 'bedrock'>('neoforge');

  // Local NeoForge on disk
  const [localNeoForge, setLocalNeoForge] = useState<{
    versions: LocalNeoForgeItem[];
    activeVersion: string | null;
    serverDir?: string;
    detectedMinecraftVersion?: string | null;
  }>({ versions: [], activeVersion: null });
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [activatingVersion, setActivatingVersion] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');

  // File Upload & Drag-and-Drop State
  const [uploadingJar, setUploadingJar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ fileName: string; size: string } | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounterRef = useRef(0);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Minecraft Official Versions & Console
  const [installedInfo, setInstalledInfo] = useState<InstalledVersionInfo | null>(null);
  const [mcReleases, setMcReleases] = useState<MinecraftRelease[]>([]);
  const [loadingMc, setLoadingMc] = useState(false);
  const [selectedVanillaVersion, setSelectedVanillaVersion] = useState('');
  const [ramInitial, setRamInitial] = useState('4096M');
  const [ramMax, setRamMax] = useState('8192M');
  const [acceptEula, setAcceptEula] = useState(true);
  const [installingVanilla, setInstallingVanilla] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string | null>(null);
  const [copiedConsole, setCopiedConsole] = useState(false);
  const [executingCommand, setExecutingCommand] = useState(false);

  // Bedrock state
  const [bedrockCatalog, setBedrockCatalog] = useState<BedrockVersionsResponse | null>(null);
  const [selectedBedrockVersion, setSelectedBedrockVersion] = useState<string>('');
  const [bedrockSearchFilter, setBedrockSearchFilter] = useState<string>('');
  const [customBedrockUrl, setCustomBedrockUrl] = useState<string>('');
  const [showCustomUrlInput, setShowCustomUrlInput] = useState<boolean>(false);
  const [bedrockStatus, setBedrockStatus] = useState<{
    isInstalled: boolean;
    version: string | null;
    status: string;
    port: number;
    protocolVersion?: number;
    platform?: string;
  }>({ isInstalled: false, version: null, status: 'offline', port: 19132 });
  const [loadingBedrock, setLoadingBedrock] = useState(false);
  const [installingBedrock, setInstallingBedrock] = useState(false);

  useEffect(() => {
    loadLocalNeoForge();
    loadInstalledMetadata();
    loadMojangReleases();
    loadBedrockData();
  }, []);

  const loadLocalNeoForge = async () => {
    setLoadingLocal(true);
    try {
      const data = await api.getLocalNeoForgeVersions();
      setLocalNeoForge(data);
    } catch (err: any) {
      console.error('Error loading local NeoForge versions:', err);
    } finally {
      setLoadingLocal(false);
    }
  };

  const loadInstalledMetadata = async () => {
    try {
      const data = await api.getInstalledVersion();
      setInstalledInfo(data);
    } catch {
      setInstalledInfo(null);
    }
  };

  const loadMojangReleases = async () => {
    setLoadingMc(true);
    try {
      const versions = await api.getAvailableMinecraftVersions();
      setMcReleases(versions || []);
      if (versions && versions.length > 0) {
        setSelectedVanillaVersion(versions[0].id);
      }
    } catch (err) {
      console.warn('Could not fetch Mojang versions:', err);
    } finally {
      setLoadingMc(false);
    }
  };

  const loadBedrockData = async () => {
    setLoadingBedrock(true);
    try {
      const [statusRes, catalogRes] = await Promise.allSettled([
        (api as any).getBedrockStatus?.(),
        api.getBedrockVersions(),
      ]);

      if (statusRes.status === 'fulfilled' && statusRes.value) {
        setBedrockStatus(statusRes.value);
      }
      if (catalogRes.status === 'fulfilled' && catalogRes.value) {
        setBedrockCatalog(catalogRes.value);
        if (!selectedBedrockVersion) {
          const defaultVer =
            catalogRes.value.latest?.version ||
            catalogRes.value.versions?.[0]?.version ||
            '';
          setSelectedBedrockVersion(defaultVer);
        }
      }
    } catch (err) {
      console.warn('Error loading Bedrock data:', err);
    } finally {
      setLoadingBedrock(false);
    }
  };

  const handleActivateNeoForge = async (version: string) => {
    setActivatingVersion(version);
    try {
      await api.setActiveNeoForgeVersion(version);
      await loadLocalNeoForge();
      await loadInstalledMetadata();
      setUploadMessage({
        type: 'success',
        text: `Versión NeoForge ${version} activada con éxito en scripts/start.sh.`,
      });
    } catch (err: any) {
      setUploadMessage({
        type: 'error',
        text: err.message || `No se pudo activar la versión ${version}`,
      });
    } finally {
      setActivatingVersion(null);
    }
  };

  // Shared file processor for input change and drag-and-drop
  const processJarUpload = async (file: File) => {
    if (!file.name.endsWith('.jar')) {
      setUploadMessage({
        type: 'error',
        text: `El archivo "${file.name}" no es válido. Solo se admiten archivos con extensión .jar`,
      });
      return;
    }

    setUploadingJar(true);
    setUploadMessage(null);
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    setUploadProgress({ fileName: file.name, size: `${sizeMb} MB` });

    try {
      const res = await api.uploadNeoForgeJar(file);
      setUploadMessage({
        type: 'success',
        text: `Archivo "${file.name}" (${sizeMb} MB) procesado e instalado con éxito. Versión detectada y activada: ${res.version}`,
      });
      await loadLocalNeoForge();
      await loadInstalledMetadata();
    } catch (err: any) {
      setUploadMessage({
        type: 'error',
        text: err.message || `Error al procesar "${file.name}" en el servidor`,
      });
    } finally {
      setUploadingJar(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleJarFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processJarUpload(file);
  };

  // Whole-card drag and drop listeners
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      setIsDraggingOver(false);
      dragCounterRef.current = 0;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    dragCounterRef.current = 0;

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    await processJarUpload(files[0]);
  };

  const handleRunConsoleVersionCommand = async () => {
    setExecutingCommand(true);
    setConsoleOutput(null);
    try {
      await api.sendCommand('version');
      setConsoleOutput('Comando "/version" enviado a la consola del servidor. Revisa los logs en Consola en Vivo.');
    } catch (err: any) {
      setConsoleOutput(`Error al enviar comando: ${err.message || 'Servidor desconectado'}`);
    } finally {
      setExecutingCommand(false);
    }
  };

  const handleCopyConsole = async () => {
    if (!consoleOutput) return;
    try {
      await navigator.clipboard.writeText(consoleOutput);
      setCopiedConsole(true);
      setTimeout(() => setCopiedConsole(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleInstallVanilla = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptEula) {
      setUploadMessage({
        type: 'error',
        text: 'Debes aceptar el EULA de Mojang para instalar.',
      });
      return;
    }

    setInstallingVanilla(true);
    try {
      const res = await api.installServerVersion({
        serverType: 'vanilla',
        mcVersion: selectedVanillaVersion,
        javaVersion: 'Java 21 (JDK 21 LTS)',
        acceptEula,
        ramInitial,
        ramMax,
      });
      setUploadMessage({
        type: 'success',
        text: res.message || `Minecraft Vanilla ${selectedVanillaVersion} iniciado para instalación.`,
      });
      await loadInstalledMetadata();
    } catch (err: any) {
      setUploadMessage({
        type: 'error',
        text: err.message || 'Error al instalar Vanilla Minecraft',
      });
    } finally {
      setInstallingVanilla(false);
    }
  };

  const handleInstallBedrock = async () => {
    setInstallingBedrock(true);
    setUploadMessage(null);
    try {
      const payload: { version?: string; downloadUrl?: string } = {};
      if (showCustomUrlInput && customBedrockUrl.trim()) {
        payload.downloadUrl = customBedrockUrl.trim();
      } else if (selectedBedrockVersion) {
        payload.version = selectedBedrockVersion;
      }

      const res = await api.installBedrockServer(payload);
      setUploadMessage({
        type: 'success',
        text: res?.message || `Servidor Bedrock v${res.version} instalado y configurado correctamente en /data/bedrock.`,
      });
      await loadBedrockData();
    } catch (err: any) {
      setUploadMessage({
        type: 'error',
        text: err.message || 'Error al descargar o instalar Bedrock Dedicated Server',
      });
    } finally {
      setInstallingBedrock(false);
    }
  };

  // Filtered versions based on search query
  const filteredVersions = useMemo(() => {
    if (!searchQuery.trim()) return localNeoForge.versions;
    const q = searchQuery.toLowerCase().trim();
    return localNeoForge.versions.filter(
      (v) =>
        v.version.toLowerCase().includes(q) ||
        (v.mcVersion && v.mcVersion.toLowerCase().includes(q)) ||
        (v.jarFileName && v.jarFileName.toLowerCase().includes(q))
    );
  }, [localNeoForge.versions, searchQuery]);

  const activeCompat = getCompatibilityInfo(
    localNeoForge.detectedMinecraftVersion || installedInfo?.mcVersion || undefined
  );

  const tabs = [
    { id: 'neoforge', label: 'NeoForge', icon: <RareVersionsIcon size={16} /> },
    { id: 'minecraft', label: 'Vanilla (Mojang)', icon: <Cpu size={16} /> },
    { id: 'bedrock', label: 'Bedrock (BDS)', icon: <Smartphone size={16} /> },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-white/[0.08] bg-[#0b0f17]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <RareVersionsIcon size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-white tracking-tight">
                Versiones & Motores
              </h1>
              <InfoTip content="Administra binarios y versiones de ejecución para Minecraft Java (NeoForge / Vanilla) y Bedrock Dedicated Server." />
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            loadLocalNeoForge();
            loadInstalledMetadata();
            loadBedrockData();
          }}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-medium border border-white/[0.08] hover:border-white/20 flex items-center gap-2 transition-colors self-start sm:self-auto cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingLocal || loadingBedrock ? 'animate-spin' : ''}`} />
          <span>Escanear Raíz</span>
        </button>
      </div>

      {/* Notification Banner */}
      {uploadMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium transition-all ${
            uploadMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {uploadMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{uploadMessage.text}</span>
          </div>
          <button
            onClick={() => setUploadMessage(null)}
            className="text-slate-300 hover:text-white px-3 py-1 text-xs rounded-lg bg-white/[0.06] hover:bg-white/[0.1] transition-colors cursor-pointer min-h-[32px] flex items-center"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Active Version Overview Card */}
      <div className="rounded-2xl p-5 border border-white/[0.08] bg-[#0b0f17]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-3.5">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center border shrink-0 ${
                localNeoForge.activeVersion || installedInfo?.isInstalled
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              <RareVersionsIcon size={28} />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-slate-400">
                  Instancia Principal (Java / NeoForge)
                </span>
              </div>

              <div className="mt-1 flex items-center gap-3 flex-wrap">
                {localNeoForge.activeVersion || installedInfo?.loaderVersion ? (
                  <>
                    <span className="text-lg font-bold text-white font-mono flex items-center gap-2">
                      <span className="text-emerald-400">
                        Minecraft {localNeoForge.detectedMinecraftVersion || installedInfo?.mcVersion || 'Detectado'}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-cyan-400">
                        NeoForge {localNeoForge.activeVersion || installedInfo?.loaderVersion}
                      </span>
                    </span>
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                      <Zap className="w-3 h-3 text-emerald-400" />
                      ACTIVA
                    </span>
                  </>
                ) : installedInfo?.isInstalled ? (
                  <span className="text-base font-bold text-white font-mono">
                    Minecraft {installedInfo.mcVersion || 'Detectado'} ({installedInfo.serverType || 'Vanilla'})
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1.5 text-sm font-semibold">
                    <AlertTriangle className="w-4 h-4" />
                    No hay versión de NeoForge activada todavía en server/
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-400 font-mono mt-2 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Directorio:</span>
                  <code className="text-emerald-300 bg-black/40 px-2 py-0.5 rounded border border-white/[0.08]">
                    {localNeoForge.serverDir || installedInfo?.serverDir || '/data/server'}
                  </code>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-cyan-300 bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-500/20">
                  <Coffee className="w-3 h-3 text-cyan-400" />
                  <span>{activeCompat.java}</span>
                </div>

                {bedrockStatus.isInstalled && (
                  <div className="flex items-center gap-1 text-[11px] text-blue-300 bg-blue-950/30 px-2 py-0.5 rounded border border-blue-500/20">
                    <Smartphone className="w-3 h-3 text-blue-400" />
                    <span>Bedrock {bedrockStatus.version || 'Instalado'} (UDP {bedrockStatus.port})</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 text-xs font-mono self-start lg:self-auto">
            <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/[0.08] text-slate-300">
              <span className="text-slate-500 mr-1.5">Lanzador:</span>
              <span className="text-emerald-400 font-bold">
                {localNeoForge.activeVersion ? `neoforge-${localNeoForge.activeVersion}` : 'start.sh'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <AnimatedTabs
        tabs={tabs}
        activeTab={engineTab}
        onChange={(id) => setEngineTab(id as 'neoforge' | 'minecraft' | 'bedrock')}
        layoutId="versions-tab-selector"
      />

      {/* TAB 1: NEOFORGE (DISCO LOCAL & SUBIDA DE JAR) */}
      {engineTab === 'neoforge' && (
        <div className="space-y-6">
          {/* Subir archivo .jar de NeoForge con Drag-and-Drop en Toda la Tarjeta */}
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`rounded-2xl p-6 border transition-all relative overflow-hidden bg-[#0b0f17] ${
              isDraggingOver
                ? 'border-emerald-400 ring-2 ring-emerald-400/40 bg-emerald-950/20'
                : 'border-white/[0.08]'
            }`}
          >
            {/* Overlay visual cuando se arrastra un archivo */}
            {isDraggingOver && (
              <div className="absolute inset-0 bg-[#0b0f17]/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-emerald-400 rounded-2xl pointer-events-none animate-fadeIn">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 scale-105 transition-transform duration-300">
                  <Upload className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-white">¡Suelta el archivo .jar de NeoForge aquí!</p>
                  <p className="text-xs text-emerald-300 font-mono mt-0.5">
                    Se subirá e instalará automáticamente en el servidor
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Subir Archivo .JAR de NeoForge</span>
                </h3>
                <InfoTip content="Sube instaladores oficiales (-installer.jar) o ejecutables de servidor para instalarlos y activarlos automáticamente." />
              </div>
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f17] ${
                uploadingJar
                  ? 'border-emerald-500 bg-emerald-950/20'
                  : 'border-white/[0.12] hover:border-emerald-500/70 hover:bg-white/[0.02] bg-black/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".jar"
                className="hidden"
                onChange={handleJarFileSelected}
                disabled={uploadingJar}
              />

              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                {uploadingJar ? (
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                ) : (
                  <FileBox className="w-6 h-6 text-emerald-400" />
                )}
              </div>

              <div className="text-center space-y-1">
                <p className="text-xs font-semibold text-slate-200">
                  {uploadingJar && uploadProgress
                    ? `Subiendo "${uploadProgress.fileName}" (${uploadProgress.size})...`
                    : 'Arrastra un instalador .jar o haz clic para subir'}
                </p>
                <p className="text-[11px] text-slate-400 font-mono">
                  Admite instaladores (-installer.jar) o binarios ejecutables
                </p>
              </div>

              {!uploadingJar && (
                <span className="min-h-[44px] px-4 py-2.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-medium hover:bg-emerald-500/20 transition-colors flex items-center">
                  Seleccionar Archivo .jar
                </span>
              )}
            </div>
          </div>

          {/* Versiones de NeoForge detectadas en la raíz del servidor */}
          <div className="rounded-2xl p-6 border border-white/[0.08] bg-[#0b0f17] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">
                  Versiones de NeoForge Detectadas
                </h3>
                <InfoTip content="Librerías encontradas en server/libraries/net/neoforged/neoforge/ o binarios en la raíz." />
              </div>

              <div className="flex items-center gap-2.5">
                {/* Búsqueda rápida */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrar versión..."
                    className="min-h-[44px] pl-8 pr-3 py-1.5 bg-black/40 border border-white/[0.1] rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-36 sm:w-48"
                  />
                </div>

                <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-white/[0.04] text-slate-300 border border-white/[0.08] shrink-0">
                  {filteredVersions.length} de {localNeoForge.versions.length}
                </span>
              </div>
            </div>

            {loadingLocal ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                <span className="text-xs font-mono">Escaneando directorio del servidor...</span>
              </div>
            ) : filteredVersions.length === 0 ? (
              <div className="p-8 rounded-xl bg-black/20 border border-white/[0.06] text-center space-y-2">
                <RareVersionsIcon size={32} className="mx-auto text-slate-600" />
                <p className="text-xs text-slate-300 font-medium">
                  {searchQuery ? `No se encontraron versiones coincidentes con "${searchQuery}".` : 'No se encontraron versiones de NeoForge instaladas todavía.'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {searchQuery ? 'Prueba con otro término de búsqueda.' : 'Sube un instalador .jar arriba para comenzar.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredVersions.map((ver) => {
                  const isActive = ver.isActive;
                  const isBusy = activatingVersion === ver.version;
                  const itemCompat = getCompatibilityInfo(ver.mcVersion);

                  return (
                    <div
                      key={ver.version}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-4 ${
                        isActive
                          ? 'bg-emerald-950/20 border-emerald-500/40'
                          : 'bg-black/30 border-white/[0.06] hover:border-white/20'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-white font-mono">
                              NeoForge {ver.version}
                            </span>
                            {ver.mcVersion && (
                              <span className="text-xs text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                                Minecraft {ver.mcVersion}
                              </span>
                            )}
                            {isActive && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-semibold flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-400" />
                                ACTIVA
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-slate-400">
                            {ver.source === 'libraries' ? 'Librería Instalada' : 'Archivo .jar'}
                          </span>
                        </div>

                        {/* Fila de Compatibilidad & Entorno */}
                        <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
                          <span className="px-2 py-0.5 rounded bg-cyan-950/30 border border-cyan-500/20 text-cyan-300 flex items-center gap-1">
                            <Coffee className="w-3 h-3 text-cyan-400" />
                            {itemCompat.java}
                          </span>
                          {ver.mcVersion && (
                            <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-slate-300 flex items-center gap-1">
                              <Boxes className="w-3 h-3 text-emerald-400" />
                              Mods {ver.mcVersion}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 text-[11px] font-mono text-slate-400">
                          {ver.hasUnixArgs && (
                            <div className="flex items-center gap-1.5 text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>unix_args.txt disponible para arranque</span>
                            </div>
                          )}
                          {ver.jarFileName && (
                            <div className="text-slate-400 truncate">
                              Archivo: <span className="text-slate-200">{ver.jarFileName}</span>
                            </div>
                          )}
                          {ver.modified && (
                            <div className="text-slate-500 text-[10px]">
                              Modificado: {new Date(ver.modified).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-white/[0.08] flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          {isActive ? 'En ejecución por start.sh' : 'Inactiva (Lista para conmutar)'}
                        </span>

                        {isActive ? (
                          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-mono font-semibold flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5" />
                            <span>En Uso</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleActivateNeoForge(ver.version)}
                            disabled={isBusy}
                            className="min-h-[44px] px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                          >
                            {isBusy ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Zap className="w-3.5 h-3.5" />
                            )}
                            <span>{isBusy ? 'Activando...' : 'Activar Esta Versión'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MINECRAFT JAVA VANILLA & COMANDOS DE CONSOLA */}
      {engineTab === 'minecraft' && (
        <div className="space-y-6">
          {/* Comprobador de versión por Consola (/version) */}
          <div className="rounded-2xl p-6 border border-white/[0.08] bg-[#0b0f17] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">
                  Consultar Versión en Consola
                </h3>
                <InfoTip content="Ejecuta /version en vivo para comprobar la compilación y motor exactos del proceso." />
              </div>

              <button
                onClick={handleRunConsoleVersionCommand}
                disabled={executingCommand}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                {executingCommand ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RareTerminalIcon size={16} />
                )}
                <span>Ejecutar "/version"</span>
              </button>
            </div>

            {consoleOutput && (
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.08] font-mono text-xs text-emerald-400 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-hidden">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span className="truncate">{consoleOutput}</span>
                </div>
                <button
                  onClick={handleCopyConsole}
                  className="min-h-[32px] px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 text-[11px] font-sans flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                  title="Copiar salida de consola"
                >
                  {copiedConsole ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-400" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Versiones oficiales de Mojang en la Web */}
          <div className="rounded-2xl p-6 border border-white/[0.08] bg-[#0b0f17] space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">
                  Versiones Oficiales Mojang (Vanilla)
                </h3>
                <InfoTip content="Descargadas en tiempo real desde Mojang. Permite instalar una versión limpia sin mods." />
              </div>

              <span className="text-xs font-mono text-slate-400">
                {loadingMc ? 'Cargando de Mojang...' : `${mcReleases.length} versiones cargadas`}
              </span>
            </div>

            <form onSubmit={handleInstallVanilla} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 font-mono uppercase">
                    Versión de Minecraft Oficial
                  </label>
                  <select
                    value={selectedVanillaVersion}
                    onChange={(e) => setSelectedVanillaVersion(e.target.value)}
                    className="min-h-[44px] w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.1] rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500 font-mono cursor-pointer"
                  >
                    {mcReleases.map((v) => (
                      <option key={v.id} value={v.id}>
                        Minecraft {v.id} ({v.type}) - {v.releaseTime?.substring(0, 10)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 font-mono uppercase">
                      Asignación de Memoria RAM
                    </label>
                    {/* Presets rápidos de RAM */}
                    <div className="flex items-center gap-1 text-[10px] font-mono">
                      <button
                        type="button"
                        onClick={() => {
                          setRamInitial('2048M');
                          setRamMax('4096M');
                        }}
                        className="min-h-[28px] px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 border border-white/[0.06] cursor-pointer"
                      >
                        2G/4G
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRamInitial('4096M');
                          setRamMax('8192M');
                        }}
                        className="min-h-[28px] px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-emerald-400 border border-emerald-500/30 cursor-pointer"
                      >
                        4G/8G
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRamInitial('8192M');
                          setRamMax('12288M');
                        }}
                        className="min-h-[28px] px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 border border-white/[0.06] cursor-pointer"
                      >
                        8G/12G
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={ramInitial}
                      onChange={(e) => setRamInitial(e.target.value)}
                      placeholder="4096M"
                      className="min-h-[44px] px-3 py-2 bg-black/40 border border-white/[0.1] rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      value={ramMax}
                      onChange={(e) => setRamMax(e.target.value)}
                      placeholder="8192M"
                      className="min-h-[44px] px-3 py-2 bg-black/40 border border-white/[0.1] rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={acceptEula}
                    onChange={(e) => setAcceptEula(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-0 focus:ring-offset-0 bg-black/50 border-white/[0.2] cursor-pointer"
                  />
                  <span>Acepto el Contrato de Licencia de Usuario Final (EULA) de Mojang</span>
                </label>

                <button
                  type="submit"
                  disabled={installingVanilla || !selectedVanillaVersion || !acceptEula}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  {installingVanilla ? 'Descargando Vanilla...' : `Instalar Vanilla ${selectedVanillaVersion}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: MINECRAFT BEDROCK (BDS OFICIAL) */}
      {engineTab === 'bedrock' && (
        <div className="space-y-6">
          <div className="rounded-2xl p-6 border border-white/[0.08] bg-[#0b0f17] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Smartphone size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">
                      Minecraft Bedrock Dedicated Server (BDS)
                    </h3>
                    <InfoTip content="Servidor oficial Mojang en C++ nativo para Windows 10/11, consolas y dispositivos móviles en puerto UDP 19132." />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Descarga, instala o cambia de versión oficial de Minecraft Bedrock
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border ${
                    bedrockStatus.isInstalled
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                      : 'bg-slate-800 border-white/[0.08] text-slate-400'
                  }`}
                >
                  {bedrockStatus.isInstalled
                    ? `INSTALADO (v${bedrockStatus.version || bedrockCatalog?.installed?.version || 'Detectada'})`
                    : 'NO INSTALADO'}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/[0.04] text-slate-400 border border-white/[0.08]">
                  {bedrockCatalog?.installed?.platform === 'win32'
                    ? 'Plataforma: Windows (bin-win)'
                    : 'Plataforma: Linux (bin-linux)'}
                </span>
              </div>
            </div>

            {/* Status Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-1">
                <span className="text-slate-400 font-medium">Puerto de Red</span>
                <p className="text-white font-mono font-semibold text-sm">UDP {bedrockStatus.port || 19132}</p>
                <span className="text-[11px] text-slate-500">Protocolo nativo Bedrock RakNet</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-1">
                <span className="text-slate-400 font-medium">Ruta de Instalación</span>
                <p className="text-emerald-400 font-mono text-xs">
                  {bedrockCatalog?.installed?.serverDir || '/data/bedrock'}
                </p>
                <span className="text-[11px] text-slate-500">Directorio de mundos y binarios BDS</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-1">
                <span className="text-slate-400 font-medium">Túnel Anycast</span>
                <p className="text-cyan-400 font-mono text-xs">Playit.gg UDP (19132)</p>
                <span className="text-[11px] text-slate-500">Dual tunnel simultáneo con Java</span>
              </div>
            </div>

            {/* Version Selection & Installation Card */}
            <div className="p-5 rounded-xl bg-black/30 border border-white/[0.06] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-400" />
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                    Elegir Versión de Bedrock a Instalar
                  </h4>
                  <InfoTip content="Selecciona la versión específica de Bedrock que deseas ejecutar. El servidor descargará automáticamente los binarios nativos oficiales de Mojang (.exe en Windows o binario Linux) y conservará todas tus propiedades y mundos." />
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {loadingBedrock
                    ? 'Consultando catálogo...'
                    : `${bedrockCatalog?.versions?.length || 0} versiones oficiales disponibles`}
                </span>
              </div>

              {/* Version Selector Dropdown & Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 font-mono uppercase">
                    Versión Oficial Mojang
                  </label>
                  <select
                    value={selectedBedrockVersion}
                    onChange={(e) => setSelectedBedrockVersion(e.target.value)}
                    disabled={installingBedrock || loadingBedrock}
                    className="min-h-[44px] w-full px-3.5 py-2.5 bg-black/50 border border-white/[0.1] rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 font-mono cursor-pointer disabled:opacity-50"
                  >
                    {(!bedrockCatalog || bedrockCatalog.versions.length === 0) ? (
                      <option value="1.26.61.1">Cargando versiones oficiales de Mojang...</option>
                    ) : (
                      bedrockCatalog.versions.map((item) => (
                        <option key={item.version} value={item.version}>
                          Minecraft Bedrock {item.version}
                          {item.isLatest ? ' ★ (Última Versión Estable Recomendada)' : ''}
                          {item.isPreview ? ' ⚡ (Vista Previa / Beta)' : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 font-mono uppercase">
                    Filtrar Lista
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={bedrockSearchFilter}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBedrockSearchFilter(val);
                        // If filter matches a version, select it
                        if (bedrockCatalog?.versions) {
                          const match = bedrockCatalog.versions.find((v) =>
                            v.version.toLowerCase().includes(val.toLowerCase().trim())
                          );
                          if (match) setSelectedBedrockVersion(match.version);
                        }
                      }}
                      placeholder="Ej: 1.21, 1.26..."
                      className="min-h-[44px] w-full pl-8 pr-3 py-2 bg-black/50 border border-white/[0.1] rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Version Details & Actions */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs text-white font-mono flex items-center gap-2">
                    <span className="text-blue-400 font-bold">Seleccionada:</span>
                    <span className="font-semibold text-sm">v{selectedBedrockVersion || '1.26.61.1'}</span>
                    {selectedBedrockVersion === bedrockCatalog?.latest?.version && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                        Estable
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Origen: Mojang Azure CDN oficial (
                    {bedrockCatalog?.installed?.platform === 'win32' ? 'Windows bin-win' : 'Linux bin-linux'}
                    ) · Respaldos de server.properties automáticos
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleInstallBedrock}
                  disabled={installingBedrock || !selectedBedrockVersion}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-blue-600/20 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  {installingBedrock ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Instalando Bedrock v{selectedBedrockVersion}...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>
                        {bedrockStatus.isInstalled
                          ? `Actualizar a Bedrock v${selectedBedrockVersion}`
                          : `Descargar e Instalar v${selectedBedrockVersion}`}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Advanced: Custom URL Toggle */}
              <div className="pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowCustomUrlInput(!showCustomUrlInput)}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer font-mono"
                >
                  <span>{showCustomUrlInput ? '▲ Ocultar URL personalizada' : '▼ Ingresar URL de descarga personalizada (.zip)...'}</span>
                </button>

                {showCustomUrlInput && (
                  <div className="mt-3 space-y-2">
                    <input
                      type="text"
                      value={customBedrockUrl}
                      onChange={(e) => setCustomBedrockUrl(e.target.value)}
                      placeholder="https://www.minecraft.net/bedrockdedicatedserver/bin-win/bedrock-server-..."
                      className="min-h-[44px] w-full px-3.5 py-2 bg-black/50 border border-white/[0.1] rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[11px] text-slate-400">
                      Si especificas una URL personalizada, el instalador descargará y extraerá directamente ese archivo .zip.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
