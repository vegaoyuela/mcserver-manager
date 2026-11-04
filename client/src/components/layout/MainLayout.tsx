import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { QuickActionsModal } from '../../features/dashboard/QuickActionsModal';
import { ModUploadStatus } from '../../features/mods/ModUploadStatus';
import { TelemetryData, PlayitStatus } from '../../lib/types';
import { AlertCircle } from 'lucide-react';

interface MainLayoutProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  telemetry: TelemetryData | null;
  playit: PlayitStatus | null;
  onServerAction: (action: 'start' | 'stop' | 'restart' | 'kill') => Promise<void>;
  serverActionPending: boolean;
  serverActionError: string | null;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  currentTab,
  onSelectTab,
  telemetry,
  playit,
  onServerAction,
  serverActionPending,
  serverActionError,
  children,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPowerModalOpen, setIsPowerModalOpen] = useState(false);
  const controlError = serverActionError || telemetry?.controlError || null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#070a0f] text-slate-100">
      {/* Desktop Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        telemetry={telemetry}
        onOpenPowerModal={() => setIsPowerModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Topbar */}
        <Topbar
          currentTab={currentTab}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          telemetry={telemetry}
          playit={playit}
          onServerAction={onServerAction}
          actionPending={serverActionPending}
        />

        {/* Global Control Error Banner */}
        {controlError && (
          <div className="px-4 sm:px-6 pt-3" role="alert">
            <div className="max-w-7xl mx-auto rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200 flex items-center gap-2.5 shadow-sm">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{controlError}</span>
            </div>
          </div>
        )}

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-6">
          <div className="max-w-7xl mx-auto w-full">{children}</div>
        </main>
      </div>

      {/* Mobile Navigation Drawer & Bottom Bar */}
      <MobileNav
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        isOpen={isMobileMenuOpen}
        onOpen={() => setIsMobileMenuOpen(true)}
        onClose={() => setIsMobileMenuOpen(false)}
        telemetry={telemetry}
      />

      {/* Global Quick Actions Modal */}
      <QuickActionsModal
        isOpen={isPowerModalOpen}
        onClose={() => setIsPowerModalOpen(false)}
        isRunning={Boolean(telemetry?.isRunning)}
        onExecute={onServerAction}
        actionPending={serverActionPending}
      />

      <ModUploadStatus onOpenMods={() => onSelectTab('mods')} />
    </div>
  );
};
