import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { PlayitStatus } from '../../lib/types';
import { GlassShimmerButton } from '../../components/rareui/GlassShimmerButton';
import { RarePlayitIcon } from '../../components/rareui/RareIcons';
import { InfoTip } from '../../components/common/InfoTip';
import {
  Play,
  Square,
  RotateCw,
  Copy,
  Check,
  Terminal,
  Save,
  AlertCircle,
  ExternalLink,
  KeyRound,
  ShieldCheck,
  Smartphone,
  Server,
} from 'lucide-react';

export const PlayitView: React.FC = () => {
  const [status, setStatus] = useState<PlayitStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [localPort, setLocalPort] = useState(25565);
  const [bedrockLocalPort, setBedrockLocalPort] = useState(19132);
  const [configured, setConfigured] = useState(false);
  const [secretPath, setSecretPath] = useState('');
  const [binaryPath, setBinaryPath] = useState<string | null>(null);
  const [configSaving, setConfigSaving] = useState(false);
  const [playitSecret, setPlayitSecret] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlayit();
  }, []);

  const loadPlayit = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [data, config] = await Promise.all([api.getPlayitStatus(), api.getPlayitConfig()]);
      setStatus(data);
      setLocalPort(config.localPort);
      setBedrockLocalPort(config.bedrockLocalPort || 19132);
      setConfigured(config.configured);
      setSecretPath(config.secretPath);
      setBinaryPath(config.binaryPath);
      setError(data.lastError || null);
    } catch (err: any) {
      setError(err.message || 'No se pudo consultar Playit');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setConfigSaving(true);
    setError(null);
    try {
      const result = await api.savePlayitConfig({ localPort, bedrockLocalPort });
      setLocalPort(result.localPort);
      setBedrockLocalPort(result.bedrockLocalPort);
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar la configuración de puertos');
    } finally {
      setConfigSaving(false);
    }
  };

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    setActionLoading(true);
    setError(null);
    try {
      await api.executePlayitAction(action);
      await loadPlayit();
    } catch (err: any) {
      setError(err.message || 'No se pudo cambiar el estado de Playit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLink = async () => {
    if (!playitSecret.trim()) {
      setError('Pega la clave de vinculación de Playit antes de continuar');
      return;
    }

    setLinkLoading(true);
    setError(null);
    setLinkMessage(null);
    try {
      const result = await api.linkPlayit(playitSecret);
      setPlayitSecret('');
      setLinkMessage(result.message);
      await loadPlayit();
    } catch (err: any) {
      setError(err.message || 'No se pudo vincular el agente de Playit');
    } finally {
      setLinkLoading(false);
    }
  };

  const copyAddress = (domain: string, port: number, key: string) => {
    const address = `${domain}:${port}`;
    navigator.clipboard.writeText(address);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isRunning = Boolean(status?.isRunning);
  const tunnels = status?.tunnels || [];

  if (loading && !status) {
    return (
      <div className="bg-[#0b0f17] rounded-xl p-12 text-center text-slate-400 text-xs border border-white/[0.08]">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p>Cargando estado de Playit...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Playit Top Banner */}
      <div className="bg-[#0b0f17] rounded-xl p-5 border border-white/[0.08] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                isRunning
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                  : 'bg-white/[0.04] border-white/[0.08] text-slate-500'
              }`}
            >
              <RarePlayitIcon size={24} />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold text-white tracking-tight">Túnel Dual Playit.gg</h2>
                <InfoTip content="Conexión Anycast de baja latencia para Minecraft Java (TCP) y Bedrock (UDP) sin abrir puertos en el router." />
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider font-mono flex items-center gap-1.5 border ${
                    isRunning
                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                      : 'bg-white/[0.04] text-slate-400 border-white/[0.08]'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`} />
                  <span>{isRunning ? 'EN LÍNEA (DUAL)' : 'DETENIDO'}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isRunning ? (
              <GlassShimmerButton
                variant="cyan"
                size="sm"
                onClick={() => handleAction('start')}
                disabled={actionLoading}
              >
                <Play className="w-4 h-4 fill-cyan-400" />
                <span>Iniciar Túnel</span>
              </GlassShimmerButton>
            ) : (
              <>
                <GlassShimmerButton
                  variant="default"
                  size="sm"
                  onClick={() => handleAction('restart')}
                  disabled={actionLoading}
                >
                  <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Reiniciar</span>
                </GlassShimmerButton>

                <GlassShimmerButton
                  variant="rose"
                  size="sm"
                  onClick={() => handleAction('stop')}
                  disabled={actionLoading}
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Detener</span>
                </GlassShimmerButton>
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Agent configuration card */}
      <div className="bg-[#0b0f17] rounded-xl p-5 border border-white/[0.08] space-y-4">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white tracking-tight">Configuración del Agente Dual</h3>
            <InfoTip content="La identidad y asignaciones de puertos de Playit se conservan permanentemente en /data/playit." />
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
            configured
              ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
              : 'text-amber-300 border-amber-500/30 bg-amber-500/10'
          }`}>
            {configured ? 'Agente vinculado' : 'Requiere vinculación'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <label className="space-y-1 text-xs text-slate-400">
            <span className="block font-medium">Puerto local Java (TCP)</span>
            <input
              type="number"
              min={1}
              max={65535}
              value={localPort}
              onChange={(event) => setLocalPort(Number(event.target.value))}
              className="min-h-[44px] w-full px-3 py-2 rounded-lg bg-[#070a0f] border border-white/[0.1] text-white font-mono focus:outline-none focus:border-cyan-500/50"
            />
          </label>

          <label className="space-y-1 text-xs text-slate-400">
            <span className="block font-medium">Puerto local Bedrock (UDP)</span>
            <input
              type="number"
              min={1}
              max={65535}
              value={bedrockLocalPort}
              onChange={(event) => setBedrockLocalPort(Number(event.target.value))}
              className="min-h-[44px] w-full px-3 py-2 rounded-lg bg-[#070a0f] border border-white/[0.1] text-white font-mono focus:outline-none focus:border-cyan-500/50"
            />
          </label>

          <div className="text-[11px] text-slate-400 font-mono break-all pb-2">
            Identidad: {secretPath || 'se genera al vincular Playit'}
          </div>

          <GlassShimmerButton variant="cyan" size="sm" onClick={handleSaveConfig} disabled={configSaving}>
            {configSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Guardar puertos</span>
          </GlassShimmerButton>
        </div>

        <p className="text-[11px] text-slate-500 font-mono">Binario: {binaryPath || 'no encontrado en la imagen'}</p>

        {!configured ? (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg border border-amber-500/25 bg-amber-500/10 p-2 text-amber-300 shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-semibold text-amber-100">Vincula este agente con tu cuenta</h4>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-200/70 font-normal">
                  El agente está instalado, pero todavía no tiene identidad. Obtén una clave para este servidor en Playit y pégala aquí.
                </p>
                <a
                  href="https://playit.gg/account/setup/wizard/new-account/docker/mcserver-manager"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-cyan-300 hover:text-cyan-200 transition-colors"
                >
                  Obtener clave en Playit.gg
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <label htmlFor="playit-secret" className="sr-only">Clave de vinculación de Playit</label>
              <input
                id="playit-secret"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={playitSecret}
                onChange={(event) => setPlayitSecret(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void handleLink();
                }}
                placeholder="Pega aquí tu secret key de Playit"
                className="min-h-[44px] min-w-0 flex-1 px-3 py-2 rounded-lg bg-[#070a0f] border border-amber-500/25 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
              />
              <GlassShimmerButton
                variant="cyan"
                size="sm"
                onClick={handleLink}
                disabled={linkLoading || !playitSecret.trim()}
                aria-label="Vincular agente de Playit"
              >
                {linkLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                <span>{linkLoading ? 'Vinculando…' : 'Vincular agente'}</span>
              </GlassShimmerButton>
            </div>
            <p className="text-[10px] text-slate-500">
              La clave se envía una sola vez al agente local y no se almacena en la configuración del manager.
            </p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] px-3.5 py-3">
            <div className="flex items-center gap-2 text-[11px] text-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Identidad de Playit disponible para este contenedor.</span>
            </div>
            <a
              href="https://playit.gg/account/tunnels"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-cyan-300 hover:text-cyan-200 transition-colors"
            >
              Administrar túneles
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {linkMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-[11px] text-emerald-200">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{linkMessage}. El agente queda listo para publicar Minecraft.</span>
          </div>
        )}
      </div>

      {/* Active Tunnels Section (Dual Java + Bedrock) */}
      {tunnels.length > 0 && isRunning ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-white font-mono uppercase tracking-wider">
              Túneles Públicos Activos ({tunnels.length})
            </h3>
            <InfoTip content="Direcciones públicas Anycast asignadas. Los jugadores pueden conectarse usando el dominio y puerto público indicado." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tunnels.map((tunnel, idx) => {
              const isBedrock = tunnel.proto === 'udp' || tunnel.id.includes('bedrock');
              const key = `${tunnel.assignedDomain}:${tunnel.publicPort}`;
              return (
                <div
                  key={tunnel.id || idx}
                  className={`bg-[#0b0f17] rounded-xl p-5 border space-y-3 ${
                    isBedrock ? 'border-blue-500/30' : 'border-emerald-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isBedrock ? (
                        <Smartphone className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Server className="w-4 h-4 text-emerald-400" />
                      )}
                      <span className="text-xs font-bold text-white font-mono">
                        {tunnel.name || (isBedrock ? 'Minecraft Bedrock' : 'Minecraft Java')}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        isBedrock
                          ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {tunnel.proto.toUpperCase()} {tunnel.localPort}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#070a0f] border border-white/[0.08]">
                    <span className="font-mono text-cyan-300 text-xs font-bold truncate">
                      {tunnel.assignedDomain}:{tunnel.publicPort}
                    </span>
                    <button
                      onClick={() => copyAddress(tunnel.assignedDomain, tunnel.publicPort, key)}
                      className="min-h-[32px] px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 hover:text-white cursor-pointer flex items-center gap-1 text-xs"
                      title="Copiar IP pública"
                    >
                      {copiedKey === key ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>IP Anycast: {tunnel.publicAddress}</span>
                    <span className="text-slate-500">Local: 127.0.0.1:{tunnel.localPort}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : isRunning ? (
        <div className="bg-[#0b0f17] rounded-xl p-6 text-center text-cyan-200 border border-cyan-500/20 text-xs">
          El agente de Playit está conectado y esperando registrar los túneles en Anycast. Actualiza en unos segundos.
        </div>
      ) : (
        <div className="bg-[#0b0f17] rounded-xl p-6 text-center text-slate-500 border border-white/[0.08] text-xs">
          El proceso de Playit está detenido. Haz clic en "Iniciar Túnel" para conectar el servidor al mundo exterior.
        </div>
      )}

      {/* Playit Logs Viewer */}
      <div className="bg-[#0b0f17] rounded-xl p-5 border border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-semibold text-white tracking-tight font-mono">
              Logs del Proceso Playit-CLI
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Últimas líneas capturadas</span>
        </div>

        <div className="p-3.5 rounded-lg bg-[#070a0f] border border-white/[0.08] font-mono text-xs text-slate-300 space-y-1.5 max-h-64 overflow-y-auto leading-relaxed">
          {status?.logs && status.logs.length > 0 ? (
            status.logs.map((line, idx) => (
              <div key={idx} className="hover:bg-white/[0.02] px-1 py-0.5 rounded">
                <span className="text-cyan-500">&gt;</span> {line}
              </div>
            ))
          ) : (
            <div className="text-slate-600">No hay registros disponibles de Playit.</div>
          )}
        </div>
      </div>
    </div>
  );
};
