import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { OpPlayer, WhitelistPlayer, BannedPlayer, BannedIp } from '../../lib/types';
import { Modal } from '../../components/common/Modal';
import { AnimatedTabs } from '../../components/rareui/AnimatedTab';
import { RarePlayersIcon } from '../../components/rareui/RareIcons';
import { InfoTip } from '../../components/common/InfoTip';
import {
  Shield,
  CheckCircle,
  Ban,
  UserPlus,
  Trash2,
  HelpCircle,
  Search,
} from 'lucide-react';

const OP_LEVELS: Record<number, { title: string; desc: string }> = {
  1: { title: 'Nivel 1 - Moderador básico', desc: 'Puede ignorar la protección de spawn' },
  2: { title: 'Nivel 2 - Comandos de juego', desc: 'Acceso a /clear, /difficulty, /effect, /gamemode, /give y bloques de comando' },
  3: { title: 'Nivel 3 - Moderador del servidor', desc: 'Acceso a /ban, /kick, /op y control de jugadores' },
  4: { title: 'Nivel 4 - Administrador total', desc: 'Acceso ilimitado incluyendo /stop, /save-all y control del host' },
};

export const PlayersView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ops' | 'whitelist' | 'bans'>('ops');
  const [ops, setOps] = useState<OpPlayer[]>([]);
  const [whitelist, setWhitelist] = useState<WhitelistPlayer[]>([]);
  const [bannedPlayers, setBannedPlayers] = useState<BannedPlayer[]>([]);
  const [bannedIps, setBannedIps] = useState<BannedIp[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddOpOpen, setIsAddOpOpen] = useState(false);
  const [newOpName, setNewOpName] = useState('');
  const [newOpLevel, setNewOpLevel] = useState(4);

  const [isAddWhitelistOpen, setIsAddWhitelistOpen] = useState(false);
  const [newWhitelistName, setNewWhitelistName] = useState('');

  const [isAddBanOpen, setIsAddBanOpen] = useState(false);
  const [banType, setBanType] = useState<'player' | 'ip'>('player');
  const [banTarget, setBanTarget] = useState('');
  const [banReason, setBanReason] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [opsData, wlData, bansData] = await Promise.all([
        api.getOps(),
        api.getWhitelist(),
        api.getBans(),
      ]);
      setOps(opsData);
      setWhitelist(wlData);
      setBannedPlayers(bansData.players);
      setBannedIps(bansData.ips);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpName.trim()) return;
    await api.addOp(newOpName.trim(), newOpLevel);
    setNewOpName('');
    setIsAddOpOpen(false);
    loadData();
  };

  const handleRemoveOp = async (uuid: string) => {
    await api.removeOp(uuid);
    loadData();
  };

  const handleAddWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWhitelistName.trim()) return;
    await api.addWhitelist(newWhitelistName.trim());
    setNewWhitelistName('');
    setIsAddWhitelistOpen(false);
    loadData();
  };

  const handleRemoveWhitelist = async (name: string) => {
    await api.removeWhitelist(name);
    loadData();
  };

  const handleUnbanPlayer = async (name: string) => {
    await api.unbanPlayer(name);
    loadData();
  };

  const handleUnbanIp = async (ip: string) => {
    await api.unbanIp(ip);
    loadData();
  };

  const handleAddBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banTarget.trim()) return;
    if (banType === 'player') {
      await api.kickPlayer(banTarget.trim(), banReason || 'Baneado manualmente');
    }
    setBanTarget('');
    setBanReason('');
    setIsAddBanOpen(false);
    loadData();
  };

  if (loading) {
    return (
      <div className="bg-[#0b0f17] rounded-xl p-12 text-center text-slate-400 text-xs border border-white/[0.08]">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p>Cargando jugadores y permisos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="bg-[#0b0f17] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <RarePlayersIcon size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white tracking-tight">Control de Jugadores</h2>
              <InfoTip content="Gestión de OPs (ops.json), Lista Blanca (whitelist.json) y Baneos persistentes por usuario o dirección IP." />
            </div>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar jugador o IP..."
            className="w-full pl-9 pr-3 py-2 bg-[#070a0f] border border-white/[0.1] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
      </div>

      {/* Tabs */}
      <AnimatedTabs
        tabs={[
          { id: 'ops', label: 'Operadores (OPs)', badge: ops.length, icon: <Shield className="w-4 h-4 text-amber-400" /> },
          { id: 'whitelist', label: 'Lista Blanca', badge: whitelist.length, icon: <CheckCircle className="w-4 h-4 text-emerald-400" /> },
          { id: 'bans', label: 'Baneos', badge: bannedPlayers.length + bannedIps.length, icon: <Ban className="w-4 h-4 text-rose-400" /> },
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as any)}
        layoutId="players-tabs"
      />

      {/* TAB 1: OPS */}
      {activeTab === 'ops' && (
        <div className="bg-[#0b0f17] rounded-xl p-5 border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">Operadores (OPs)</span>
              <InfoTip content="Nivel 1 (Spawn), Nivel 2 (Comandos de juego), Nivel 3 (Kicks/Bans), Nivel 4 (Control total del servidor)." />
            </div>
            <button
              onClick={() => setIsAddOpOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Añadir Operador</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070a0f] text-slate-400 font-mono uppercase text-[11px] border-b border-white/[0.08]">
                <tr>
                  <th className="p-3">Jugador</th>
                  <th className="p-3">UUID</th>
                  <th className="p-3">Nivel de Permiso</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {ops
                  .filter((op) => op.name.toLowerCase().includes(search.toLowerCase()))
                  .map((op) => (
                    <tr key={op.uuid} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 flex items-center gap-2.5">
                        <img
                          src={`https://crafatar.com/avatars/${op.uuid}?size=32&default=MHF_Steve&overlay`}
                          alt={op.name}
                          className="w-8 h-8 rounded-lg shadow-sm bg-slate-800 shrink-0 border border-white/[0.08]"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://minotar.net/avatar/${op.name}/32`;
                          }}
                        />
                        <span className="font-semibold text-white text-xs">{op.name}</span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-400">{op.uuid}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-mono font-semibold text-[11px] border border-amber-500/20">
                            Nivel {op.level}
                          </span>
                          <span className="text-[11px] text-slate-400 hidden sm:inline">
                            {OP_LEVELS[op.level]?.title || ''}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleRemoveOp(op.uuid)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Revocar rango OP"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Whitelist */}
      {activeTab === 'whitelist' && (
        <div className="bg-[#0b0f17] rounded-xl p-5 border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">Lista Blanca</span>
              <InfoTip content="Solo jugadores registrados en whitelist.json pueden ingresar cuando la opción está activa." />
            </div>
            <button
              onClick={() => setIsAddWhitelistOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Añadir a Whitelist</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {whitelist
              .filter((w) => w.name.toLowerCase().includes(search.toLowerCase()))
              .map((w) => (
                <div
                  key={w.name}
                  className="p-3 rounded-xl bg-[#070a0f] border border-white/[0.06] hover:border-white/[0.14] flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={`https://minotar.net/avatar/${w.name}/32`}
                      alt={w.name}
                      className="w-8 h-8 rounded-lg bg-slate-800 border border-white/[0.08]"
                    />
                    <span className="font-semibold text-white text-xs">{w.name}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveWhitelist(w.name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                    title="Eliminar de la lista blanca"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 3: Bans */}
      {activeTab === 'bans' && (
        <div className="space-y-4">
          <div className="bg-[#0b0f17] rounded-xl p-5 border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                Jugadores Baneados (banned-players.json)
              </h3>
              <button
                onClick={() => setIsAddBanOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Nuevo Baneo</span>
              </button>
            </div>
            {bannedPlayers.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">No hay jugadores baneados</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#070a0f] text-slate-400 font-mono uppercase text-[11px] border-b border-white/[0.08]">
                    <tr>
                      <th className="p-3">Jugador</th>
                      <th className="p-3">Motivo</th>
                      <th className="p-3">Fecha</th>
                      <th className="p-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {bannedPlayers.map((b) => (
                      <tr key={b.name} className="hover:bg-white/[0.02]">
                        <td className="p-3 font-semibold text-rose-300">{b.name}</td>
                        <td className="p-3 text-slate-300">{b.reason}</td>
                        <td className="p-3 text-slate-500 font-mono text-[11px]">{b.created}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleUnbanPlayer(b.name)}
                            className="px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-emerald-600 hover:text-white text-slate-300 text-xs transition-colors cursor-pointer"
                          >
                            Desbanear
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-[#0b0f17] rounded-xl p-5 border border-white/[0.08] space-y-3">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
              Direcciones IP Bloqueadas (banned-ips.json)
            </h3>
            {bannedIps.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">No hay IPs baneadas</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#070a0f] text-slate-400 font-mono uppercase text-[11px] border-b border-white/[0.08]">
                    <tr>
                      <th className="p-3">IP</th>
                      <th className="p-3">Motivo</th>
                      <th className="p-3">Fecha</th>
                      <th className="p-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {bannedIps.map((b) => (
                      <tr key={b.ip} className="hover:bg-white/[0.02]">
                        <td className="p-3 font-semibold font-mono text-rose-300">{b.ip}</td>
                        <td className="p-3 text-slate-300">{b.reason}</td>
                        <td className="p-3 text-slate-500 font-mono text-[11px]">{b.created}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleUnbanIp(b.ip)}
                            className="px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-emerald-600 hover:text-white text-slate-300 text-xs transition-colors cursor-pointer"
                          >
                            Desbloquear IP
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Add OP */}
      <Modal isOpen={isAddOpOpen} onClose={() => setIsAddOpOpen(false)} title="Añadir Nuevo Operador (OP)">
        <form onSubmit={handleAddOp} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 block">Nombre de Usuario de Minecraft</label>
            <input
              type="text"
              value={newOpName}
              onChange={(e) => setNewOpName(e.target.value)}
              placeholder="Ej: Notch"
              className="w-full px-3.5 py-2 bg-[#070a0f] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-amber-500/50 font-mono"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 block">Nivel de Permisos</label>
            <select
              value={newOpLevel}
              onChange={(e) => setNewOpLevel(Number(e.target.value))}
              className="w-full px-3.5 py-2 bg-[#070a0f] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-amber-500/50"
            >
              <option value={1}>Nivel 1 - Mod básico (bypasa spawn-protection)</option>
              <option value={2}>Nivel 2 - Comandos de juego (/give, /gamemode)</option>
              <option value={3}>Nivel 3 - Moderador (/kick, /ban, /op)</option>
              <option value={4}>Nivel 4 - Administrador completo (/stop, recarga)</option>
            </select>
          </div>

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{OP_LEVELS[newOpLevel]?.title}</span>
            </div>
            <p className="text-slate-400 text-[11px] font-normal">{OP_LEVELS[newOpLevel]?.desc}</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddOpOpen(false)}
              className="px-3.5 py-2 rounded-lg bg-white/[0.06] text-slate-300 text-xs hover:bg-white/[0.1] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold cursor-pointer"
            >
              Asignar Rango OP
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Add Whitelist */}
      <Modal isOpen={isAddWhitelistOpen} onClose={() => setIsAddWhitelistOpen(false)} title="Añadir a Whitelist">
        <form onSubmit={handleAddWhitelist} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 block">Nombre de Usuario de Minecraft</label>
            <input
              type="text"
              value={newWhitelistName}
              onChange={(e) => setNewWhitelistName(e.target.value)}
              placeholder="Ej: Alex"
              className="w-full px-3.5 py-2 bg-[#070a0f] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500/50 font-mono"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddWhitelistOpen(false)}
              className="px-3.5 py-2 rounded-lg bg-white/[0.06] text-slate-300 text-xs hover:bg-white/[0.1] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
            >
              Añadir a Lista Blanca
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Add Ban */}
      <Modal isOpen={isAddBanOpen} onClose={() => setIsAddBanOpen(false)} title="Aplicar Nuevo Baneo">
        <form onSubmit={handleAddBan} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 block">Tipo de Baneo</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBanType('player')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                  banType === 'player'
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-semibold'
                    : 'bg-[#070a0f] border-white/[0.08] text-slate-400'
                }`}
              >
                Jugador (Usuario)
              </button>
              <button
                type="button"
                onClick={() => setBanType('ip')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                  banType === 'ip'
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-semibold'
                    : 'bg-[#070a0f] border-white/[0.08] text-slate-400'
                }`}
              >
                Dirección IP
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 block">
              {banType === 'player' ? 'Nombre de Usuario' : 'Dirección IP'}
            </label>
            <input
              type="text"
              value={banTarget}
              onChange={(e) => setBanTarget(e.target.value)}
              placeholder={banType === 'player' ? 'Ej: BadPlayer123' : 'Ej: 192.168.1.50'}
              className="w-full px-3.5 py-2 bg-[#070a0f] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-rose-500/50 font-mono"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 block">Motivo del Baneo</label>
            <input
              type="text"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Ej: Uso de hacks o griefing"
              className="w-full px-3.5 py-2 bg-[#070a0f] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-rose-500/50"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddBanOpen(false)}
              className="px-3.5 py-2 rounded-lg bg-white/[0.06] text-slate-300 text-xs hover:bg-white/[0.1] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
            >
              Confirmar Baneo
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
