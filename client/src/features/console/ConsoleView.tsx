import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useConsoleWs } from './useConsoleWs';
import { XtermTerminal } from './XtermTerminal';
import { InfoTip } from '../../components/common/InfoTip';
import {
  Terminal as TerminalIcon,
  Trash2,
  ArrowDown,
  Send,
  Download,
  Wifi,
  Smartphone,
  Server,
} from 'lucide-react';

export const ConsoleView: React.FC = () => {
  const { status, logs, serverFilter, setServerFilter, sendCommand, clearLogs } = useConsoleWs();
  const [command, setCommand] = useState('');
  const [targetEngine, setTargetEngine] = useState<'java' | 'bedrock'>('java');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [autoScroll, setAutoScroll] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = command.trim();
    if (!trimmed) return;

    // Add to history
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);

    // Send via WebSocket targeting active engine
    sendCommand(trimmed, targetEngine);
    setCommand('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setCommand(history[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) {
        setHistoryIndex(-1);
        setCommand('');
      } else {
        setHistoryIndex(nextIndex);
        setCommand(history[nextIndex]);
      }
    }
  };

  const handleDownloadLogs = () => {
    const cleanLogs = logs.map((l) => l.replace(/\x1b\[[0-9;]*m/g, '')).join('\n');
    const blob = new Blob([cleanLogs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mc-server-log-${targetEngine}-${new Date().toISOString().substring(0, 10)}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const quickCommands = targetEngine === 'bedrock'
    ? [
        { label: 'list', cmd: 'list' },
        { label: 'whitelist', cmd: 'whitelist list' },
        { label: 'save-hold', cmd: 'save hold' },
        { label: 'help', cmd: 'help' },
        { label: 'say ¡Hola Bedrock!', cmd: 'say ¡Hola a todos en Bedrock!' },
      ]
    : [
        { label: 'list', cmd: 'list' },
        { label: 'tps', cmd: 'neoforge tps' },
        { label: 'save-all', cmd: 'save-all' },
        { label: 'help', cmd: 'help' },
        { label: 'say ¡Hola Java!', cmd: 'say ¡Hola a todos en el servidor!' },
      ];

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-8rem)]">
      {/* Top Console Controls */}
      <div className="bg-[#0b0f17] rounded-xl p-3 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-white/[0.08] shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
            <TerminalIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-white tracking-tight">Consola Dual Interactiva</span>
              <InfoTip content="Transmisión WebSocket en vivo con soporte de secuencias ANSI y comandos directos para motores Java y Bedrock." />
              <span
                className={`flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  status === 'connected'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}
              >
                <Wifi className="w-2.5 h-2.5 animate-pulse" />
                <span>{status === 'connected' ? 'STREAM ACTIVO' : 'RECONECTANDO...'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Server filter pills & Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Engine Selector */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/[0.08]">
            <button
              onClick={() => setServerFilter('all')}
              className={`min-h-[28px] px-2.5 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                serverFilter === 'all'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => {
                setServerFilter('java');
                setTargetEngine('java');
              }}
              className={`min-h-[28px] px-2.5 py-1 rounded text-[11px] font-mono transition-colors flex items-center gap-1 cursor-pointer ${
                serverFilter === 'java'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Server className="w-3 h-3" />
              <span>Java</span>
            </button>
            <button
              onClick={() => {
                setServerFilter('bedrock');
                setTargetEngine('bedrock');
              }}
              className={`min-h-[28px] px-2.5 py-1 rounded text-[11px] font-mono transition-colors flex items-center gap-1 cursor-pointer ${
                serverFilter === 'bedrock'
                  ? 'bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              <span>Bedrock</span>
            </button>
          </div>

          <motion.button
            onClick={() => setAutoScroll(!autoScroll)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className={`min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
              autoScroll
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08]'
            }`}
            title="Auto-scroll"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Auto-scroll</span>
          </motion.button>

          <motion.button
            onClick={handleDownloadLogs}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="min-h-[36px] p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Descargar logs actuales"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Descargar</span>
          </motion.button>

          <motion.button
            onClick={clearLogs}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="min-h-[36px] p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-white/[0.04] hover:bg-rose-500/15 hover:text-rose-300 border border-white/[0.08] text-slate-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Limpiar pantalla"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Limpiar</span>
          </motion.button>
        </div>
      </div>

      {/* Terminal Viewport Container */}
      <div className="flex-1 min-h-0 relative rounded-xl border border-white/[0.08] overflow-hidden bg-[#070a0f] shadow-lg">
        <XtermTerminal logs={logs} autoScroll={autoScroll} />
      </div>

      {/* Quick command buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 shrink-0">
        <div className="flex items-center gap-1 shrink-0 mr-1">
          <span className="text-[11px] text-slate-500 font-mono">
            Atajos ({targetEngine.toUpperCase()}):
          </span>
          <InfoTip content="Comandos rápidos preconfigurados que se envían directamente al proceso activo." />
        </div>
        {quickCommands.map((qc) => (
          <motion.button
            key={qc.label}
            onClick={() => sendCommand(qc.cmd, targetEngine)}
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            className="min-h-[32px] px-2.5 py-1 rounded-lg bg-[#0b0f17] border border-white/[0.08] hover:border-emerald-500/40 text-slate-300 hover:text-emerald-400 text-[11px] font-mono transition-colors shrink-0 cursor-pointer"
          >
            /{qc.cmd}
          </motion.button>
        ))}
      </div>

      {/* Command Input Bar */}
      <form onSubmit={handleSend} className="shrink-0 flex items-center gap-2">
        {/* Target Engine Switcher for Command */}
        <button
          type="button"
          onClick={() => setTargetEngine(targetEngine === 'java' ? 'bedrock' : 'java')}
          className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-mono font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
            targetEngine === 'bedrock'
              ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
          }`}
          title="Alternar motor al que enviar comando"
        >
          {targetEngine === 'bedrock' ? <Smartphone className="w-3.5 h-3.5" /> : <Server className="w-3.5 h-3.5" />}
          <span>{targetEngine === 'bedrock' ? 'BDS' : 'JAVA'}</span>
        </button>

        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400 font-mono font-bold text-sm">
            &gt;
          </div>
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              targetEngine === 'bedrock'
                ? 'Comando Bedrock (ej: list, whitelist, stop)...'
                : 'Comando Java (ej: list, time set day, op)...'
            }
            className="min-h-[44px] w-full pl-8 pr-12 py-2.5 bg-[#0b0f17] border border-white/[0.1] rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 font-mono transition-colors"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">↑↓ historial</span>
          </div>
        </div>

        <motion.button
          type="submit"
          disabled={!command.trim()}
          whileHover={{ scale: command.trim() ? 1.02 : 1 }}
          whileTap={{ scale: command.trim() ? 0.97 : 1 }}
          className={`min-h-[44px] px-4 py-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
            targetEngine === 'bedrock'
              ? 'bg-blue-600 hover:bg-blue-500'
              : 'bg-emerald-600 hover:bg-emerald-500'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Enviar</span>
        </motion.button>
      </form>
    </div>
  );
};
