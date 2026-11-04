import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../lib/api';

export type WsStatus = 'connected' | 'connecting' | 'disconnected';

export interface LogEntry {
  text: string;
  server?: 'java' | 'bedrock' | 'system';
}

export function useConsoleWs() {
  const [status, setStatus] = useState<WsStatus>('connecting');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [serverFilter, setServerFilter] = useState<'all' | 'java' | 'bedrock'>('all');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const addLogLine = useCallback((line: string, server: 'java' | 'bedrock' | 'system' = 'java') => {
    setLogs((prev) => [...prev.slice(-1500), { text: line, server }]);
  }, []);

  const connectWebSocket = useCallback(() => {
    setStatus('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/console`;

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setStatus('connected');
        addLogLine('\x1b[32m[WS] Conectado al stream de consola en vivo (Java & Bedrock).\x1b[0m', 'system');
      };

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'log' && typeof parsed.data === 'string') {
            addLogLine(parsed.data, parsed.server || 'java');
          } else if (parsed.type === 'installer' && typeof parsed.data === 'string') {
            addLogLine(parsed.data, parsed.server || 'java');
          } else {
            addLogLine(event.data, 'java');
          }
        } catch {
          addLogLine(event.data, 'java');
        }
      };

      socket.onerror = () => {
        setStatus('disconnected');
      };

      socket.onclose = () => {
        setStatus('disconnected');
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };
    } catch {
      setStatus('disconnected');
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 3000);
    }
  }, [addLogLine]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  const sendCommand = useCallback(
    async (command: string, target: 'java' | 'bedrock' = 'java') => {
      if (!command.trim()) return;

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'command', command, target }));
      } else {
        if (target === 'bedrock') {
          await api.sendBedrockCommand(command);
        } else {
          await api.sendCommand(command);
        }
      }
    },
    []
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (serverFilter === 'all') return true;
    if (log.server === 'system') return true;
    return log.server === serverFilter;
  });

  return {
    status,
    logs: filteredLogs.map((l) => l.text),
    rawLogs: logs,
    serverFilter,
    setServerFilter,
    sendCommand,
    clearLogs,
  };
}
