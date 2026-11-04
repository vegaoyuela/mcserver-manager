import React, { useState } from 'react';
import { Player } from '../../lib/types';
import { Users, Shield, UserX, Ban, Wifi } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { InfoTip } from '../../components/common/InfoTip';

interface ConnectedPlayersListProps {
  players: Player[];
  maxPlayers: number;
  onKick: (name: string, reason?: string) => Promise<void>;
  onBan: (name: string, reason?: string) => Promise<void>;
  onToggleOp: (name: string, isOp: boolean) => Promise<void>;
}

export const ConnectedPlayersList: React.FC<ConnectedPlayersListProps> = ({
  players,
  maxPlayers,
  onKick,
  onBan,
  onToggleOp,
}) => {
  const [activePlayer, setActivePlayer] = useState<Player | null>(null);
  const [actionType, setActionType] = useState<'kick' | 'ban' | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleActionConfirm = async () => {
    if (!activePlayer || !actionType) return;
    setLoading(true);
    try {
      if (actionType === 'kick') {
        await onKick(activePlayer.name, reason || 'Expulsado por administrador');
      } else if (actionType === 'ban') {
        await onBan(activePlayer.name, reason || 'Baneado por administrador');
      }
      setActivePlayer(null);
      setActionType(null);
      setReason('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0b0f17] rounded-xl p-5 border border-white/[0.08]">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Users className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white tracking-tight">Jugadores en Línea</h3>
            <InfoTip content="Lista en vivo de jugadores conectados en el mundo con ping y controles de moderación (kick, ban, op)." />
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-slate-300">
          <span className="font-semibold text-emerald-400">{players.length}</span>
          <span className="text-slate-500">/</span>
          <span>{maxPlayers > 0 ? maxPlayers : '—'}</span>
        </div>
      </div>

      {players.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-xs space-y-2">
          <div className="w-10 h-10 mx-auto rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-400">
            <Users className="w-5 h-5" />
          </div>
          <p>No hay jugadores conectados actualmente</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {players.map((player) => (
            <div
              key={player.uuid || player.name}
              className="p-3 rounded-xl bg-[#070a0f] border border-white/[0.06] hover:border-white/[0.14] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={`https://crafatar.com/avatars/${player.uuid || player.name}?size=40&default=MHF_Steve&overlay`}
                  alt={player.name}
                  className="w-10 h-10 rounded-lg shadow-sm bg-slate-800 shrink-0 image-pixelated border border-white/[0.08]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://minotar.net/avatar/${player.name}/40`;
                  }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white truncate block">{player.name}</span>
                    {player.isOp && (
                      <span title="Operador del servidor">
                        <Shield className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-mono">
                    {player.ping !== undefined && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Wifi className="w-3 h-3 text-emerald-400" />
                        <span>{player.ping}ms</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onToggleOp(player.name, Boolean(player.isOp))}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    player.isOp
                      ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                      : 'text-slate-400 hover:text-amber-400 hover:bg-white/[0.06]'
                  }`}
                  title={player.isOp ? 'Quitar OP' : 'Hacer OP'}
                >
                  <Shield className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    setActivePlayer(player);
                    setActionType('kick');
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                  title="Expulsar jugador (Kick)"
                >
                  <UserX className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    setActivePlayer(player);
                    setActionType('ban');
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Banear jugador"
                >
                  <Ban className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal for Kick/Ban */}
      <Modal
        isOpen={Boolean(activePlayer && actionType)}
        onClose={() => {
          setActivePlayer(null);
          setActionType(null);
          setReason('');
        }}
        title={actionType === 'kick' ? `Expulsar a ${activePlayer?.name}` : `Banear a ${activePlayer?.name}`}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            {actionType === 'kick'
              ? 'El jugador será desconectado del servidor inmediatamente, pero podrá volver a entrar.'
              : 'El jugador será expulsado y su nombre se añadirá a la lista de baneados permanentes.'}
          </p>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">
              Razón (Opcional):
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Uso de trampas / Conducta inapropiada"
              className="w-full px-3 py-2 rounded-lg bg-[#070a0f] border border-white/[0.1] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setActivePlayer(null);
                setActionType(null);
                setReason('');
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleActionConfirm}
              disabled={loading}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer ${
                actionType === 'kick'
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              {loading ? 'Procesando...' : actionType === 'kick' ? 'Confirmar Expulsión' : 'Confirmar Baneo'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
