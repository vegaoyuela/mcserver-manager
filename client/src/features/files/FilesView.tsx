import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { FileItem } from '../../lib/types';
import { RareFilesIcon } from '../../components/rareui/RareIcons';
import { RetroPixelButton } from '../../components/rareui/RetroPixelButton';
import { InfoTip } from '../../components/common/InfoTip';
import {
  Folder,
  FileText,
  FileCode,
  FileArchive,
  Upload,
  FolderPlus,
  RefreshCw,
  Trash2,
  Edit3,
  ChevronRight,
  ArrowUp,
  Save,
  X,
  AlertTriangle,
} from 'lucide-react';

export const FilesView: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editor Modal State
  const [editingFile, setEditingFile] = useState<{ path: string; name: string; content: string } | null>(null);
  const [savingFile, setSavingFile] = useState(false);

  // New Folder Modal State
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Rename Modal State
  const [renamingItem, setRenamingItem] = useState<{ path: string; oldName: string; newName: string } | null>(null);

  // Delete Confirmation State
  const [deletingItem, setDeletingItem] = useState<FileItem | null>(null);

  useEffect(() => {
    loadDirectory(currentPath);
  }, [currentPath]);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getFiles(path);
      setCurrentPath(res.currentPath);
      setParentPath(res.parentPath);
      setItems(res.items);
    } catch (err: any) {
      setError(err.message || 'Error al listar directorio');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFile = async (item: FileItem) => {
    if (item.isDirectory) {
      setCurrentPath(item.relativePath);
      return;
    }

    const editableExtensions = ['txt', 'properties', 'json', 'log', 'sh', 'toml', 'yml', 'yaml', 'cfg'];
    if (editableExtensions.includes(item.extension) || item.size < 500 * 1024) {
      try {
        const res = await api.getFileContent(item.relativePath);
        setEditingFile({ path: item.relativePath, name: item.name, content: res.content });
      } catch (err: any) {
        alert(err.message || 'No se pudo abrir el archivo');
      }
    } else {
      alert(`El archivo ${item.name} es un archivo binario o excede el tamaño máximo permitido para edición.`);
    }
  };

  const handleSaveFile = async () => {
    if (!editingFile) return;
    setSavingFile(true);
    try {
      await api.saveFileContent(editingFile.path, editingFile.content);
      setEditingFile(null);
      loadDirectory(currentPath);
    } catch (err: any) {
      alert(err.message || 'Error al guardar archivo');
    } finally {
      setSavingFile(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await api.createDirectory(currentPath, newFolderName.trim());
      setShowNewFolderModal(false);
      setNewFolderName('');
      loadDirectory(currentPath);
    } catch (err: any) {
      alert(err.message || 'Error al crear carpeta');
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingItem || !renamingItem.newName.trim()) return;
    try {
      await api.renameItem(renamingItem.path, renamingItem.newName.trim());
      setRenamingItem(null);
      loadDirectory(currentPath);
    } catch (err: any) {
      alert(err.message || 'Error al renombrar');
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      await api.deleteItem(deletingItem.relativePath);
      setDeletingItem(null);
      loadDirectory(currentPath);
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      await api.uploadFiles(currentPath, Array.from(files));
      loadDirectory(currentPath);
    } catch (err: any) {
      alert(err.message || 'Error al subir archivos');
    } finally {
      e.target.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '-';
    const units = ['B', 'KB', 'MB', 'GB'];
    let val = bytes;
    let unitIdx = 0;
    while (val >= 1024 && unitIdx < units.length - 1) {
      val /= 1024;
      unitIdx++;
    }
    return `${val.toFixed(1)} ${units[unitIdx]}`;
  };

  const getFileIcon = (item: FileItem) => {
    if (item.isDirectory) return <Folder className="w-4 h-4 text-amber-400 shrink-0" />;
    switch (item.extension) {
      case 'jar':
        return <FileArchive className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'sh':
      case 'bat':
      case 'json':
      case 'properties':
      case 'toml':
      case 'yml':
        return <FileCode className="w-4 h-4 text-cyan-400 shrink-0" />;
      case 'log':
      case 'txt':
        return <FileText className="w-4 h-4 text-slate-300 shrink-0" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  const breadcrumbParts = currentPath ? currentPath.split('/').filter(Boolean) : [];

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="bg-[#0b0f17] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <RareFilesIcon size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-white tracking-tight">
                Explorador de Archivos
              </h2>
              <InfoTip content="Explora el volumen persistente /data con editor integrado para .properties, .json, .log, .sh y subida de archivos." />
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-mono border border-emerald-500/25">
                /data
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-medium border border-white/[0.08] flex items-center gap-1.5 transition-colors">
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Subir Archivo</span>
            <input type="file" multiple className="hidden" onChange={handleUploadFiles} />
          </label>

          <button
            onClick={() => setShowNewFolderModal(true)}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-medium border border-white/[0.08] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Nueva Carpeta</span>
          </button>

          <button
            onClick={() => loadDirectory(currentPath)}
            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/[0.08] transition-colors cursor-pointer"
            title="Actualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Breadcrumbs Navigation */}
      <div className="bg-[#0b0f17] rounded-xl p-3 border border-white/[0.08] flex items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto py-0.5">
          <button
            onClick={() => setCurrentPath('')}
            className={`px-2 py-1 rounded-md hover:bg-white/[0.06] transition-colors cursor-pointer ${
              currentPath === '' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
            }`}
          >
            /data
          </button>

          {breadcrumbParts.map((part, index) => {
            const pathUpToPart = breadcrumbParts.slice(0, index + 1).join('/');
            const isLast = index === breadcrumbParts.length - 1;
            return (
              <React.Fragment key={pathUpToPart}>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <button
                  onClick={() => setCurrentPath(pathUpToPart)}
                  className={`px-2 py-1 rounded-md hover:bg-white/[0.06] transition-colors cursor-pointer ${
                    isLast ? 'text-emerald-400 font-semibold' : 'text-slate-300'
                  }`}
                >
                  {part}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {parentPath !== null && (
          <button
            onClick={() => setCurrentPath(parentPath)}
            className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 flex items-center gap-1 text-[11px] shrink-0 cursor-pointer"
            title="Subir un nivel"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>Subir nivel</span>
          </button>
        )}
      </div>

      {/* Files and Folders List */}
      <div className="bg-[#0b0f17] rounded-xl border border-white/[0.08] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
            <span className="text-xs font-mono">Cargando directorio...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-amber-400 flex flex-col items-center gap-2">
            <AlertTriangle className="w-6 h-6" />
            <span className="text-xs font-semibold">{error}</span>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-mono text-xs">
            Esta carpeta está vacía.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {items.map((item) => (
              <div
                key={item.relativePath}
                className="p-3 sm:px-5 flex items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors group"
              >
                <div
                  onClick={() => handleOpenFile(item)}
                  className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                >
                  {getFileIcon(item)}
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-medium text-slate-200 group-hover:text-emerald-300 transition-colors truncate block font-mono">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block sm:hidden">
                      {item.isDirectory ? 'Carpeta' : formatFileSize(item.size)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                  <span className="hidden sm:inline w-20 text-right">
                    {item.isDirectory ? '-' : formatFileSize(item.size)}
                  </span>
                  <span className="hidden md:inline w-36 text-right text-[11px] text-slate-500">
                    {new Date(item.modified).toLocaleDateString()} {new Date(item.modified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {!item.isDirectory && (
                      <button
                        onClick={() => handleOpenFile(item)}
                        className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                        title="Ver / Editar"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => setRenamingItem({ path: item.relativePath, oldName: item.name, newName: item.name })}
                      className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                      title="Renombrar"
                    >
                      <span className="text-xs font-semibold px-1">Aa</span>
                    </button>

                    <button
                      onClick={() => setDeletingItem(item)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {editingFile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1724] w-full max-w-4xl rounded-2xl border border-white/[0.1] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between gap-4 bg-[#070a0f]/60">
              <div className="flex items-center gap-2 min-w-0">
                <FileCode className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white font-mono truncate">{editingFile.name}</h3>
                  <span className="text-[10px] text-slate-400 font-mono truncate block">{editingFile.path}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <RetroPixelButton
                  onClick={handleSaveFile}
                  disabled={savingFile}
                  variant="emerald"
                  size="sm"
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {savingFile ? 'GUARDANDO...' : 'GUARDAR'}
                </RetroPixelButton>
                <button
                  onClick={() => setEditingFile(null)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 bg-[#070a0f] overflow-hidden">
              <textarea
                value={editingFile.content}
                onChange={(e) => setEditingFile({ ...editingFile, content: e.target.value })}
                className="w-full h-[60vh] bg-transparent text-emerald-300 font-mono text-xs sm:text-sm p-2 outline-none resize-none leading-relaxed selection:bg-emerald-500/30"
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1724] w-full max-w-md rounded-2xl border border-white/[0.1] p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white font-mono flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-cyan-400" />
              Nueva Carpeta
            </h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nombre de la carpeta..."
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#070a0f] border border-white/[0.1] text-xs text-white font-mono outline-none focus:border-emerald-500/50"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renamingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1724] w-full max-w-md rounded-2xl border border-white/[0.1] p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white font-mono">Renombrar Elemento</h3>
            <form onSubmit={handleRename} className="space-y-4">
              <input
                type="text"
                value={renamingItem.newName}
                onChange={(e) => setRenamingItem({ ...renamingItem, newName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#070a0f] border border-white/[0.1] text-xs text-white font-mono outline-none focus:border-emerald-500/50"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenamingItem(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Guardar Nombre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1724] w-full max-w-md rounded-2xl border border-red-500/30 p-5 space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-sm font-semibold text-white">¿Eliminar {deletingItem.isDirectory ? 'carpeta' : 'archivo'}?</h3>
            </div>
            <p className="text-xs text-slate-300 font-mono leading-relaxed">
              ¿Estás seguro de que deseas eliminar permanentemente <strong>{deletingItem.name}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
              >
                Eliminar Permanentemente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
