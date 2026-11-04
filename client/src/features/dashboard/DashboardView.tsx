import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TelemetryData, PlayitStatus, BedrockPacksResponse } from '../../lib/types';
import { MetricGauge } from '../../components/common/MetricGauge';
import { InfoTip } from '../../components/common/InfoTip';
import { ConnectedPlayersList } from './ConnectedPlayersList';
import { QuickActionsModal } from './QuickActionsModal';
import { AnimatedTabs } from '../../components/rareui/AnimatedTab';
import { RetroPixelButton } from '../../components/rareui/RetroPixelButton';
import { GlassShimmerButton } from '../../components/rareui/GlassShimmerButton';
import {
  RareServerIcon,
  RareCpuIcon,
  RareRamIcon,
  RareDiskIcon,
  RareTpsIcon,
  RareVersionsIcon,
  RarePropertiesIcon,
  RareModsIcon,
  RarePlayitIcon,
  RareTerminalIcon,
} from '../../components/rareui/RareIcons';
import { api } from '../../lib/api';
import {
  RotateCw,
  Clock,
  Radio,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Smartphone,
  Layers,
  Copy,
  Check,
  Package,
} from 'lucide-react';

export type DashboardEngineView = 'java' | 'bedrock' | 'all';

interface DashboardViewProps {
  telemetry: TelemetryData | null;
  playit: PlayitStatus | null;
  onServerAction: (action: 'start' | 'stop' | 'restart' | 'kill') => Promise<void>;
  actionPending: boolean;
  onNavigateTab: (tab: string) => void;
  onKickPlayer: (name: string, reason?: string) => Promise<void>;
  onBanPlayer: (name: string, reason?: string) => Promise<void>;
  onToggleOp: (name: string, isOp: boolean) => Promise<void>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  telemetry,
  playit,
  onServerAction,
  actionPending,
  onNavigateTab,
  onKickPlayer,
  onBanPlayer,
  onToggleOp,
}) => {
  // View selector (Java / Bedrock / Unified)
  const [engineView, setEngineView] = useState<DashboardEngineView>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('mc_dashboard_view_mode') as DashboardEngineView;
      if (saved === 'java' || saved === 'bedrock' || saved === 'all') return saved;
    }
    return 'java';
  });

  const handleEngineViewChange = (viewId: string) => {
    const next = viewId as DashboardEngineView;
    setEngineView(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mc_dashboard_view_mode', next);
    }
  };

  const [isPowerModalOpen, setIsPowerModalOpen] = useState(false);
  const isOnline = Boolean(telemetry?.isRunning);

  // Bedrock Pack summary data
  const [bedrockPacksSummary, setBedrockPacksSummary] = useState<BedrockPacksResponse | null>(null);

  useEffect(() => {
    let isMounted = true;
    api
      .getBedrockPacks()
      .then((data) => {
        if (isMounted) setBedrockPacksSummary(data);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // AI Diagnostic State
  const [aiElapsedSeconds, setAiElapsedSeconds] = useState(0);
  const [isManualAnalyzing, setIsManualAnalyzing] = useState(false);
  const [aiErrorState, setAiErrorState] = useState<string | null>(null);

  const isAiAnalyzing = Boolean(
    !isOnline && (
      telemetry?.crashDiagnostic?.modName?.includes('Analizando con IA') ||
      telemetry?.crashDiagnostic?.error?.includes('Esperando respuesta de Gemini') ||
      isManualAnalyzing
    )
  );

  useEffect(() => {
    let interval: any = null;
    if (isAiAnalyzing) {
      interval = setInterval(() => {
        setAiElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setAiElapsedSeconds(0);
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAiAnalyzing]);

  // Handle timeout if analysis exceeds 25s
  useEffect(() => {
    if (isAiAnalyzing && aiElapsedSeconds >= 25) {
      setAiErrorState('Tiempo de espera agotado (25s). Los servidores de Google Gemini pueden estar saturados.');
    }
  }, [isAiAnalyzing, aiElapsedSeconds]);

  const handleTriggerAi = async () => {
    setIsManualAnalyzing(true);
    setAiErrorState(null);
    setAiElapsedSeconds(0);
    try {
      const res = await api.triggerAiDiagnosis();
      if (!res.success && res.message) {
        setAiErrorState(res.message);
      }
    } catch (err: any) {
      setAiErrorState(err.message || 'Error al conectar con el motor de IA');
    } finally {
      setIsManualAnalyzing(false);
    }
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) return '0m';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatGb = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return '0 GB';
    return value >= 10 ? `${value.toFixed(0)} GB` : `${value.toFixed(1)} GB`;
  };

  // Tunnels
  const playitTunnel = playit?.tunnels?.find((t) => t.id === 'minecraft-java' || t.proto === 'tcp') || playit?.tunnels?.[0];
  const bedrockTunnel = playit?.tunnels?.find((t) => t.id === 'minecraft-bedrock' || t.proto === 'udp');

  // Bedrock status & actions
  const isBedrockOnline = telemetry?.bedrock?.status === 'online';
  const isBedrockInstalled = Boolean(telemetry?.bedrock?.isInstalled);
  const [bedrockActionPending, setBedrockActionPending] = useState(false);

  const handleBedrockAction = async (action: 'start' | 'stop' | 'restart') => {
    setBedrockActionPending(true);
    try {
      await api.executeBedrockAction(action);
    } catch (err) {
      console.error('Error running Bedrock action:', err);
    } finally {
      setBedrockActionPending(false);
    }
  };

  // Copy-to-clipboard state
  const [copiedJavaPlayit, setCopiedJavaPlayit] = useState(false);
  const [copiedBedrockPlayit, setCopiedBedrockPlayit] = useState(false);

  const copyToClipboard = (text: string, isBedrock: boolean) => {
    navigator.clipboard.writeText(text).then(() => {
      if (isBedrock) {
        setCopiedBedrockPlayit(true);
        setTimeout(() => setCopiedBedrockPlayit(false), 2000);
      } else {
        setCopiedJavaPlayit(true);
        setTimeout(() => setCopiedJavaPlayit(false), 2000);
      }
    });
  };

  // Tabs for switching between Java, Bedrock and Unified
  const engineTabs = [
    {
      id: 'java',
      label: 'Servidor Java',
      badge: isOnline ? 'Online' : 'Offline',
      icon: (
        <span
          className={`w-2 h-2 rounded-full ${
            isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
          }`}
        />
      ),
    },
    {
      id: 'bedrock',
      label: 'Servidor Bedrock',
      badge: isBedrockOnline ? 'Online' : isBedrockInstalled ? 'Offline' : 'Sin instalar',
      icon: (
        <span
          className={`w-2 h-2 rounded-full ${
            isBedrockOnline ? 'bg-blue-400 animate-pulse' : 'bg-slate-500'
          }`}
        />
      ),
    },
    {
      id: 'all',
      label: 'Vista Combinada',
      icon: <Layers className="w-3.5 h-3.5 text-slate-400" />,
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Engine View Switcher (Tabs) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Panel de Control</span>
            <InfoTip content="Monitorea y administra tus instancias de Minecraft Java Edition y Minecraft Bedrock Dedicated Server (BDS) de forma independiente o combinada." />
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Selecciona la instancia que deseas supervisar
          </p>
        </div>

        <AnimatedTabs
          tabs={engineTabs}
          activeTab={engineView}
          onChange={handleEngineViewChange}
          layoutId="dashboard-engine-tabs"
        />
      </div>

      {/* ======================================================== */}
      {/* 1. JAVA SERVER VIEW (Visible when engineView === 'java' or 'all') */}
      {/* ======================================================== */}
      {(engineView === 'java' || engineView === 'all') && (
        <div className="space-y-6">
          {engineView === 'all' && (
            <div className="flex items-center gap-2 pt-2 pb-1 border-b border-white/[0.06]">
              <RareServerIcon size={18} className="text-emerald-400" />
              <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider font-mono">
                Instancia 1: Minecraft Java Edition (TCP 25565)
              </h2>
            </div>
          )}

          {/* Java Installation Banner if no version detected */}
          {!telemetry?.version && (
            <div className="rounded-xl p-4 sm:p-5 border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300">
                  <RareVersionsIcon size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>Servidor Minecraft Java aún no configurado</span>
                    <InfoTip content="Instala una versión oficial de Minecraft y motor NeoForge para poder iniciar el servidor." />
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                      Acción Requerida
                    </span>
                  </h3>
                </div>
              </div>

              <GlassShimmerButton
                variant="amber"
                size="sm"
                onClick={() => onNavigateTab('versions')}
              >
                <span>Configurar versión</span>
                <ChevronRight className="w-4 h-4" />
              </GlassShimmerButton>
            </div>
          )}

          {/* Java Main Server Banner */}
          <div className="bg-[#0b0f17] rounded-xl p-5 sm:p-6 border border-white/[0.08] relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
              <div className="flex items-start sm:items-center gap-4">
                <div
                  className={`w-13 h-13 rounded-xl flex items-center justify-center shrink-0 border ${
                    isOnline
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}
                >
                  <RareServerIcon size={26} />
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-white tracking-tight">Servidor Minecraft Java</h2>
                    <InfoTip content="Motor Java / NeoForge en puerto TCP 25565 con OpenJDK 21 LTS." />
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider font-mono flex items-center gap-1.5 ${
                        isOnline
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                        }`}
                      />
                      <span>{telemetry?.state.toUpperCase() || 'OFFLINE'}</span>
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {telemetry?.version || 'Sin versión instalada'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 flex-wrap">
                    <div className="flex items-center gap-1.5 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Activo: {formatUptime(telemetry?.uptime || 0)}</span>
                    </div>
                    {telemetry?.pid && (
                      <div className="flex items-center gap-1.5 font-mono">
                        <Radio className="w-3.5 h-3.5 text-slate-500" />
                        <span>PID: {telemetry.pid}</span>
                      </div>
                    )}
                    {playitTunnel && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`${playitTunnel.assignedDomain}:${playitTunnel.publicPort}`, false)}
                        className="flex items-center gap-1.5 font-mono text-cyan-400 bg-cyan-950/30 hover:bg-cyan-950/60 px-2.5 py-1 rounded-md border border-cyan-500/30 transition-colors cursor-pointer group"
                        title="Click para copiar dirección Playit de Java"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        <span>Playit: {playitTunnel.assignedDomain}:{playitTunnel.publicPort}</span>
                        {copiedJavaPlayit ? (
                          <Check className="w-3 h-3 text-emerald-400 ml-1" />
                        ) : (
                          <Copy className="w-3 h-3 text-cyan-400/60 group-hover:text-cyan-300 ml-1" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {!isOnline ? (
                  <RetroPixelButton
                    variant="emerald"
                    size="md"
                    onClick={() => onServerAction('start')}
                    disabled={actionPending}
                  >
                    INICIAR SERVIDOR
                  </RetroPixelButton>
                ) : (
                  <>
                    <GlassShimmerButton
                      variant="amber"
                      size="sm"
                      onClick={() => onServerAction('restart')}
                      disabled={actionPending}
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Reiniciar</span>
                    </GlassShimmerButton>

                    <GlassShimmerButton
                      variant="rose"
                      size="sm"
                      onClick={() => setIsPowerModalOpen(true)}
                      disabled={actionPending}
                    >
                      <span>Detener / Kill...</span>
                    </GlassShimmerButton>
                  </>
                )}

                <GlassShimmerButton
                  variant="default"
                  size="sm"
                  onClick={() => onNavigateTab('console')}
                >
                  <RareTerminalIcon size={15} />
                  <span>Consola</span>
                </GlassShimmerButton>
              </div>
            </div>
          </div>

          {/* Crash Diagnostic / AI Analysis Banner */}
          <AnimatePresence mode="wait">
            {!isOnline && isAiAnalyzing && (
              <motion.div
                key="ai-analyzing"
                initial={{ opacity: 0, y: -14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -14, scale: 0.98 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="mb-4"
              >
                <div className="bg-[#0f1724] border border-purple-500/35 rounded-xl p-4 sm:p-5 relative overflow-hidden shadow-xl shadow-purple-500/5">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                      <Sparkles className="w-6 h-6 animate-pulse" />
                    </div>

                    <div className="flex-1 w-full min-w-0">
                      <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold">
                          <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                          <span>Diagnóstico con IA en Proceso</span>
                        </div>

                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#070a0f] border border-white/[0.08] text-purple-200 text-xs font-mono">
                          <Clock className="w-3.5 h-3.5 text-purple-400" />
                          <span>{aiElapsedSeconds < 10 ? `00:0${aiElapsedSeconds}s` : `00:${aiElapsedSeconds}s`}</span>
                        </div>

                        {aiElapsedSeconds >= 15 && (
                          <span className="text-[11px] text-amber-400/90 flex items-center gap-1 font-mono">
                            <AlertCircle className="w-3 h-3" />
                            <span>Analizando logs extensos...</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-white font-medium text-sm sm:text-base">
                          Gemini está interpretando las trazas del crash y dependencias...
                        </h4>
                        <InfoTip content="Se consulta Google Gemini para identificar automáticamente dependencias incompatibles o causas del fallo y generar una solución." />
                      </div>

                      {aiErrorState && (
                        <div className="mt-2.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-300">
                          <span>{aiErrorState}</span>
                          <button
                            type="button"
                            onClick={handleTriggerAi}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Reintentar</span>
                          </button>
                        </div>
                      )}

                      <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden mt-3">
                        <motion.div
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                          className="w-1/2 h-full bg-gradient-to-r from-transparent via-purple-400 to-indigo-400 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {!isOnline && !isAiAnalyzing && telemetry?.crashDiagnostic && (
              <motion.div
                key="crash-result"
                initial={{ opacity: 0, y: -14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                className="mb-4"
              >
                <div
                  className={`rounded-xl border p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center ${
                    telemetry.crashDiagnostic.severity === 'warning'
                      ? 'border-amber-500/30 bg-amber-500/10'
                      : 'border-red-500/30 bg-red-500/10'
                  }`}
                >
                  <div
                    className={`p-3 rounded-xl shrink-0 ${
                      telemetry.crashDiagnostic.severity === 'warning'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="flex-1 w-full overflow-hidden">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3
                        className={`font-semibold text-base ${
                          telemetry.crashDiagnostic.severity === 'warning' ? 'text-amber-300' : 'text-red-300'
                        }`}
                      >
                        {telemetry.crashDiagnostic.severity === 'warning'
                          ? 'Advertencia detectada en el servidor'
                          : 'Fallo o crasheo detectado en el servidor'}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[11px] font-mono flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-400" />
                        <span>Diagnóstico Detallado con IA</span>
                      </span>
                    </div>

                    {telemetry.crashDiagnostic.error && (
                      <p className="text-xs text-slate-300 font-medium mb-2.5">
                        {telemetry.crashDiagnostic.error}
                      </p>
                    )}

                    {telemetry.crashDiagnostic.missingDependencies &&
                      telemetry.crashDiagnostic.missingDependencies.length > 0 && (
                        <div className="mb-3 p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/30">
                          <span className="font-semibold text-cyan-300 text-xs mb-1.5 flex items-center gap-1.5">
                            <span>Librerías / Dependencias requeridas que faltan por instalar:</span>
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {telemetry.crashDiagnostic.missingDependencies.map((dep: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 rounded-md font-mono text-xs bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 flex items-center gap-1 font-semibold"
                              >
                                <span className="text-cyan-400 font-bold">+</span>
                                <span>{dep}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                    {telemetry.crashDiagnostic.modName && (
                      <div className="mb-3">
                        <span className="font-semibold text-slate-300 text-xs mb-1.5 block">
                          {telemetry.crashDiagnostic.modName.includes('/') ||
                          telemetry.crashDiagnostic.modName.toLowerCase().includes('memoria') ||
                          telemetry.crashDiagnostic.modName.toLowerCase().includes('puerto') ||
                          telemetry.crashDiagnostic.modName.toLowerCase().includes('eula') ||
                          telemetry.crashDiagnostic.modName.toLowerCase().includes('java') ||
                          telemetry.crashDiagnostic.modName.toLowerCase().includes('mundo') ||
                          telemetry.crashDiagnostic.modName.toLowerCase().includes('sistema')
                            ? 'Componente / Causa detectada:'
                            : 'Mod(s) instalados involucrados en el conflicto:'}
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                          {telemetry.crashDiagnostic.modName.split(',').map((item: string, idx: number) => (
                            <span
                              key={idx}
                              className={`px-2 py-0.5 rounded-md font-mono text-xs ${
                                telemetry.crashDiagnostic?.severity === 'warning'
                                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-200'
                                  : 'bg-red-500/10 border border-red-500/20 text-red-200'
                              }`}
                            >
                              {item.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Solution Box */}
                    <div className="p-3.5 rounded-lg bg-[#070a0f] border border-white/[0.08] mb-2.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Solución sugerida:
                      </span>
                      <p
                        className={`text-xs sm:text-sm leading-relaxed ${
                          telemetry.crashDiagnostic.severity === 'warning' ? 'text-amber-200' : 'text-red-200'
                        }`}
                      >
                        {telemetry.crashDiagnostic.solution}
                      </p>
                    </div>

                    {/* Detailed Breakdown */}
                    {telemetry.crashDiagnostic.details && telemetry.crashDiagnostic.details.length > 0 && (
                      <div className="mt-2.5 text-xs text-slate-400 border-t border-white/[0.08] pt-2.5">
                        <span className="font-semibold text-slate-300 block mb-1.5 text-xs">
                          Desglose y detalles técnicos:
                        </span>
                        <ul className="space-y-1 text-xs">
                          {telemetry.crashDiagnostic.details.map((detail: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-1.5 text-slate-300">
                              <span className="text-purple-400 font-bold shrink-0">•</span>
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
                    <GlassShimmerButton
                      variant="default"
                      size="sm"
                      onClick={handleTriggerAi}
                      className="flex-1 sm:flex-none justify-center gap-1.5 border-purple-500/30 hover:border-purple-500/60"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Reanalizar con IA</span>
                    </GlassShimmerButton>
                    {telemetry.crashDiagnostic.severity === 'warning' && (
                      <GlassShimmerButton
                        variant="amber"
                        size="sm"
                        onClick={() => onNavigateTab('versions')}
                        className="flex-1 sm:flex-none justify-center"
                      >
                        Actualizar NeoForge
                      </GlassShimmerButton>
                    )}
                    <GlassShimmerButton
                      variant="default"
                      size="sm"
                      onClick={() => onNavigateTab('console')}
                      className="flex-1 sm:flex-none justify-center"
                    >
                      Ver Consola
                    </GlassShimmerButton>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Telemetry Resource Gauges Grid (Java) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CPU */}
            <MetricGauge
              title="Uso de CPU (Java)"
              value={isOnline && telemetry ? `${telemetry.cpu.java}%` : '--'}
              subtitle={telemetry ? `Equipo: ${telemetry.cpu.host}%` : 'Sin telemetría'}
              percentage={isOnline ? telemetry?.cpu?.java : undefined}
              icon={RareCpuIcon as any}
              variant="emerald"
            />

            {/* RAM */}
            <MetricGauge
              title="Memoria Xmx (Java)"
              value={isOnline && telemetry ? `${(telemetry.ram.used / 1024).toFixed(2)} GB` : '--'}
              subtitle={
                telemetry?.ram?.maxAllocated
                  ? `Límite Xmx: ${(telemetry.ram.maxAllocated / 1024).toFixed(1)} GB`
                  : 'Límite Xmx no detectado'
              }
              percentage={
                isOnline && telemetry?.ram?.maxAllocated
                  ? (telemetry.ram.used / telemetry.ram.maxAllocated) * 100
                  : undefined
              }
              icon={RareRamIcon as any}
              variant="cyan"
            />

            {/* TPS */}
            <MetricGauge
              title="Rendimiento del Mundo"
              value={
                isOnline && telemetry?.tps?.current !== null && telemetry?.tps?.current !== undefined
                  ? `${telemetry.tps.current} TPS`
                  : '-- TPS'
              }
              subtitle={
                !isOnline
                  ? 'Servidor apagado'
                  : telemetry?.tps?.avgTickMs !== null && telemetry?.tps?.avgTickMs !== undefined
                  ? `Avg. Tick: ${telemetry.tps.avgTickMs} ms`
                  : 'Sampler de ticks activo'
              }
              icon={RareTpsIcon as any}
              variant={
                telemetry?.tps?.current !== null &&
                telemetry?.tps?.current !== undefined &&
                telemetry.tps.current >= 19.0
                  ? 'emerald'
                  : 'amber'
              }
            />

            {/* Disk */}
            <MetricGauge
              title="Almacenamiento Servidor"
              value={
                telemetry?.disk?.serverSizeFormatted ||
                (telemetry?.disk?.serverSizeMb ? `${telemetry.disk.serverSizeMb} MB` : '-- MB')
              }
              subtitle={
                telemetry?.disk?.total
                  ? `${formatGb(telemetry.disk.free)} libres de ${formatGb(telemetry.disk.total)}`
                  : 'Directorio del servidor'
              }
              icon={RareDiskIcon as any}
              variant="indigo"
            />
          </div>

          {/* Connected Players Section */}
          <ConnectedPlayersList
            players={telemetry?.players?.list || []}
            maxPlayers={telemetry?.players?.max ?? 0}
            onKick={onKickPlayer}
            onBan={onBanPlayer}
            onToggleOp={onToggleOp}
          />

          {/* Java Quick Access Navigation Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              onClick={() => onNavigateTab('versions')}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="bg-[#0b0f17] border border-white/[0.08] hover:border-emerald-500/35 hover:bg-[#0f1724] rounded-xl p-4 cursor-pointer flex items-center justify-between group transition-colors shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform">
                  <RareVersionsIcon size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors">
                    Versiones Java
                  </h4>
                  <p className="text-[11px] text-slate-400">Motores y binarios NeoForge</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
            </motion.div>

            <motion.div
              onClick={() => onNavigateTab('properties')}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="bg-[#0b0f17] border border-white/[0.08] hover:border-amber-500/35 hover:bg-[#0f1724] rounded-xl p-4 cursor-pointer flex items-center justify-between group transition-colors shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-105 transition-transform">
                  <RarePropertiesIcon size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors">
                    Propiedades Java
                  </h4>
                  <p className="text-[11px] text-slate-400">server.properties & reglas</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
            </motion.div>

            <motion.div
              onClick={() => onNavigateTab('mods')}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="bg-[#0b0f17] border border-white/[0.08] hover:border-cyan-500/35 hover:bg-[#0f1724] rounded-xl p-4 cursor-pointer flex items-center justify-between group transition-colors shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:scale-105 transition-transform">
                  <RareModsIcon size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors">
                    Mods Java
                  </h4>
                  <p className="text-[11px] text-slate-400">Gestor de archivos .jar</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
            </motion.div>

            <motion.div
              onClick={() => onNavigateTab('playit')}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="bg-[#0b0f17] border border-white/[0.08] hover:border-indigo-500/35 hover:bg-[#0f1724] rounded-xl p-4 cursor-pointer flex items-center justify-between group transition-colors shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:scale-105 transition-transform">
                  <RarePlayitIcon size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors">
                    Playit.gg Java
                  </h4>
                  <p className="text-[11px] text-slate-400">Túnel TCP Anycast</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
            </motion.div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. BEDROCK SERVER VIEW (Visible when engineView === 'bedrock' or 'all') */}
      {/* ======================================================== */}
      {(engineView === 'bedrock' || engineView === 'all') && (
        <div className="space-y-6">
          {engineView === 'all' && (
            <div className="flex items-center gap-2 pt-6 pb-1 border-b border-white/[0.06]">
              <Smartphone className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider font-mono">
                Instancia 2: Minecraft Bedrock Dedicated Server (UDP 19132)
              </h2>
            </div>
          )}

          {/* Bedrock Installation Warning if BDS is not installed */}
          {!isBedrockInstalled && (
            <div className="rounded-xl p-4 sm:p-5 border border-blue-500/30 bg-blue-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-300">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>Servidor Bedrock (BDS) no instalado</span>
                    <InfoTip content="Descarga los binarios oficiales de Bedrock Dedicated Server para permitir conexiones desde celulares, consolas y Windows Bedrock Edition." />
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                      Descarga disponible
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Puedes instalar la última versión oficial con un solo clic desde la pestaña de Versiones.
                  </p>
                </div>
              </div>

              <GlassShimmerButton
                variant="cyan"
                size="sm"
                onClick={() => onNavigateTab('versions')}
              >
                <span>Instalar BDS Oficial</span>
                <ChevronRight className="w-4 h-4" />
              </GlassShimmerButton>
            </div>
          )}

          {/* Dedicated Full Bedrock Server Banner */}
          <div className="bg-[#0b0f17] rounded-xl p-5 sm:p-6 border border-white/[0.08] relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
              <div className="flex items-start sm:items-center gap-4">
                <div
                  className={`w-13 h-13 rounded-xl flex items-center justify-center shrink-0 border ${
                    isBedrockOnline
                      ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                      : 'bg-white/[0.04] border-white/[0.08] text-slate-400'
                  }`}
                >
                  <Smartphone className="w-7 h-7" />
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      Minecraft Bedrock Dedicated Server
                    </h2>
                    <InfoTip content="Servidor oficial BDS en C++ nativo para clientes móviles, consolas y Windows en puerto UDP 19132 con protocolo RakNet." />
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider font-mono flex items-center gap-1.5 border ${
                        isBedrockOnline
                          ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                          : 'bg-white/[0.04] text-slate-400 border-white/[0.08]'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isBedrockOnline ? 'bg-blue-400 animate-pulse' : 'bg-slate-500'
                        }`}
                      />
                      <span>{telemetry?.bedrock?.status.toUpperCase() || 'OFFLINE'}</span>
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {telemetry?.bedrock?.version || (isBedrockInstalled ? 'Instalado' : 'No instalado')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 flex-wrap font-mono">
                    <span className="text-blue-400 font-semibold">
                      Puerto RakNet: UDP {telemetry?.bedrock?.port || 19132}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span>
                      {telemetry?.bedrock?.players?.online || 0} / {telemetry?.bedrock?.players?.max || 10} jugadores
                    </span>
                    {isBedrockOnline && (
                      <>
                        <span className="text-slate-600">•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>Activo: {formatUptime(telemetry?.bedrock?.uptime || 0)}</span>
                        </div>
                      </>
                    )}
                    {bedrockTunnel && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`${bedrockTunnel.assignedDomain}:${bedrockTunnel.publicPort}`, true)}
                        className="flex items-center gap-1.5 font-mono text-cyan-400 bg-cyan-950/30 hover:bg-cyan-950/60 px-2.5 py-1 rounded-md border border-cyan-500/30 transition-colors cursor-pointer group"
                        title="Click para copiar dirección Playit de Bedrock"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        <span>Playit UDP: {bedrockTunnel.assignedDomain}:{bedrockTunnel.publicPort}</span>
                        {copiedBedrockPlayit ? (
                          <Check className="w-3 h-3 text-emerald-400 ml-1" />
                        ) : (
                          <Copy className="w-3 h-3 text-cyan-400/60 group-hover:text-cyan-300 ml-1" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Bedrock Power and Console Actions */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {!isBedrockInstalled ? (
                  <GlassShimmerButton
                    variant="amber"
                    size="sm"
                    onClick={() => onNavigateTab('versions')}
                  >
                    <span>Instalar BDS</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </GlassShimmerButton>
                ) : !isBedrockOnline ? (
                  <button
                    type="button"
                    onClick={() => handleBedrockAction('start')}
                    disabled={bedrockActionPending}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-blue-600/20"
                  >
                    {bedrockActionPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                    <span>INICIAR SERVIDOR BEDROCK</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleBedrockAction('restart')}
                      disabled={bedrockActionPending}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 text-xs font-semibold border border-white/[0.08] flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${bedrockActionPending ? 'animate-spin' : ''}`} />
                      <span>Reiniciar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBedrockAction('stop')}
                      disabled={bedrockActionPending}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold border border-rose-500/30 flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <span>Detener</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => onNavigateTab('console')}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium border border-white/[0.08] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <RareTerminalIcon size={15} />
                  <span>Consola BDS</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bedrock Telemetry Resource & Status Gauges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricGauge
              title="Estado BDS & Watchdog"
              value={isBedrockOnline ? 'EN LÍNEA' : isBedrockInstalled ? 'DETENIDO' : 'NO INSTALADO'}
              subtitle={
                isBedrockOnline
                  ? 'Monitor BDS activo en C++'
                  : isBedrockInstalled
                  ? 'Listo para iniciar'
                  : 'Requiere binarios'
              }
              icon={RareServerIcon as any}
              variant={isBedrockOnline ? 'emerald' : 'amber'}
            />

            <MetricGauge
              title="Puerto & Protocolo"
              value={`UDP ${telemetry?.bedrock?.port || 19132}`}
              subtitle="RakNet nativo para Móvil y Consolas"
              icon={Radio as any}
              variant="cyan"
            />

            <MetricGauge
              title="Jugadores Bedrock"
              value={`${telemetry?.bedrock?.players?.online || 0} / ${telemetry?.bedrock?.players?.max || 10}`}
              subtitle="Clientes conectados simultáneamente"
              icon={RareVersionsIcon as any}
              variant="indigo"
            />

            <MetricGauge
              title="Add-ons & Packs (RP/BP)"
              value={
                bedrockPacksSummary ? `${bedrockPacksSummary.total} packs` : '0 packs'
              }
              subtitle={
                bedrockPacksSummary
                  ? `${bedrockPacksSummary.activeCount} activos en el mundo`
                  : 'Resource & Behavior Packs'
              }
              icon={Package as any}
              variant="amber"
            />
          </div>

          {/* Bedrock Add-ons & Packs Quick Card */}
          <div className="rounded-xl p-5 border border-white/[0.08] bg-[#0b0f17] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-400 shrink-0">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                    Add-ons, Resource Packs y Behavior Packs
                  </h3>
                  <InfoTip content="Sube archivos .mcpack, .mcaddon, .rp o .bp para personalizar texturas, entidades y mecánicas del servidor Bedrock." />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {bedrockPacksSummary ? (
                    <>
                      <span className="text-emerald-400 font-medium">{bedrockPacksSummary.resourceCount} Resource Packs</span>
                      {' · '}
                      <span className="text-purple-400 font-medium">{bedrockPacksSummary.behaviorCount} Behavior Packs</span>
                      {' · '}
                      <span className="text-cyan-400 font-medium">{bedrockPacksSummary.activeCount} activados en el mundo</span>
                    </>
                  ) : (
                    'Sube y administra tus add-ons con soporte para .mcpack, .mcaddon, .rp y .bp.'
                  )}
                </p>
              </div>
            </div>

            <GlassShimmerButton
              variant="emerald"
              size="sm"
              onClick={() => onNavigateTab('mods')}
            >
              <Package className="w-4 h-4" />
              <span>Gestionar Add-ons Bedrock</span>
              <ChevronRight className="w-4 h-4" />
            </GlassShimmerButton>
          </div>

          {/* Bedrock Quick Navigation Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              onClick={() => onNavigateTab('versions')}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="bg-[#0b0f17] border border-white/[0.08] hover:border-blue-500/35 hover:bg-[#0f1724] rounded-xl p-4 cursor-pointer flex items-center justify-between group transition-colors shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-105 transition-transform">
                  <RareVersionsIcon size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white group-hover:text-blue-300 transition-colors">
                    Versiones BDS
                  </h4>
                  <p className="text-[11px] text-slate-400">Binarios oficiales C++</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
            </motion.div>

            <motion.div
              onClick={() => onNavigateTab('properties')}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="bg-[#0b0f17] border border-white/[0.08] hover:border-amber-500/35 hover:bg-[#0f1724] rounded-xl p-4 cursor-pointer flex items-center justify-between group transition-colors shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-105 transition-transform">
                  <RarePropertiesIcon size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors">
                    Propiedades BDS
                  </h4>
                  <p className="text-[11px] text-slate-400">Gamemode, cheats & puertos</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
            </motion.div>

            <motion.div
              onClick={() => onNavigateTab('mods')}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="bg-[#0b0f17] border border-white/[0.08] hover:border-emerald-500/35 hover:bg-[#0f1724] rounded-xl p-4 cursor-pointer flex items-center justify-between group transition-colors shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors">
                    Add-ons y Packs
                  </h4>
                  <p className="text-[11px] text-slate-400">RP, BP, .mcpack & .mcaddon</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
            </motion.div>

            <motion.div
              onClick={() => onNavigateTab('playit')}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="bg-[#0b0f17] border border-white/[0.08] hover:border-indigo-500/35 hover:bg-[#0f1724] rounded-xl p-4 cursor-pointer flex items-center justify-between group transition-colors shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:scale-105 transition-transform">
                  <RarePlayitIcon size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors">
                    Playit.gg UDP
                  </h4>
                  <p className="text-[11px] text-slate-400">Túnel Bedrock Anycast</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
            </motion.div>
          </div>
        </div>
      )}

      {/* Quick Power Actions Modal */}
      <QuickActionsModal
        isOpen={isPowerModalOpen}
        onClose={() => setIsPowerModalOpen(false)}
        isRunning={isOnline}
        onExecute={onServerAction}
        actionPending={actionPending}
      />
    </div>
  );
};
