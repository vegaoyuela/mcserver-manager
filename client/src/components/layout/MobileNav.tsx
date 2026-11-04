import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RareServerIcon,
  RareVersionsIcon,
  RareTerminalIcon,
  RareModsIcon,
  RareFilesIcon,
  RarePlayersIcon,
  RarePropertiesIcon,
  RarePlayitIcon,
  RareSettingsIcon,
} from '../rareui/RareIcons';
import { Sliders, X, LogOut } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { TelemetryData } from '../../lib/types';

interface MobileNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  telemetry: TelemetryData | null;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onOpen,
  onClose,
  telemetry,
}) => {
  const { logout, username } = useAuth();

  const primaryTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: RareServerIcon },
    { id: 'versions', label: 'Versiones', icon: RareVersionsIcon },
    { id: 'console', label: 'Consola', icon: RareTerminalIcon },
    { id: 'mods', label: 'Mods', icon: RareModsIcon },
    { id: 'files', label: 'Archivos', icon: RareFilesIcon },
  ];

  const drawerItems = [
    { id: 'dashboard', label: 'Dashboard', icon: RareServerIcon },
    { id: 'versions', label: 'Versiones', icon: RareVersionsIcon },
    { id: 'console', label: 'Consola', icon: RareTerminalIcon },
    { id: 'properties', label: 'Configuración', icon: RarePropertiesIcon },
    { id: 'players', label: 'Jugadores', icon: RarePlayersIcon },
    { id: 'mods', label: 'Mods', icon: RareModsIcon },
    { id: 'files', label: 'Archivos', icon: RareFilesIcon },
    { id: 'playit', label: 'Playit.gg', icon: RarePlayitIcon },
    { id: 'settings', label: 'Ajustes', icon: RareSettingsIcon },
  ];

  return (
    <>
      {/* Bottom Floating Bar for Smartphones */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 min-h-16 h-[calc(4rem+env(safe-area-inset-bottom))] bg-[#0b0f17]/95 backdrop-blur-lg border-t border-white/[0.08] px-1 pb-[env(safe-area-inset-bottom)] flex items-center justify-around z-30">
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex-1 min-w-0 min-h-11 flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-colors cursor-pointer ${
                isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon size={18} className="mb-0.5" />
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}

        <button
          onClick={onOpen}
          aria-expanded={isOpen}
          aria-label="Abrir más opciones"
          className={`flex-1 min-w-0 min-h-11 flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-colors cursor-pointer ${
            isOpen ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] tracking-tight">Más</span>
        </button>
      </div>

      {/* Slide-in Mobile Drawer with Framer Motion */}
      <AnimatePresence>
        {isOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* Drawer content */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-72 max-w-[80vw] bg-[#0b0f17] h-full border-r border-white/[0.08] p-5 flex flex-col justify-between shadow-2xl z-10"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <RareVersionsIcon size={18} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-white">MC Manager</h3>
                      <p className="text-[11px] text-emerald-400 font-mono">
                        {telemetry?.isRunning ? '● Servidor Activo' : '○ Detenido'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/[0.06] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  {drawerItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onSelectTab(item.id);
                          onClose();
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'text-slate-300 hover:bg-white/[0.04]'
                        }`}
                      >
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono truncate">{username || 'Admin'}</span>
                <button
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Salir</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
