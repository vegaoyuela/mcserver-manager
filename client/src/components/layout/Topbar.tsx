import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Play, Square, RotateCw, Skull, Copy, Check, Radio } from 'lucide-react';
import { TelemetryData, PlayitStatus } from '../../lib/types';
import { RarePowerIcon, RarePlayitIcon, RareTpsIcon } from '../rareui/RareIcons';
import { GlassShimmerButton } from '../rareui/GlassShimmerButton';

interface TopbarProps {
  currentTab: string;
  onOpenMobileMenu: () => void;
  telemetry: TelemetryData | null;
  playit: PlayitStatus | null;
  onServerAction: (action: 'start' | 'stop' | 'restart' | 'kill') => void;
  actionPending: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentTab,
  onOpenMobileMenu,
  telemetry,
  playit,
  onServerAction,
  actionPending,
}) => {
  const [copied, setCopied] = useState(false);
  const [showPowerDropdown, setShowPowerDropdown] = useState(false);

  const tabTitles: Record<string, string> = {
    dashboard: 'Dashboard',
    versions: 'Versiones',
    console: 'Consola',
    properties: 'Configuración',
    players: 'Jugadores',
    mods: 'Mods',
    files: 'Archivos',
    playit: 'Playit.gg',
    settings: 'Ajustes',
  };

  const currentTitle = tabTitles[currentTab] || 'Panel';
  const isOnline = Boolean(telemetry?.isRunning);
  const playitTunnel = playit?.tunnels?.[0];

  const handleCopyIp = () => {
    if (!playitTunnel) return;
    const address = `${playitTunnel.assignedDomain}:${playitTunnel.publicPort}`;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-16 border-b border-white/[0.08] bg-[#0b0f17]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Mobile trigger & Page titles */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg bg-white/[0.06] text-slate-300 hover:text-white hover:bg-white/[0.1] cursor-pointer"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-white tracking-tight">
            {currentTitle}
          </h1>
        </div>
      </div>

      {/* Right: Quick Stats & Power Trigger */}
      <div className="flex items-center gap-2.5">
        {/* Playit address pill */}
        {playitTunnel && (
          <button
            onClick={handleCopyIp}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/30 border border-cyan-500/25 text-cyan-300 text-xs font-mono hover:bg-cyan-900/40 hover:border-cyan-500/40 transition-colors cursor-pointer"
            title="Copiar dirección de conexión al portapapeles"
          >
            <RarePlayitIcon size={15} />
            <span className="max-w-[200px] truncate">{playitTunnel.assignedDomain}:{playitTunnel.publicPort}</span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 ml-1 shrink-0" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-cyan-400/70 ml-1 shrink-0" />
            )}
          </button>
        )}

        {/* TPS Pill */}
        {isOnline && telemetry?.tps && telemetry.tps.current !== null && telemetry.tps.current !== undefined && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/25 text-emerald-300 text-xs font-mono">
            <RareTpsIcon size={14} />
            <span className="font-semibold">{telemetry.tps.current} TPS</span>
            {telemetry.tps.avgTickMs !== undefined && telemetry.tps.avgTickMs !== null && (
              <span className="text-emerald-400/70 text-[11px] pl-0.5">({telemetry.tps.avgTickMs} ms)</span>
            )}
          </div>
        )}

        {/* Power Dropdown Trigger */}
        <div className="relative">
          <GlassShimmerButton
            variant={isOnline ? 'emerald' : 'rose'}
            size="sm"
            onClick={() => setShowPowerDropdown(!showPowerDropdown)}
            disabled={actionPending}
          >
            <RarePowerIcon size={14} />
            <span>{isOnline ? 'En Línea' : 'Detenido'}</span>
          </GlassShimmerButton>

          {/* Animated Dropdown Menu with Framer Motion */}
          <AnimatePresence>
            {showPowerDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowPowerDropdown(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -4 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute right-0 mt-2 w-60 rounded-xl bg-[#0f1724] border border-white/[0.1] shadow-2xl p-1.5 z-50 text-xs"
                >
                  <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-white/[0.08] font-mono flex items-center justify-between">
                    <span>Control de Servidor</span>
                    <Radio className="w-3 h-3 text-slate-400" />
                  </div>

                  <div className="p-1 space-y-1">
                    {!isOnline ? (
                      <button
                        onClick={() => {
                          onServerAction('start');
                          setShowPowerDropdown(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors font-medium text-left cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-emerald-400" />
                        <span>Iniciar Servidor</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            onServerAction('restart');
                            setShowPowerDropdown(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors font-medium text-left cursor-pointer"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>Reiniciar Servidor</span>
                        </button>

                        <button
                          onClick={() => {
                            onServerAction('stop');
                            setShowPowerDropdown(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-rose-300 hover:bg-rose-500/10 transition-colors font-medium text-left cursor-pointer"
                        >
                          <Square className="w-3.5 h-3.5" />
                          <span>Detener Servidor (/stop)</span>
                        </button>

                        <div className="my-1 border-t border-white/[0.06]" />

                        <button
                          onClick={() => {
                            onServerAction('kill');
                            setShowPowerDropdown(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-600/20 transition-colors font-medium text-left cursor-pointer"
                        >
                          <Skull className="w-3.5 h-3.5" />
                          <span>Forzar Apagado (SIGKILL)</span>
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
