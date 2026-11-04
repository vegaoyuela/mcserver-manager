import React from 'react';
import { motion } from 'framer-motion';
import {
  RareServerIcon,
  RareVersionsIcon,
  RareTerminalIcon,
  RarePropertiesIcon,
  RarePlayersIcon,
  RareModsIcon,
  RareFilesIcon,
  RarePlayitIcon,
  RareSettingsIcon,
  RarePowerIcon,
} from '../rareui/RareIcons';
import { LogOut, Layers } from 'lucide-react';
import { TelemetryData } from '../../lib/types';
import { useAuth } from '../../features/auth/AuthContext';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  telemetry: TelemetryData | null;
  onOpenPowerModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  telemetry,
  onOpenPowerModal,
}) => {
  const { username, logout } = useAuth();
  const isOnline = Boolean(telemetry?.isRunning);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: RareServerIcon },
    { id: 'versions', label: 'Versiones', icon: RareVersionsIcon, badge: isOnline ? 'Activo' : undefined },
    { id: 'console', label: 'Consola', icon: RareTerminalIcon, badge: isOnline ? 'Live' : undefined },
    { id: 'properties', label: 'Configuración', icon: RarePropertiesIcon },
    { id: 'players', label: 'Jugadores', icon: RarePlayersIcon, count: telemetry?.players?.online ?? 0 },
    { id: 'mods', label: 'Mods', icon: RareModsIcon },
    { id: 'files', label: 'Archivos', icon: RareFilesIcon },
    { id: 'playit', label: 'Playit.gg', icon: RarePlayitIcon },
    { id: 'settings', label: 'Ajustes', icon: RareSettingsIcon },
  ];

  return (
    <aside className="hidden lg:flex w-64 bg-[#0b0f17] border-r border-white/[0.08] flex-col shrink-0 h-screen select-none">
      {/* Brand & Platform Header */}
      <div className="p-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0"
            whileHover={{ scale: 1.04 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <RareServerIcon size={20} />
          </motion.div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm tracking-tight text-white">MC Manager</span>
              <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                v1.0
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono truncate block">
              {telemetry?.version || 'NeoForge / Java'}
            </span>
          </div>
        </div>

        {/* Server Context / Multi-Server Tag */}
        <div className="mt-3 px-2.5 py-1.5 rounded-lg bg-[#070a0f] border border-white/[0.06] flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Instancia:</span>
            <span className="font-mono text-cyan-300 font-semibold">Java 25565</span>
          </div>
          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Default</span>
        </div>
      </div>

      {/* Quick Power & Health Pill */}
      <div className="mx-3 mt-3 px-3 py-2.5 rounded-xl bg-[#070a0f] border border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            {isOnline && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isOnline ? 'bg-emerald-400' : 'bg-rose-500'
              }`}
            />
          </span>
          <span className="text-xs font-semibold text-slate-200 font-mono">
            {isOnline ? 'Servidor Activo' : 'Servidor Detenido'}
          </span>
        </div>

        <motion.button
          onClick={onOpenPowerModal}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Control de Energía"
        >
          <RarePowerIcon size={15} />
        </motion.button>
      </div>

      {/* Navigation List with Impeccable Motion Pill */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <motion.button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              className={`relative w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer outline-none ${
                isActive
                  ? 'text-emerald-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
              }`}
            >
              {/* Animated active highlight pill */}
              {isActive && (
                <motion.div
                  layoutId="sidebarActivePill"
                  className="absolute inset-0 rounded-lg bg-emerald-500/15 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.12)] z-0"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}

              <div className="relative z-10 flex items-center gap-2.5">
                <Icon
                  size={17}
                  className={isActive ? 'text-emerald-400' : 'text-slate-400'}
                />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span className="relative z-10 px-1.5 py-0.5 text-[9px] font-mono font-semibold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {item.badge}
                </span>
              )}

              {typeof item.count === 'number' && (
                <span className="relative z-10 px-1.5 py-0.5 text-[10px] font-mono rounded bg-white/[0.06] text-slate-300 border border-white/[0.08]">
                  {item.count}
                </span>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Live Resource Telemetry Widget (When Online) */}
      {telemetry && isOnline && (
        <div className="mx-3 mb-3 p-3 rounded-xl bg-[#070a0f] border border-white/[0.08] text-[11px] space-y-2">
          <div className="flex justify-between text-slate-400 font-mono">
            <span>CPU</span>
            <span className="text-slate-200 font-semibold">{telemetry.cpu.java}%</span>
          </div>
          <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${Math.min(telemetry.cpu.java, 100)}%` }}
            />
          </div>

          <div className="flex justify-between text-slate-400 font-mono pt-0.5">
            <span>RAM</span>
            <span className="text-slate-200 font-semibold">
              {telemetry.ram.maxAllocated > 0
                ? `${(telemetry.ram.used / 1024).toFixed(1)} / ${(telemetry.ram.maxAllocated / 1024).toFixed(1)} GB`
                : 'No configurada'}
            </span>
          </div>
          <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-cyan-500 h-full transition-all duration-500"
              style={{
                width: `${
                  telemetry.ram.maxAllocated > 0
                    ? Math.min((telemetry.ram.used / telemetry.ram.maxAllocated) * 100, 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      )}

      {/* User & Session Footer */}
      <div className="p-3 border-t border-white/[0.08] bg-[#070a0f]/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/25 shrink-0">
            {username?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="truncate min-w-0">
            <span className="text-xs font-medium text-slate-200 block truncate">{username || 'Admin'}</span>
            <span className="text-[10px] text-slate-400 block font-mono">Sesión Segura</span>
          </div>
        </div>

        <button
          onClick={logout}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
          title="Cerrar Sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
