import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { MotdEditor } from './MotdEditor';
import { AnimatedTabs } from '../../components/rareui/AnimatedTab';
import { RarePropertiesIcon } from '../../components/rareui/RareIcons';
import { InfoTip } from '../../components/common/InfoTip';
import {
  Save,
  RotateCcw,
  Sparkles,
  Globe,
  Wifi,
  ShieldCheck,
  Code,
  AlertCircle,
  CheckCircle2,
  Server,
  Smartphone,
} from 'lucide-react';

export const PropertiesView: React.FC = () => {
  const [engine, setEngine] = useState<'java' | 'bedrock'>('java');
  const [properties, setProperties] = useState<Record<string, any>>({});
  const [initialProperties, setInitialProperties] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'world' | 'network' | 'rules' | 'motd' | 'raw'>('world');
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadProperties('java');
  }, []);

  const loadProperties = async (targetEngine = engine) => {
    setLoading(true);
    setNotification(null);
    try {
      const data = targetEngine === 'bedrock'
        ? await api.getBedrockProperties()
        : await api.getProperties();
      const nextProperties = data.properties || {};
      setProperties(nextProperties);
      setInitialProperties(nextProperties);

      const raw = data.raw || Object.entries(nextProperties)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');
      setRawText(raw);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || `Error al cargar server.properties de ${targetEngine.toUpperCase()}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (key: string, value: any) => {
    setProperties((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'online-mode' && value === false ? { 'enforce-secure-profile': false } : {}),
    }));
  };

  const handleRawChange = (text: string) => {
    setRawText(text);
    // Parse raw text into properties object
    const lines = text.split('\n');
    const newProps: Record<string, any> = {};
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const k = trimmed.substring(0, eqIdx).trim();
        const v = trimmed.substring(eqIdx + 1).trim();
        if (v === 'true') newProps[k] = true;
        else if (v === 'false') newProps[k] = false;
        else if (!isNaN(Number(v)) && v !== '') newProps[k] = Number(v);
        else newProps[k] = v;
      }
    }
    setProperties(newProps);
  };

  const handleSave = async () => {
    setSaving(true);
    setNotification(null);
    try {
      const res = engine === 'bedrock'
        ? await api.saveBedrockProperties(properties)
        : await api.saveProperties(properties);
      setInitialProperties({ ...properties });
      const raw = Object.entries(properties)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');
      setRawText(raw);
      setNotification({
        type: 'success',
        message: res.message || `¡server.properties (${engine.toUpperCase()}) guardado con éxito! Reinicia el servidor para aplicar cambios.`,
      });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error al guardar la configuración' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setProperties({ ...initialProperties });
    const raw = Object.entries(initialProperties)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    setRawText(raw);
    setNotification(null);
  };

  const tabs = [
    { id: 'world', label: 'Mundo', icon: Globe },
    { id: 'network', label: 'Red', icon: Wifi },
    { id: 'rules', label: 'Reglas', icon: ShieldCheck },
    { id: 'motd', label: 'MOTD', icon: Sparkles },
    { id: 'raw', label: 'Avanzado', icon: Code },
  ];

  if (loading) {
    return (
      <div className="bg-[#0b0f17] rounded-xl p-12 text-center text-slate-400 text-xs border border-white/[0.08]">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p>Cargando server.properties...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header & Save Button */}
      <div className="bg-[#0b0f17] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <RarePropertiesIcon size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-white tracking-tight">Configuración del Servidor</h2>
              <InfoTip content="Ajustes de server.properties con persistencia atómica en disco para Java y Bedrock." />
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                engine === 'bedrock'
                  ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}>
                {engine.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/[0.08]">
            <button
              type="button"
              onClick={() => {
                setEngine('java');
                loadProperties('java');
              }}
              className={`min-h-[32px] px-2.5 py-1 rounded text-[11px] font-mono transition-colors flex items-center gap-1 cursor-pointer ${
                engine === 'java'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Server className="w-3 h-3" />
              <span>Java</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEngine('bedrock');
                loadProperties('bedrock');
              }}
              className={`min-h-[32px] px-2.5 py-1 rounded text-[11px] font-mono transition-colors flex items-center gap-1 cursor-pointer ${
                engine === 'bedrock'
                  ? 'bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              <span>Bedrock</span>
            </button>
          </div>

          <button
            onClick={handleReset}
            disabled={saving}
            className="min-h-[44px] px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium border border-white/[0.08] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="min-h-[44px] px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Guardar Cambios</span>
          </button>
        </div>
      </div>

      {/* Alert banner if exists */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <div className="text-xs">
            <span className="font-semibold block">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <AnimatedTabs
        tabs={tabs.map((t) => ({ id: t.id, label: t.label, icon: <t.icon className="w-4 h-4" /> }))}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as any)}
        layoutId="properties-tabs"
      />

      {properties['online-mode'] === false && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Modo no premium habilitado</p>
            <p className="text-amber-100/70 mt-0.5 font-normal">
              El servidor no validará cuentas con los servicios oficiales. Usa una whitelist y protege el acceso al panel.
            </p>
          </div>
        </div>
      )}

      {/* Tab Panels */}
      <div className="bg-[#0b0f17] rounded-xl p-5 sm:p-6 border border-white/[0.08]">
        {/* TAB 1: World & Gameplay */}
        {activeTab === 'world' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 block">Modo de Juego Predeterminado</label>
              <select
                value={properties['gamemode'] || 'survival'}
                onChange={(e) => handleFieldChange('gamemode', e.target.value)}
                className="w-full px-3.5 py-2 bg-[#070a0f] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="survival">Supervivencia (Survival)</option>
                <option value="creative">Creativo (Creative)</option>
                <option value="adventure">Aventura (Adventure)</option>
                <option value="spectator">Espectador (Spectator)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 block">Dificultad</label>
              <select
                value={properties['difficulty'] || 'normal'}
                onChange={(e) => handleFieldChange('difficulty', e.target.value)}
                className="w-full px-3.5 py-2 bg-[#070a0f] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="peaceful">Pacífico (Peaceful)</option>
                <option value="easy">Fácil (Easy)</option>
                <option value="normal">Normal</option>
                <option value="hard">Difícil (Hard)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 block">Nombre del Nivel / Mundo</label>
              <input
                type="text"
                value={properties['level-name'] || 'world'}
                onChange={(e) => handleFieldChange('level-name', e.target.value)}
                className="w-full px-3.5 py-2 bg-[#070a0f] border border-white/[0.1] rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 block">Semilla del Mundo (level-seed)</label>
              <input
                type="text"
                value={properties['level-seed'] || ''}
                onChange={(e) => handleFieldChange('level-seed', e.target.value)}
                placeholder="Dejar vacío para aleatoria"
                className="w-full px-3.5 py-2 bg-[#070a0f] border border-white/[0.1] rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#070a0f] border border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white">Modo Hardcore</span>
                <InfoTip content="Muerte permanente y dificultad bloqueada en difícil." />
              </div>
              <input
                type="checkbox"
                checked={Boolean(properties['hardcore'])}
                onChange={(e) => handleFieldChange('hardcore', e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#070a0f] border border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white">Generar Estructuras</span>
                <InfoTip content="Genera aldeas, fortalezas, templos, minas y mazmorras." />
              </div>
              <input
                type="checkbox"
                checked={Boolean(properties['generate-structures'] !== false)}
                onChange={(e) => handleFieldChange('generate-structures', e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500"
              />
            </div>
          </div>
        )}

        {/* TAB 2: Network & Performance */}
        {activeTab === 'network' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 block">Puerto del Servidor (server-port)</label>
              <input
                type="number"
                value={properties['server-port'] || 25565}
                onChange={(e) => handleFieldChange('server-port', Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-[#070a0f] border border-white/[0.1] rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 block">Máximo de Jugadores (max-players)</label>
              <input
                type="number"
                value={properties['max-players'] || 20}
                onChange={(e) => handleFieldChange('max-players', Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-[#070a0f] border border-white/[0.1] rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 block">
                Distancia de Renderizado (view-distance: {properties['view-distance'] || 10} chunks)
              </label>
              <input
                type="range"
                min="4"
                max="32"
                value={properties['view-distance'] || 10}
                onChange={(e) => handleFieldChange('view-distance', Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 block">
                Distancia de Simulación (simulation-distance: {properties['simulation-distance'] || 10} chunks)
              </label>
              <input
                type="range"
                min="4"
                max="16"
                value={properties['simulation-distance'] || 10}
                onChange={(e) => handleFieldChange('simulation-distance', Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#070a0f] border border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white">Combate Jugador vs Jugador (PvP)</span>
                <InfoTip content="Permite daño directo entre jugadores en el servidor." />
              </div>
              <input
                type="checkbox"
                checked={Boolean(properties['pvp'] !== false)}
                onChange={(e) => handleFieldChange('pvp', e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#070a0f] border border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white">Permitir Vuelo (allow-flight)</span>
                <InfoTip content="Evita expulsiones automáticas por velocidad al volar con elytra o mods." />
              </div>
              <input
                type="checkbox"
                checked={Boolean(properties['allow-flight'])}
                onChange={(e) => handleFieldChange('allow-flight', e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500"
              />
            </div>
          </div>
        )}

        {/* TAB 3: Rules & Security */}
        {activeTab === 'rules' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-lg bg-[#070a0f] border border-amber-500/25">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white">Permitir jugadores no premium</span>
                <InfoTip content="Desactiva la validación con servidores de Mojang/Xbox (online-mode=false)." />
              </div>
              <input
                id="allow-offline-players"
                aria-label="Permitir jugadores no premium"
                type="checkbox"
                checked={properties['online-mode'] === false}
                onChange={(e) => handleFieldChange('online-mode', !e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#070a0f] border border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white">Lista Blanca (white-list)</span>
                <InfoTip content="Solo jugadores registrados en whitelist.json pueden ingresar." />
              </div>
              <input
                type="checkbox"
                checked={Boolean(properties['white-list'])}
                onChange={(e) => handleFieldChange('white-list', e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#070a0f] border border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white">Habilitar Nether (allow-nether)</span>
                <InfoTip content="Permite teletransporte mediante portales y generación del inframundo." />
              </div>
              <input
                type="checkbox"
                checked={Boolean(properties['allow-nether'] !== false)}
                onChange={(e) => handleFieldChange('allow-nether', e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#070a0f] border border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white">Bloques de Comandos</span>
                <InfoTip content="Permite ejecución automática de comandos mediante bloques de comandos." />
              </div>
              <input
                type="checkbox"
                checked={Boolean(properties['enable-command-block'])}
                onChange={(e) => handleFieldChange('enable-command-block', e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500"
              />
            </div>
          </div>
        )}

        {/* TAB 4: MOTD Editor */}
        {activeTab === 'motd' && (
          <MotdEditor
            value={properties['motd'] || ''}
            onChange={(newMotd) => handleFieldChange('motd', newMotd)}
          />
        )}

        {/* TAB 5: Raw Editor */}
        {activeTab === 'raw' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-normal">Edición directa del archivo plano</span>
              <span className="font-mono text-emerald-400">server.properties</span>
            </div>
            <textarea
              rows={18}
              value={rawText}
              onChange={(e) => handleRawChange(e.target.value)}
              className="w-full p-4 bg-[#070a0f] border border-white/[0.1] rounded-lg text-xs font-mono text-emerald-300 leading-relaxed focus:outline-none focus:border-emerald-500/50"
              spellCheck={false}
            />
          </div>
        )}
      </div>
    </div>
  );
};
