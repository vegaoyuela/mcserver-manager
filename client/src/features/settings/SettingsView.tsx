import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { PanelSettings, PathValidationStatus } from '../../lib/types';
import { RareSettingsIcon } from '../../components/rareui/RareIcons';
import { GlassShimmerButton } from '../../components/rareui/GlassShimmerButton';
import { FolderExplorerModal } from '../../components/common/FolderExplorerModal';
import { InfoTip } from '../../components/common/InfoTip';
import {
  FolderTree,
  CheckCircle2,
  XCircle,
  Save,
  Lock,
  RefreshCw,
  Terminal,
  Sparkles,
  FolderOpen,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<PanelSettings | null>(null);
  const [rootPath, setRootPath] = useState('/data');
  const [showFolderExplorer, setShowFolderExplorer] = useState(false);
  const [validation, setValidation] = useState<PathValidationStatus>({
    server: true,
    mods: true,
    properties: true,
    logs: true,
    playit: true,
    scripts: true,
  });

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState<string | null>(null);

  // AI Diagnostic Settings
  const [aiDiagnosticEnabled, setAiDiagnosticEnabled] = useState(false);
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiModel, setAiModel] = useState('gemini-3-flash-preview');

  const [saving, setSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
      setRootPath(data.serverRootPath || '/data');
      setAiDiagnosticEnabled(!!data.aiDiagnosticEnabled);
      setAiApiKey(data.aiApiKey || '');
      setAiModel(data.aiModel || 'gemini-3-flash-preview');

      if (data.serverRootPath) {
        handleValidatePath(data.serverRootPath);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const handleValidatePath = async (path: string) => {
    setIsValidating(true);
    try {
      const res = await api.validatePath(path);
      setValidation(res.paths);
    } catch {
      setValidation({
        server: false,
        mods: false,
        properties: false,
        logs: false,
        playit: false,
        scripts: false,
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.updateSettings({
        serverRootPath: rootPath,
        validatedPaths: validation,
        aiDiagnosticEnabled,
        aiApiKey,
        aiModel,
      } as any);
      setSuccessMessage('Ajustes guardados correctamente');
      setTimeout(() => setSuccessMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    if (!newPass) {
      setPassError('Introduce la nueva contraseña');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('Las contraseñas no coinciden');
      return;
    }
    api.changePassword(currentPass, newPass)
      .then(() => {
        setSuccessMessage('Contraseña actualizada con éxito');
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
        setTimeout(() => setSuccessMessage(null), 3000);
      })
      .catch((err: any) => setPassError(err.message || 'No se pudo actualizar la contraseña'));
  };

  const pathsList = [
    { key: 'server', label: 'server/' },
    { key: 'mods', label: 'server/mods/' },
    { key: 'properties', label: 'server.properties' },
    { key: 'logs', label: 'server/logs/' },
    { key: 'playit', label: 'playit/' },
    { key: 'scripts', label: 'scripts/' },
  ];

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="bg-[#0b0f17] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/[0.06] text-slate-200 border border-white/[0.08]">
            <RareSettingsIcon size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">Ajustes del Panel</h2>
              <InfoTip content="Configuración global del panel: rutas persistentes, contraseña maestra y modelo Google Gemini para diagnóstico." />
            </div>
          </div>
        </div>

        <GlassShimmerButton
          variant="emerald"
          size="sm"
          onClick={handleSaveSettings}
          disabled={saving}
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>Guardar Cambios</span>
        </GlassShimmerButton>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Path Configuration Card */}
      <div className="bg-[#0b0f17] rounded-xl p-4 sm:p-5 border border-white/[0.08] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Ruta Raíz del Servidor</h3>
            <InfoTip content="Ruta base del contenedor (/data) donde se almacenan server/, bedrock/, mods/ y playit/." />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={rootPath}
                onChange={(e) => setRootPath(e.target.value)}
                placeholder="/data"
                readOnly
                className="w-full px-3.5 py-2 bg-[#070a0f] border border-white/[0.1] rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500/50 pr-9"
              />
              <button
                type="button"
                onClick={() => handleValidatePath(rootPath)}
                disabled={isValidating}
                title="Reverificar ruta"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowFolderExplorer(true)}
              className="px-3.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
            >
              <FolderOpen className="w-4 h-4 text-emerald-400" />
              <span>Explorar</span>
            </button>
          </div>

          {/* Subdirectories Status */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {pathsList.map((item) => {
              const isValid = validation[item.key as keyof PathValidationStatus];
              return (
                <div
                  key={item.key}
                  className={`px-2.5 py-1 rounded-md border text-[11px] font-mono flex items-center gap-1.5 transition-colors ${
                    isValid
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/25 text-rose-300'
                  }`}
                >
                  {isValid ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
                  )}
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Security / Password Card */}
      <div className="bg-[#0b0f17] rounded-xl p-4 sm:p-5 border border-white/[0.08] space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-white/[0.08]">
          <Lock className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Seguridad & Contraseña</h3>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-3 max-w-md">
          {passError && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {passError}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-slate-400 block font-medium">Contraseña Actual</label>
            <input
              type="password"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-[#070a0f] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-400 block font-medium">Nueva Contraseña</label>
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-[#070a0f] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400 block font-medium">Confirmar</label>
              <input
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-[#070a0f] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-medium border border-white/[0.08] transition-colors cursor-pointer"
          >
            Actualizar Contraseña
          </button>
        </form>
      </div>

      {/* AI Diagnostic Card */}
      <div className="bg-[#0b0f17] rounded-xl p-4 sm:p-5 border border-white/[0.08] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">Diagnóstico con IA (Google Gemini)</h3>
            <InfoTip content="Analiza crash reports y dependencias faltantes automáticamente usando la API de Gemini." />
          </div>
          <button
            type="button"
            onClick={() => setAiDiagnosticEnabled(!aiDiagnosticEnabled)}
            className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
              aiDiagnosticEnabled ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${
                aiDiagnosticEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className={`space-y-3 max-w-lg transition-opacity duration-200 ${aiDiagnosticEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <div className="space-y-1">
            <label className="text-xs text-slate-400 block font-medium">Google Gemini API Key</label>
            <input
              type="password"
              value={aiApiKey}
              onChange={(e) => setAiApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 bg-[#070a0f] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-purple-500/50 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 block font-medium">Modelo</label>
            <input
              type="text"
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              placeholder="gemini-3-flash-preview"
              className="w-full px-3 py-2 bg-[#070a0f] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-purple-500/50 font-mono"
            />
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {['gemini-3-flash-preview', 'gemini-3.6-flash', 'gemini-3.8-flash'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setAiModel(m)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-mono border transition-all cursor-pointer ${
                    aiModel === m
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-semibold'
                      : 'bg-white/[0.04] text-slate-400 border-white/[0.08] hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Container runtime info card */}
      {settings && (
        <div className="bg-[#0b0f17] rounded-xl p-4 sm:p-5 border border-white/[0.08] space-y-3">
          <div className="flex items-center gap-2 pb-3 border-b border-white/[0.08]">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Almacenamiento y proceso</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-[#070a0f] border border-white/[0.08]">
              <span className="text-slate-500 block text-[10px]">DATOS PERSISTENTES</span>
              <span className="text-slate-200">{settings.storageRoot || '/data'}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#070a0f] border border-white/[0.08]">
              <span className="text-slate-500 block text-[10px]">MINECRAFT</span>
              <span className="text-cyan-400 font-semibold">Java / 25565</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#070a0f] border border-white/[0.08] col-span-2 sm:col-span-1">
              <span className="text-slate-500 block text-[10px]">ARRANQUE AUTOMÁTICO</span>
              <span className="text-emerald-400 font-semibold">
                {settings.minecraftAutostart ? 'Habilitado' : 'Deshabilitado'}
              </span>
            </div>
          </div>
        </div>
      )}

      <FolderExplorerModal
        isOpen={showFolderExplorer}
        onClose={() => setShowFolderExplorer(false)}
        onSelect={() => {
          setRootPath('/data');
          handleValidatePath('/data');
        }}
        initialPath={rootPath}
      />
    </div>
  );
};
