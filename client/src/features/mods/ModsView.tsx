import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { ModFile, BedrockPackInfo, BedrockPacksResponse } from '../../lib/types';
import { useModUpload } from './ModUploadContext';
import { Modal } from '../../components/common/Modal';
import { AnimatedTabs } from '../../components/rareui/AnimatedTab';
import { GlassShimmerButton } from '../../components/rareui/GlassShimmerButton';
import { HoldButton } from '../../components/rareui/HoldButton';
import { RareModsIcon } from '../../components/rareui/RareIcons';
import { InfoTip } from '../../components/common/InfoTip';
import {
  UploadCloud,
  Search,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit3,
  FileCheck,
  AlertTriangle,
  RefreshCw,
  X,
  PowerOff,
  Download,
  Package,
  Palette,
  Cpu,
  Check,
  RotateCw,
} from 'lucide-react';

interface ModsViewProps {
  telemetry?: any;
}

type ModsEngineMode = 'java' | 'bedrock';
type BedrockFilterMode = 'all' | 'resource' | 'behavior' | 'active';

export const ModsView: React.FC<ModsViewProps> = ({ telemetry }) => {
  // Engine switch: Java vs Bedrock
  const [engineMode, setEngineMode] = useState<ModsEngineMode>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('mc_mods_engine_mode') as ModsEngineMode;
      if (saved === 'java' || saved === 'bedrock') return saved;
    }
    return 'java';
  });

  const handleEngineModeChange = (id: string) => {
    const next = id as ModsEngineMode;
    setEngineMode(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mc_mods_engine_mode', next);
    }
  };

  // ----------------------------------------------------
  // JAVA MODS STATE
  // ----------------------------------------------------
  const [mods, setMods] = useState<ModFile[]>([]);
  const [loadingMods, setLoadingMods] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  const errorModName = telemetry?.crashDiagnostic?.modName?.toLowerCase() || '';

  // Notification and Restart State
  const [notice, setNotice] = useState<{
    type: 'warning' | 'error' | 'success';
    message: string;
  } | null>(null);
  const [restarting, setRestarting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Upload state (Java)
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { jobs: uploadJobs, enqueue: enqueueModUploads } = useModUpload();
  const previousUploadStates = useRef<Record<string, string>>({});

  // Modals (Java)
  const [modToDelete, setModToDelete] = useState<ModFile | null>(null);
  const [modToRename, setModToRename] = useState<ModFile | null>(null);
  const [newFilename, setNewFilename] = useState('');

  // ----------------------------------------------------
  // BEDROCK PACKS STATE
  // ----------------------------------------------------
  const [bedrockPacks, setBedrockPacks] = useState<BedrockPackInfo[]>([]);
  const [bedrockStats, setBedrockStats] = useState({
    total: 0,
    resourceCount: 0,
    behaviorCount: 0,
    activeCount: 0,
  });
  const [loadingBedrock, setLoadingBedrock] = useState(false);
  const [bedrockFilter, setBedrockFilter] = useState<BedrockFilterMode>('all');
  const [bedrockSearch, setBedrockSearch] = useState('');
  const [isDraggingBedrock, setIsDraggingBedrock] = useState(false);
  const [bedrockUploading, setBedrockUploading] = useState(false);
  const [bedrockUploadProgress, setBedrockUploadProgress] = useState(0);
  const [bedrockNotice, setBedrockNotice] = useState<{
    type: 'warning' | 'error' | 'success';
    message: string;
  } | null>(null);
  const [restartingBedrock, setRestartingBedrock] = useState(false);
  const bedrockFileInputRef = useRef<HTMLInputElement>(null);
  const [packToDelete, setPackToDelete] = useState<BedrockPackInfo | null>(null);

  // Load Java Mods
  useEffect(() => {
    loadMods();
  }, []);

  // Load Bedrock Packs
  useEffect(() => {
    loadBedrockPacks();
  }, []);

  // Synchronize background uploads for Java
  useEffect(() => {
    let shouldRefresh = false;
    for (const job of uploadJobs) {
      const previousState = previousUploadStates.current[job.id];
      if (previousState === 'uploading' && (job.state === 'completed' || job.state === 'error')) {
        shouldRefresh = true;
      }
      previousUploadStates.current[job.id] = job.state;
    }
    if (shouldRefresh) void loadMods(true);
  }, [uploadJobs]);

  // ----------------------------------------------------
  // JAVA HANDLERS
  // ----------------------------------------------------
  const loadMods = async (silent = false) => {
    if (!silent) setLoadingMods(true);
    try {
      const data = await api.getMods();
      const normalized = (data || []).map((m: any) => ({
        ...m,
        filename: m.filename || m.name,
        name: m.name || m.filename,
      }));
      setMods(normalized);
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.message || 'Error al cargar la lista de mods de Java',
      });
    } finally {
      if (!silent) setLoadingMods(false);
    }
  };

  const handleToggleMod = async (mod: ModFile) => {
    const nextState = !mod.isEnabled;
    const target = mod.filename || mod.name;
    try {
      await api.toggleMod(target, nextState);
      setNotice({
        type: 'warning',
        message: `"${mod.name}" ${nextState ? 'activado' : 'desactivado'}. Reinicia el servidor Java para aplicarlo.`,
      });
      await loadMods(true);
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.message || 'Error al cambiar estado del mod',
      });
    }
  };

  const handleDisableAllMods = async () => {
    try {
      const res = await api.disableAllMods();
      setMods((prev) =>
        prev.map((m) => {
          const fn = m.filename.endsWith('.disabled') ? m.filename : `${m.filename}.disabled`;
          return {
            ...m,
            isEnabled: false,
            filename: fn,
            name: fn,
          };
        })
      );
      setNotice({
        type: 'warning',
        message: `${res.count || mods.length} mods desactivados. Reinicia el servidor Java para aplicarlos.`,
      });
      await loadMods(true);
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.message || 'Error al desactivar los mods',
      });
    }
  };

  const handleDeleteAllMods = async () => {
    try {
      const res = await api.deleteAllMods();
      const count = res.count || mods.length;
      setMods([]);
      setNotice({
        type: 'warning',
        message: `${count} mods eliminados. Reinicia el servidor para aplicar los cambios.`,
      });
      await loadMods(true);
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.message || 'Error al eliminar todos los mods',
      });
    }
  };

  const handleDelete = async () => {
    if (!modToDelete) return;
    const target = modToDelete.filename || modToDelete.name;
    try {
      await api.deleteMod(target);
      setNotice({
        type: 'warning',
        message: `"${modToDelete.name}" eliminado. Reinicia el servidor para aplicar los cambios.`,
      });
      setModToDelete(null);
      await loadMods(true);
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.message || 'Error al eliminar el mod',
      });
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modToRename || !newFilename.trim()) return;
    const target = modToRename.filename || modToRename.name;
    try {
      await api.renameMod(target, newFilename.trim());
      setNotice({
        type: 'warning',
        message: `Mod renombrado a "${newFilename.trim()}". Reinicia el servidor para aplicarlo.`,
      });
      setModToRename(null);
      setNewFilename('');
      await loadMods(true);
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.message || 'Error al renombrar el mod',
      });
    }
  };

  const handleQuickRestart = async () => {
    setRestarting(true);
    try {
      await api.executeServerAction('restart');
      setNotice({
        type: 'success',
        message: 'Reiniciando el servidor Minecraft Java para aplicar los cambios de mods...',
      });
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.message || 'Error al reiniciar el servidor Java',
      });
    } finally {
      setRestarting(false);
    }
  };

  const handleDownloadEnabled = async () => {
    setDownloading(true);
    try {
      const { blob, filename } = await api.downloadEnabledMods();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice({
        type: 'success',
        message: `Descarga preparada con ${enabledCount} mod(s) habilitado(s).`,
      });
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.message || 'No se pudieron descargar los mods habilitados',
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const validFiles = Array.from(files).filter(
      (f) => f.name.endsWith('.jar') || f.name.endsWith('.jar.disabled')
    );
    if (validFiles.length === 0) {
      setNotice({ type: 'error', message: 'Selecciona archivos .jar o .jar.disabled.' });
      return;
    }

    enqueueModUploads(validFiles);
    setNotice({
      type: 'success',
      message: `${validFiles.length} mod(s) añadidos a la cola de subida. Puedes cambiar de sección sin interrumpirla.`,
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTimeout(() => loadMods(true), 500);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const filteredMods = mods.filter((mod) => {
    const q = search.toLowerCase();
    const matchesSearch =
      (mod.name && mod.name.toLowerCase().includes(q)) ||
      (mod.filename && mod.filename.toLowerCase().includes(q));
    if (filter === 'enabled') return matchesSearch && mod.isEnabled;
    if (filter === 'disabled') return matchesSearch && !mod.isEnabled;
    return matchesSearch;
  });

  const enabledCount = mods.filter((m) => m.isEnabled).length;
  const disabledCount = mods.filter((m) => !m.isEnabled).length;
  const activeUploadJobs = uploadJobs.filter((job) => job.state === 'queued' || job.state === 'uploading');
  const activeUploadBytes = activeUploadJobs.reduce((sum, job) => sum + job.uploadedBytes, 0);
  const totalUploadBytes = activeUploadJobs.reduce((sum, job) => sum + job.size, 0);
  const uploadProgress = totalUploadBytes > 0 ? Math.round((activeUploadBytes / totalUploadBytes) * 100) : 0;

  // ----------------------------------------------------
  // BEDROCK HANDLERS
  // ----------------------------------------------------
  const loadBedrockPacks = async (silent = false) => {
    if (!silent) setLoadingBedrock(true);
    try {
      const res: BedrockPacksResponse = await api.getBedrockPacks();
      setBedrockPacks(res.packs || []);
      setBedrockStats({
        total: res.total || 0,
        resourceCount: res.resourceCount || 0,
        behaviorCount: res.behaviorCount || 0,
        activeCount: res.activeCount || 0,
      });
    } catch (err: any) {
      setBedrockNotice({
        type: 'error',
        message: err.message || 'Error al cargar los add-ons y packs de Bedrock',
      });
    } finally {
      if (!silent) setLoadingBedrock(false);
    }
  };

  const handleBedrockUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);

    const validExtensions = ['.mcpack', '.mcaddon', '.rp', '.bp', '.zip'];
    const validFiles = fileList.filter((f) =>
      validExtensions.some((ext) => f.name.toLowerCase().endsWith(ext))
    );

    if (validFiles.length === 0) {
      setBedrockNotice({
        type: 'error',
        message: 'Formato no soportado. Sube archivos .mcpack, .mcaddon, .rp, .bp o .zip.',
      });
      return;
    }

    setBedrockUploading(true);
    setBedrockUploadProgress(0);
    setBedrockNotice(null);

    try {
      const res = await api.uploadBedrockPacks(validFiles, (percent) => {
        setBedrockUploadProgress(percent);
      });

      const installedCount = res.installedPacks ? res.installedPacks.length : validFiles.length;
      setBedrockNotice({
        type: 'success',
        message: `${installedCount} add-on/pack(s) instalado(s) con éxito en BDS. Actívalos en el mundo y reinicia el servidor.`,
      });
      await loadBedrockPacks(true);
    } catch (err: any) {
      setBedrockNotice({
        type: 'error',
        message: err.message || 'Error al subir los packs de Bedrock',
      });
    } finally {
      setBedrockUploading(false);
      if (bedrockFileInputRef.current) bedrockFileInputRef.current.value = '';
    }
  };

  const handleToggleBedrockPack = async (pack: BedrockPackInfo) => {
    const nextActive = !pack.isActiveInWorld;
    try {
      await api.toggleBedrockPack(pack.uuid, pack.type, nextActive);
      setBedrockNotice({
        type: 'warning',
        message: `Pack "${pack.name}" ${nextActive ? 'activado' : 'desactivado'} en el mundo de Bedrock. Reinicia BDS para aplicar.`,
      });
      await loadBedrockPacks(true);
    } catch (err: any) {
      setBedrockNotice({
        type: 'error',
        message: err.message || 'Error al cambiar la activación del pack en el mundo',
      });
    }
  };

  const handleDeleteBedrockPack = async () => {
    if (!packToDelete) return;
    try {
      await api.deleteBedrockPack(packToDelete.type, packToDelete.folderName);
      setBedrockNotice({
        type: 'warning',
        message: `Pack "${packToDelete.name}" eliminado de ${packToDelete.type === 'resource' ? 'Resource Packs' : 'Behavior Packs'}.`,
      });
      setPackToDelete(null);
      await loadBedrockPacks(true);
    } catch (err: any) {
      setBedrockNotice({
        type: 'error',
        message: err.message || 'Error al eliminar el pack',
      });
    }
  };

  const handleQuickRestartBedrock = async () => {
    setRestartingBedrock(true);
    try {
      await api.executeBedrockAction('restart');
      setBedrockNotice({
        type: 'success',
        message: 'Reiniciando el servidor Bedrock Dedicated Server...',
      });
    } catch (err: any) {
      setBedrockNotice({
        type: 'error',
        message: err.message || 'Error al reiniciar el servidor Bedrock',
      });
    } finally {
      setRestartingBedrock(false);
    }
  };

  // Filtered Bedrock Packs
  const filteredBedrockPacks = bedrockPacks.filter((pack) => {
    const q = bedrockSearch.toLowerCase();
    const matchesSearch =
      (pack.name && pack.name.toLowerCase().includes(q)) ||
      (pack.description && pack.description.toLowerCase().includes(q)) ||
      (pack.folderName && pack.folderName.toLowerCase().includes(q)) ||
      (pack.uuid && pack.uuid.toLowerCase().includes(q));

    if (bedrockFilter === 'resource') return matchesSearch && pack.type === 'resource';
    if (bedrockFilter === 'behavior') return matchesSearch && pack.type === 'behavior';
    if (bedrockFilter === 'active') return matchesSearch && pack.isActiveInWorld;
    return matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Engine Switcher at the very top: Java vs Bedrock */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Gestor de Contenido y Modificaciones</span>
            <InfoTip content="Administra mods Java (.jar con NeoForge) o Add-ons Bedrock (.rp, .bp, .mcpack y .mcaddon) con activación en mundos y carátulas originales." />
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Alterna entre el motor de mods Java o los Add-ons oficiales de Bedrock
          </p>
        </div>

        <AnimatedTabs
          tabs={[
            {
              id: 'java',
              label: 'Mods Java (NeoForge .jar)',
              badge: `${mods.length}`,
              icon: <RareModsIcon size={16} />,
            },
            {
              id: 'bedrock',
              label: 'Add-ons Bedrock (RP / BP / .mcpack)',
              badge: `${bedrockStats.total}`,
              icon: <Package className="w-4 h-4 text-purple-400" />,
            },
          ]}
          activeTab={engineMode}
          onChange={handleEngineModeChange}
          layoutId="mods-engine-mode-tabs"
        />
      </div>

      {/* ========================================================== */}
      {/* 1. JAVA MODS VIEW                                          */}
      {/* ========================================================== */}
      {engineMode === 'java' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="bg-[#0b0f17] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <RareModsIcon size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-white tracking-tight">Gestor de Mods Java</h2>
                  <InfoTip content="Gestiona mods NeoForge en /server/mods. Activa (.jar), desactiva (.jar.disabled) y sube archivos en bloque." />
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-mono border border-emerald-500/25">
                    {mods.length} mods
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Archivos compatibles con NeoForge / Fabric en formato .jar
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {mods.length > 0 && (
                <>
                  <HoldButton
                    variant="amber"
                    size="sm"
                    holdDurationMs={1500}
                    icon={<PowerOff className="w-3.5 h-3.5" />}
                    label="Desactivar todos"
                    holdingLabel="Mantén presionado..."
                    completedLabel="Desactivando..."
                    onConfirm={handleDisableAllMods}
                  />
                  <HoldButton
                    variant="danger"
                    size="sm"
                    holdDurationMs={2000}
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    label="Eliminar todos"
                    holdingLabel="Mantén presionado..."
                    completedLabel="Eliminando..."
                    onConfirm={handleDeleteAllMods}
                  />
                </>
              )}

              <GlassShimmerButton
                variant="cyan"
                size="sm"
                onClick={handleDownloadEnabled}
                disabled={downloading || enabledCount === 0}
                title={enabledCount === 0 ? 'No hay mods habilitados' : 'Descargar mods habilitados'}
              >
                {downloading ? (
                  <div className="w-4 h-4 border-2 border-cyan-200/30 border-t-cyan-200 rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{downloading ? 'Preparando…' : 'Descargar activos'}</span>
              </GlassShimmerButton>

              <GlassShimmerButton
                variant="emerald"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="w-4 h-4" />
                <span>Subir Mods (.jar)</span>
              </GlassShimmerButton>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jar,.disabled"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {/* Notice Banner */}
          <AnimatePresence>
            {notice && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                className={`rounded-xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  notice.type === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    : notice.type === 'error'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div
                    className={`p-2 rounded-lg shrink-0 mt-0.5 sm:mt-0 ${
                      notice.type === 'warning'
                        ? 'bg-amber-500/20 text-amber-400'
                        : notice.type === 'error'
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {notice.type === 'warning' ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : notice.type === 'error' ? (
                      <XCircle className="w-4 h-4" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold">{notice.message}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  {notice.type === 'warning' && (
                    <GlassShimmerButton
                      variant="amber"
                      size="sm"
                      onClick={handleQuickRestart}
                      disabled={restarting}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${restarting ? 'animate-spin' : ''}`} />
                      <span>{restarting ? 'Reiniciando...' : 'Reiniciar Servidor'}</span>
                    </GlassShimmerButton>
                  )}
                  <motion.button
                    onClick={() => setNotice(null)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Cerrar aviso"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Drag and Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={`p-6 rounded-xl border-2 border-dashed text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
                : 'border-white/[0.1] bg-[#070a0f] hover:border-emerald-500/40 hover:bg-[#0b0f17]'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-10 h-10 mx-auto rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-emerald-400 mb-2">
              <UploadCloud className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-white">
              Arrastra y suelta tus archivos <span className="font-mono text-emerald-400">.jar</span> aquí
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              O selecciona varios archivos desde tu explorador
            </p>
          </div>

          {/* Upload Progress Bar */}
          {activeUploadJobs.length > 0 && (
            <div className="bg-[#0b0f17] rounded-xl p-4 border border-white/[0.08] space-y-3">
              <span className="text-xs font-semibold text-emerald-400 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  <span>Subiendo mods Java</span>
                </div>
                <span className="text-slate-300 font-mono text-[11px]">
                  {activeUploadJobs.length} pendientes · {uploadProgress}%
                </span>
              </span>
              <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Filters and search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <AnimatedTabs
              tabs={[
                { id: 'all', label: 'Todos', badge: mods.length },
                {
                  id: 'enabled',
                  label: 'Activos',
                  badge: enabledCount,
                  icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
                },
                {
                  id: 'disabled',
                  label: 'Inactivos',
                  badge: disabledCount,
                  icon: <XCircle className="w-3.5 h-3.5 text-rose-400" />,
                },
              ]}
              activeTab={filter}
              onChange={(id) => setFilter(id as any)}
              layoutId="mods-filter-tabs"
            />

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar por nombre..."
                className="w-full pl-9 pr-3 py-2 bg-[#0b0f17] border border-white/[0.1] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 font-mono"
              />
            </div>
          </div>

          {/* Mods Table */}
          <div className="bg-[#0b0f17] rounded-xl overflow-hidden border border-white/[0.08]">
            {loadingMods ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p>Cargando lista de mods Java...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#070a0f] text-slate-400 font-mono uppercase text-[11px] border-b border-white/[0.08]">
                    <tr>
                      <th className="p-3.5">Estado</th>
                      <th className="p-3.5">Archivo</th>
                      <th className="p-3.5">Tamaño</th>
                      <th className="p-3.5">Actualizado</th>
                      <th className="p-3.5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {filteredMods.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          No se encontraron mods que coincidan con la búsqueda
                        </td>
                      </tr>
                    ) : (
                      filteredMods.map((mod) => {
                        const fileKey = mod.filename || mod.name;
                        const errorModNames = errorModName
                          ? errorModName.split(',').map((n: string) => n.trim())
                          : [];
                        const isErrorMod = errorModNames.some(
                          (name: string) =>
                            mod.name.toLowerCase() === name ||
                            mod.filename.toLowerCase() === `${name}.jar` ||
                            mod.filename.toLowerCase().startsWith(`${name}-`) ||
                            mod.filename.toLowerCase().startsWith(`${name} `)
                        );
                        const isWarning =
                          isErrorMod && telemetry?.crashDiagnostic?.severity === 'warning';

                        return (
                          <tr
                            key={fileKey}
                            className={`transition-colors group ${
                              isErrorMod
                                ? isWarning
                                  ? 'bg-amber-500/10 hover:bg-amber-500/20'
                                  : 'bg-rose-500/10 hover:bg-rose-500/20'
                                : 'hover:bg-white/[0.02]'
                            }`}
                          >
                            <td className="p-3.5">
                              <button
                                onClick={() => handleToggleMod(mod)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  mod.isEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                                }`}
                                title={mod.isEnabled ? 'Mod activo (.jar)' : 'Mod inactivo (.jar.disabled)'}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                    mod.isEnabled ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </td>

                            <td className="p-3.5">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`p-1.5 rounded-lg ${
                                    isErrorMod
                                      ? isWarning
                                        ? 'bg-amber-500/20 text-amber-400'
                                        : 'bg-rose-500/20 text-rose-400'
                                      : mod.isEnabled
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-white/[0.04] text-slate-500 border border-white/[0.06]'
                                  }`}
                                >
                                  <FileCheck className="w-4 h-4" />
                                </div>
                                <div>
                                  <span
                                    className={`font-semibold text-xs flex items-center gap-2 ${
                                      isErrorMod
                                        ? isWarning
                                          ? 'text-amber-400'
                                          : 'text-rose-400'
                                        : mod.isEnabled
                                        ? 'text-white'
                                        : 'text-slate-400 line-through'
                                    }`}
                                  >
                                    {mod.name}
                                    {isErrorMod && (
                                      <span
                                        className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${
                                          isWarning
                                            ? 'bg-amber-500/20 text-amber-300'
                                            : 'bg-rose-500/20 text-rose-300'
                                        }`}
                                      >
                                        {isWarning ? 'Advertencia' : 'Error Detectado'}
                                      </span>
                                    )}
                                  </span>
                                  {mod.filename && mod.filename !== mod.name && (
                                    <span className="text-[11px] font-mono text-slate-500 block">
                                      {mod.filename}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="p-3.5 font-mono text-slate-400 text-[11px]">
                              {formatFileSize(mod.size)}
                            </td>

                            <td className="p-3.5 font-mono text-slate-500 text-[11px]">
                              {mod.modified}
                            </td>

                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <motion.button
                                  onClick={() => {
                                    setModToRename(mod);
                                    setNewFilename(fileKey);
                                  }}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-white/[0.06] transition-colors cursor-pointer"
                                  title="Renombrar archivo"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </motion.button>

                                <motion.button
                                  onClick={() => setModToDelete(mod)}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  title="Eliminar mod"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </motion.button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 2. BEDROCK ADD-ONS & PACKS VIEW                            */}
      {/* ========================================================== */}
      {engineMode === 'bedrock' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="bg-[#0b0f17] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-white/[0.08]">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-semibold text-white tracking-tight">
                    Add-ons y Packs Bedrock (BDS)
                  </h2>
                  <InfoTip content="Sube paquetes de texturas (.rp / Resource Packs) o mecánicas (.bp / Behavior Packs). Los archivos .mcpack y .mcaddon se descomprimen e inspeccionan automáticamente." />
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 font-mono border border-purple-500/30">
                    {bedrockStats.total} packs
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap font-mono">
                  <span className="text-emerald-400 font-semibold">{bedrockStats.resourceCount} RP</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-purple-400 font-semibold">{bedrockStats.behaviorCount} BP</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-cyan-400 font-semibold">{bedrockStats.activeCount} Activos en Mundo</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => loadBedrockPacks()}
                disabled={loadingBedrock}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium border border-white/[0.08] flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                title="Recargar lista de packs desde disco"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingBedrock ? 'animate-spin' : ''}`} />
                <span>Refrescar</span>
              </button>

              <GlassShimmerButton
                variant="emerald"
                size="sm"
                onClick={() => bedrockFileInputRef.current?.click()}
                disabled={bedrockUploading}
              >
                <UploadCloud className="w-4 h-4" />
                <span>Subir Add-on (.mcpack / .rp / .bp)</span>
              </GlassShimmerButton>
            </div>

            <input
              ref={bedrockFileInputRef}
              type="file"
              multiple
              accept=".mcpack,.mcaddon,.rp,.bp,.zip"
              className="hidden"
              onChange={(e) => handleBedrockUpload(e.target.files)}
            />
          </div>

          {/* Bedrock Notice Banner */}
          <AnimatePresence>
            {bedrockNotice && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                className={`rounded-xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  bedrockNotice.type === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    : bedrockNotice.type === 'error'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div
                    className={`p-2 rounded-lg shrink-0 mt-0.5 sm:mt-0 ${
                      bedrockNotice.type === 'warning'
                        ? 'bg-amber-500/20 text-amber-400'
                        : bedrockNotice.type === 'error'
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {bedrockNotice.type === 'warning' ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : bedrockNotice.type === 'error' ? (
                      <XCircle className="w-4 h-4" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold">{bedrockNotice.message}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  {bedrockNotice.type === 'warning' && (
                    <button
                      type="button"
                      onClick={handleQuickRestartBedrock}
                      disabled={restartingBedrock}
                      className="min-h-[44px] px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${restartingBedrock ? 'animate-spin' : ''}`} />
                      <span>{restartingBedrock ? 'Reiniciando BDS...' : 'Reiniciar Servidor BDS'}</span>
                    </button>
                  )}
                  <motion.button
                    onClick={() => setBedrockNotice(null)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Cerrar aviso"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bedrock Drag & Drop Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingBedrock(true);
            }}
            onDragLeave={() => setIsDraggingBedrock(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingBedrock(false);
              handleBedrockUpload(e.dataTransfer.files);
            }}
            className={`p-6 sm:p-7 rounded-xl border-2 border-dashed text-center transition-all cursor-pointer ${
              isDraggingBedrock
                ? 'border-purple-500 bg-purple-500/10 scale-[1.01]'
                : 'border-white/[0.1] bg-[#070a0f] hover:border-purple-500/40 hover:bg-[#0b0f17]'
            }`}
            onClick={() => bedrockFileInputRef.current?.click()}
          >
            <div className="w-12 h-12 mx-auto rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-2.5">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-white">
              Arrastra archivos <span className="font-mono text-purple-300">.mcpack</span>,{' '}
              <span className="font-mono text-purple-300">.mcaddon</span>,{' '}
              <span className="font-mono text-purple-300">.rp</span>,{' '}
              <span className="font-mono text-purple-300">.bp</span> o{' '}
              <span className="font-mono text-purple-300">.zip</span> aquí
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-xl mx-auto">
              El motor extrae y analiza automáticamente el <code className="font-mono text-slate-300">manifest.json</code>,
              clasifica los paquetes de recursos o comportamientos y extrae la carátula original del pack.
            </p>
          </div>

          {/* Upload Progress Bar (Bedrock) */}
          {bedrockUploading && (
            <div className="bg-[#0b0f17] rounded-xl p-4 border border-white/[0.08] space-y-3">
              <span className="text-xs font-semibold text-purple-400 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  <span>Procesando y descomprimiendo Add-ons Bedrock...</span>
                </div>
                <span className="text-slate-300 font-mono text-[11px]">{bedrockUploadProgress}%</span>
              </span>
              <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-purple-500 h-full transition-all duration-300"
                  style={{ width: `${bedrockUploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Bedrock Filters and Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <AnimatedTabs
              tabs={[
                { id: 'all', label: 'Todos', badge: bedrockStats.total },
                {
                  id: 'resource',
                  label: 'Resource Packs (RP)',
                  badge: bedrockStats.resourceCount,
                  icon: <Palette className="w-3.5 h-3.5 text-emerald-400" />,
                },
                {
                  id: 'behavior',
                  label: 'Behavior Packs (BP)',
                  badge: bedrockStats.behaviorCount,
                  icon: <Cpu className="w-3.5 h-3.5 text-purple-400" />,
                },
                {
                  id: 'active',
                  label: 'Activos en Mundo',
                  badge: bedrockStats.activeCount,
                  icon: <Check className="w-3.5 h-3.5 text-cyan-400" />,
                },
              ]}
              activeTab={bedrockFilter}
              onChange={(id) => setBedrockFilter(id as any)}
              layoutId="bedrock-filter-tabs"
            />

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={bedrockSearch}
                onChange={(e) => setBedrockSearch(e.target.value)}
                placeholder="Buscar por nombre, UUID..."
                className="w-full pl-9 pr-3 py-2 bg-[#0b0f17] border border-white/[0.1] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 font-mono"
              />
            </div>
          </div>

          {/* Bedrock Pack Cards Grid (Orderly, Visual and Appealing) */}
          {loadingBedrock ? (
            <div className="bg-[#0b0f17] rounded-xl p-12 text-center text-slate-400 text-xs border border-white/[0.08]">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p>Cargando Add-ons y Packs de Bedrock...</p>
            </div>
          ) : filteredBedrockPacks.length === 0 ? (
            <div className="bg-[#0b0f17] rounded-xl p-12 text-center border border-white/[0.08] space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white">No hay packs que coincidan con la búsqueda</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Sube tus archivos <span className="font-mono text-purple-300">.mcpack</span>,{' '}
                <span className="font-mono text-purple-300">.mcaddon</span>,{' '}
                <span className="font-mono text-purple-300">.rp</span> o{' '}
                <span className="font-mono text-purple-300">.bp</span> para instalarlos en el servidor Bedrock.
              </p>
              <div className="pt-2">
                <GlassShimmerButton
                  variant="cyan"
                  size="sm"
                  onClick={() => bedrockFileInputRef.current?.click()}
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Subir primer Add-on</span>
                </GlassShimmerButton>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBedrockPacks.map((pack) => {
                const isResource = pack.type === 'resource';

                return (
                  <motion.div
                    key={`${pack.type}-${pack.uuid}`}
                    whileHover={{ y: -2 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    className={`bg-[#0b0f17] rounded-xl border p-4.5 flex flex-col justify-between transition-colors shadow-sm ${
                      pack.isActiveInWorld
                        ? isResource
                          ? 'border-emerald-500/40 hover:border-emerald-500/60 shadow-emerald-500/5'
                          : 'border-purple-500/40 hover:border-purple-500/60 shadow-purple-500/5'
                        : 'border-white/[0.08] hover:border-white/[0.16]'
                    }`}
                  >
                    {/* Top Row: Thumbnail + Title + Badges */}
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        {/* Artwork Thumbnail */}
                        {pack.iconBase64 ? (
                          <img
                            src={pack.iconBase64}
                            alt={pack.name}
                            className="w-14 h-14 rounded-lg object-cover border border-white/10 shrink-0 bg-black/40 shadow-sm"
                          />
                        ) : (
                          <div
                            className={`w-14 h-14 rounded-lg flex items-center justify-center shrink-0 border ${
                              isResource
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                            }`}
                          >
                            {isResource ? <Palette className="w-6 h-6" /> : <Cpu className="w-6 h-6" />}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            {isResource ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                <Palette className="w-3 h-3" />
                                <span>Resource Pack (RP)</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider font-mono bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                <Cpu className="w-3 h-3" />
                                <span>Behavior Pack (BP)</span>
                              </span>
                            )}
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-300 border border-white/[0.08]">
                              v{pack.version}
                            </span>
                          </div>

                          <h3
                            className="text-sm font-bold text-white tracking-tight truncate"
                            title={pack.name}
                          >
                            {pack.name}
                          </h3>

                          <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5" title={pack.folderName}>
                            {pack.folderName}
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      <p
                        className="text-xs text-slate-300 line-clamp-2 leading-relaxed bg-[#070a0f] p-2.5 rounded-lg border border-white/[0.05]"
                        title={pack.description}
                      >
                        {pack.description || 'Sin descripción provista en el manifest.json.'}
                      </p>

                      {/* Metadata Chips */}
                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                          {pack.sizeFormatted}
                        </span>
                        {pack.minEngineVersion && (
                          <span className="px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-500/30">
                            Mín: MC {pack.minEngineVersion}
                          </span>
                        )}
                        <span className="text-slate-500 truncate max-w-[150px]" title={pack.uuid}>
                          UUID: {pack.uuid}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between gap-2">
                      {/* World Active Toggle Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleBedrockPack(pack)}
                        className={`min-h-[44px] flex-1 px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                          pack.isActiveInWorld
                            ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-white/[0.04] text-slate-400 border-white/[0.08] hover:bg-white/[0.08] hover:text-slate-200'
                        }`}
                        title={
                          pack.isActiveInWorld
                            ? 'Pack activo en world_resource_packs.json o world_behavior_packs.json'
                            : 'Click para activar este pack en el mundo'
                        }
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            pack.isActiveInWorld ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                          }`}
                        />
                        <span>{pack.isActiveInWorld ? 'Activo en Mundo' : 'Inactivo en Mundo'}</span>
                      </button>

                      {/* Delete Pack Button */}
                      <motion.button
                        type="button"
                        onClick={() => setPackToDelete(pack)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/[0.08] hover:border-rose-500/40 transition-colors cursor-pointer"
                        title="Eliminar este pack de disco"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Delete Bedrock Pack Confirmation Modal */}
          <Modal
            isOpen={Boolean(packToDelete)}
            onClose={() => setPackToDelete(null)}
            title="Eliminar Add-on / Pack de Bedrock"
          >
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                ¿Estás seguro de que deseas eliminar permanentemente el pack{' '}
                <strong className="text-rose-400 font-semibold">{packToDelete?.name}</strong>?
              </p>
              <div className="p-3 rounded-lg bg-[#070a0f] border border-white/[0.08] space-y-1 font-mono text-[11px] text-slate-400">
                <div>Tipo: {packToDelete?.type === 'resource' ? 'Resource Pack (RP)' : 'Behavior Pack (BP)'}</div>
                <div>Carpeta: {packToDelete?.folderName}</div>
                <div>UUID: {packToDelete?.uuid}</div>
              </div>
              <p className="text-[11px] text-slate-400">
                Se desvinculará automáticamente del mundo y se eliminará la carpeta de disco.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPackToDelete(null)}
                  className="min-h-[44px] px-3.5 py-2 rounded-lg bg-white/[0.06] text-slate-300 text-xs hover:bg-white/[0.1] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteBedrockPack}
                  className="min-h-[44px] px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar Pack</span>
                </button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {/* Rename Modal (Java) */}
      <Modal
        isOpen={Boolean(modToRename)}
        onClose={() => setModToRename(null)}
        title="Renombrar Archivo de Mod Java"
      >
        <form onSubmit={handleRename} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 block">Nombre del archivo</label>
            <input
              type="text"
              value={newFilename}
              onChange={(e) => setNewFilename(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#070a0f] border border-white/[0.1] rounded-lg text-xs text-white font-mono focus:outline-none focus:border-cyan-500/50"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModToRename(null)}
              className="min-h-[44px] px-3.5 py-2 rounded-lg bg-white/[0.06] text-slate-300 text-xs hover:bg-white/[0.1] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer"
            >
              Guardar Nuevo Nombre
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal (Java) */}
      <Modal
        isOpen={Boolean(modToDelete)}
        onClose={() => setModToDelete(null)}
        title="Eliminar Mod de Disco"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            ¿Estás seguro de que deseas eliminar permanentemente{' '}
            <strong className="text-rose-400 font-mono">
              {modToDelete?.filename || modToDelete?.name}
            </strong>
            ? Esta acción no se puede deshacer.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModToDelete(null)}
              className="min-h-[44px] px-3.5 py-2 rounded-lg bg-white/[0.06] text-slate-300 text-xs hover:bg-white/[0.1] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="min-h-[44px] px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar Mod</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
