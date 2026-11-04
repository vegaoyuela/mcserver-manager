import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Play, Square, RotateCw, Skull, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface QuickActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isRunning: boolean;
  onExecute: (action: 'start' | 'stop' | 'restart' | 'kill') => Promise<void>;
  actionPending: boolean;
}

export const QuickActionsModal: React.FC<QuickActionsModalProps> = ({
  isOpen,
  onClose,
  isRunning,
  onExecute,
  actionPending,
}) => {
  const [confirmAction, setConfirmAction] = useState<'stop' | 'restart' | 'kill' | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTrigger = async (action: 'start' | 'stop' | 'restart' | 'kill') => {
    if (action === 'start') {
      setLoading(true);
      await onExecute('start');
      setLoading(false);
      onClose();
    } else {
      setConfirmAction(action);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setLoading(true);
    await onExecute(confirmAction);
    setLoading(false);
    setConfirmAction(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Acciones de Energía del Servidor">
      {confirmAction ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-300">
                Confirmar {confirmAction === 'stop' ? 'Detención' : confirmAction === 'restart' ? 'Reinicio' : 'Apagado Forzado'}
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                {confirmAction === 'stop' && 'Se enviará el comando /stop a la consola del proceso para guardar el mundo de forma segura y desconectar a los jugadores.'}
                {confirmAction === 'restart' && 'El servidor se detendrá de manera segura y volverá a iniciar el proceso Java.'}
                {confirmAction === 'kill' && '¡ATENCIÓN! Se enviará SIGKILL directo al proceso. Podría provocar pérdida de chunks que no hayan sido guardados.'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              onClick={() => setConfirmAction(null)}
              disabled={loading || actionPending}
              className="px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmAction}
              disabled={loading || actionPending}
              className={`px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all flex items-center gap-2 cursor-pointer ${
                confirmAction === 'kill'
                  ? 'bg-rose-600 hover:bg-rose-500'
                  : 'bg-amber-600 hover:bg-amber-500'
              }`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Proceder con {confirmAction.toUpperCase()}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          {!isRunning ? (
            <button
              onClick={() => handleTrigger('start')}
              disabled={loading || actionPending}
              className="w-full p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 text-emerald-400 font-medium text-xs flex items-center justify-between transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Play className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="font-semibold block text-white text-sm">Iniciar Servidor</span>
                  <span className="text-slate-400 text-xs font-normal">Ejecuta el script de inicio start.sh</span>
                </div>
              </div>
            </button>
          ) : (
            <>
              <button
                onClick={() => handleTrigger('restart')}
                disabled={loading || actionPending}
                className="w-full p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 text-amber-400 font-medium text-xs flex items-center justify-between transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                    <RotateCw className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="font-semibold block text-white text-sm">Reiniciar Servidor</span>
                    <span className="text-slate-400 text-xs font-normal">Detención suave y arranque inmediato</span>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleTrigger('stop')}
                disabled={loading || actionPending}
                className="w-full p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 text-rose-300 font-medium text-xs flex items-center justify-between transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
                    <Square className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="font-semibold block text-white text-sm">Detener Servidor (/stop)</span>
                    <span className="text-slate-400 text-xs font-normal">Guarda el mundo y cierra sesión limpiamente</span>
                  </div>
                </div>
              </button>

              <div className="pt-2 border-t border-white/[0.08]">
                <button
                  onClick={() => handleTrigger('kill')}
                  disabled={loading}
                  className="w-full p-3 rounded-xl bg-[#070a0f] border border-rose-500/25 hover:bg-rose-950/20 text-rose-400 font-medium text-xs flex items-center justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-rose-950/40 text-rose-400">
                      <Skull className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="font-semibold block text-rose-300 text-xs">Forzar Apagado (Kill Inmediato)</span>
                      <span className="text-slate-500 text-[11px] font-normal">Uso solo en caso de cuelgue o freeze</span>
                    </div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
};
