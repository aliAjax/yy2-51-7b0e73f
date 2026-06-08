import { useState, useRef, useCallback } from 'react';
import { Download, Upload, X, AlertTriangle, Check, FileJson, Trash2 } from 'lucide-react';
import { useDreamStore } from '@/store/dreamStore';
import type { DreamLocation } from '@/types';
import { hexToRgba } from '@/utils/storage';

interface ImportPreview {
  data: DreamLocation[];
  duplicateIds: string[];
  newIds: string[];
  totalCount: number;
  invalidCount: number;
  internalDuplicateCount: number;
  skippedCount: number;
}

type ImportMode = 'merge' | 'replace';
type ConfirmDialogType = 'replace' | 'export-empty' | null;

export function ImportExport() {
  const exportLocations = useDreamStore((state) => state.exportLocations);
  const importLocations = useDreamStore((state) => state.importLocations);
  const locations = useDreamStore((state) => state.locations);

  const [showDialog, setShowDialog] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [importResult, setImportResult] = useState<{ added: number; updated: number; skipped: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogType>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLLabelElement>(null);

  const validateDreamLocation = (item: unknown): item is DreamLocation => {
    if (typeof item !== 'object' || item === null) return false;
    const loc = item as Record<string, unknown>;
    return (
      typeof loc.id === 'string' &&
      typeof loc.name === 'string' &&
      typeof loc.atmosphere === 'string' &&
      typeof loc.frequency === 'string' &&
      typeof loc.relatedPeople === 'string' &&
      typeof loc.memoryFragment === 'string' &&
      typeof loc.emotionColor === 'string' &&
      typeof loc.positionX === 'number' &&
      typeof loc.positionY === 'number' &&
      typeof loc.createdAt === 'string' &&
      typeof loc.updatedAt === 'string'
    );
  };

  const processFile = useCallback((file: File) => {
    setError(null);
    setPreview(null);
    setImportResult(null);

    if (file.size === 0) {
      setError('文件为空，请选择有效的 JSON 文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        let parsed: unknown;

        try {
          parsed = JSON.parse(content);
        } catch {
          setError('文件格式错误，不是有效的 JSON');
          return;
        }

        if (!Array.isArray(parsed)) {
          setError('数据格式错误：期望一个梦境地点数组');
          return;
        }

        if (parsed.length === 0) {
          setError('文件中没有梦境地点数据');
          return;
        }

        const validLocations: DreamLocation[] = [];
        const invalidCount = parsed.filter((item) => !validateDreamLocation(item)).length;

        if (invalidCount > 0 && invalidCount === parsed.length) {
          setError('文件中的数据格式不正确，没有找到有效的梦境地点');
          return;
        }

        const importedIds = new Set<string>();
        let internalDuplicateCount = 0;

        parsed.forEach((item) => {
          if (validateDreamLocation(item)) {
            if (importedIds.has(item.id)) {
              internalDuplicateCount++;
              return;
            }
            importedIds.add(item.id);
            validLocations.push(item);
          }
        });

        const existingIds = new Set(locations.map((loc) => loc.id));
        const duplicateIds: string[] = [];
        const newIds: string[] = [];

        validLocations.forEach((loc) => {
          if (existingIds.has(loc.id)) {
            duplicateIds.push(loc.id);
          } else {
            newIds.push(loc.id);
          }
        });

        setPreview({
          data: validLocations,
          duplicateIds,
          newIds,
          totalCount: validLocations.length,
          invalidCount,
          internalDuplicateCount,
          skippedCount: invalidCount + internalDuplicateCount,
        });
      } catch {
        setError('读取文件时发生未知错误');
      }
    };

    reader.onerror = () => {
      setError('读取文件失败');
    };

    reader.readAsText(file);
  }, [locations]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setError('请选择 JSON 格式的文件');
      return;
    }

    processFile(file);
  };

  const handleExport = () => {
    const data = exportLocations();

    if (data.length === 0) {
      setConfirmDialog('export-empty');
      return;
    }

    doExport(data);
  };

  const doExport = (data: DreamLocation[]) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dream-locations-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (!preview) return;

    if (importMode === 'replace') {
      setConfirmDialog('replace');
      return;
    }

    doImport();
  };

  const doImport = () => {
    if (!preview) return;

    const result = importLocations(preview.data, importMode);
    setImportResult({ ...result, skipped: preview.skippedCount });
    setConfirmDialog(null);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setPreview(null);
    setError(null);
    setImportResult(null);
    setImportMode('merge');
    setConfirmDialog(null);
  };

  const openDialog = () => {
    setShowDialog(true);
    setPreview(null);
    setError(null);
    setImportResult(null);
    setImportMode('merge');
    setConfirmDialog(null);
  };

  const handleConfirm = () => {
    if (confirmDialog === 'replace') {
      doImport();
    } else if (confirmDialog === 'export-empty') {
      doExport([]);
      setConfirmDialog(null);
    }
  };

  const handleCancelConfirm = () => {
    setConfirmDialog(null);
  };

  const renderConfirmDialog = () => {
    if (!confirmDialog) return null;

    let title = '';
    let message = '';
    let confirmText = '';
    let isDanger = false;

    if (confirmDialog === 'replace') {
      title = '确认替换所有数据？';
      message = `此操作将删除当前所有 ${locations.length} 个梦境地点，并用导入的 ${preview?.totalCount || 0} 个地点完全替换。此操作不可撤销！`;
      confirmText = '确认替换';
      isDanger = true;
    } else if (confirmDialog === 'export-empty') {
      title = '当前没有梦境数据';
      message = '目前还没有记录任何梦境地点，导出的文件将为空。是否继续导出？';
      confirmText = '继续导出';
    }

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleCancelConfirm} />

        <div
          className="relative w-full max-w-sm overflow-hidden rounded-2xl animate-scale-in"
          style={{
            background: `linear-gradient(145deg, ${hexToRgba('#1e1e3f', 0.98)} 0%, ${hexToRgba('#0f0f2a', 0.99)} 100%)`,
            border: '1px solid rgba(150, 130, 200, 0.2)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 100px rgba(100, 50, 150, 0.15)',
          }}
        >
          <div className="p-6">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isDanger ? 'bg-red-500/20' : 'bg-yellow-500/20'
            }`}>
              <AlertTriangle size={24} className={isDanger ? 'text-red-400' : 'text-yellow-400'} />
            </div>

            <h3 className="text-lg font-serif text-white text-center mb-2">{title}</h3>
            <p className="text-sm text-purple-200/60 text-center leading-relaxed">{message}</p>
          </div>

          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={handleCancelConfirm}
              className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-purple-200/70 bg-white/5 border border-purple-300/20 hover:bg-white/10 transition-all"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 transition-all hover:scale-105 ${
                isDanger ? 'bg-red-500 hover:bg-red-600' : ''
              }`}
              style={
                !isDanger
                  ? {
                      background: 'linear-gradient(135deg, rgba(155, 89, 182, 0.9) 0%, rgba(100, 50, 150, 0.9) 100%)',
                      boxShadow: '0 4px 15px rgba(155, 89, 182, 0.3)',
                    }
                  : {}
              }
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleExport}
          className="p-2.5 rounded-xl text-purple-200/70 bg-white/5 border border-purple-300/20 hover:text-purple-100 hover:bg-white/10 transition-all group"
          title="导出梦境数据"
        >
          <Download size={18} className="transition-transform group-hover:-translate-y-0.5" />
        </button>

        <button
          onClick={openDialog}
          className="p-2.5 rounded-xl text-purple-200/70 bg-white/5 border border-purple-300/20 hover:text-purple-100 hover:bg-white/10 transition-all group"
          title="导入梦境数据"
        >
          <Upload size={18} className="transition-transform group-hover:translate-y-0.5" />
        </button>
      </div>

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDialog} />

          <div
            className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl animate-scale-in"
            style={{
              background: `linear-gradient(145deg, ${hexToRgba('#1e1e3f', 0.95)} 0%, ${hexToRgba('#0f0f2a', 0.98)} 100%)`,
              border: '1px solid rgba(150, 130, 200, 0.2)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 100px rgba(100, 50, 150, 0.2)',
            }}
          >
            <div className="relative h-16 flex items-center justify-between px-6 border-b border-purple-300/10">
              <h2 className="text-lg font-serif text-white flex items-center gap-2">
                <FileJson size={20} className="text-purple-300" />
                导入梦境数据
              </h2>
              <button
                onClick={closeDialog}
                className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-4rem)]">
              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-300">导入失败</p>
                      <p className="text-xs text-red-300/70 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {importResult && (
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                  <div className="flex items-start gap-3">
                    <Check size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-300">导入成功</p>
                      <div className="text-xs text-green-300/70 mt-1 space-y-1">
                        <p>新增地点：{importResult.added} 个</p>
                        {importResult.updated > 0 && <p>更新地点：{importResult.updated} 个</p>}
                        {importResult.skipped > 0 && <p>跳过地点：{importResult.skipped} 个</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!preview && !importResult && (
                <div className="space-y-4">
                  <p className="text-sm text-purple-200/70">
                    选择一个 JSON 文件来导入梦境地点数据。导入时可以选择合并或替换现有数据。
                  </p>

                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,application/json"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="import-file-input"
                    />
                    <label
                      ref={dropZoneRef}
                      htmlFor="import-file-input"
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`flex flex-col items-center justify-center w-full py-10 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                        isDragging
                          ? 'border-purple-400/60 bg-purple-500/10 scale-[1.02]'
                          : 'border-purple-300/20 hover:border-purple-400/40 hover:bg-white/5'
                      }`}
                    >
                      <div className={`transition-all duration-300 ${isDragging ? 'scale-110' : ''}`}>
                        <Upload size={36} className={`mb-3 ${isDragging ? 'text-purple-300' : 'text-purple-300/50'}`} />
                      </div>
                      <p className={`text-sm ${isDragging ? 'text-purple-200' : 'text-purple-200/70'}`}>
                        {isDragging ? '释放文件以导入' : '点击选择 JSON 文件'}
                      </p>
                      <p className="text-xs text-purple-300/40 mt-1">或拖拽文件到此处</p>
                    </label>
                  </div>
                </div>
              )}

              {preview && !importResult && (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <p className="text-sm font-medium text-purple-200 mb-3">导入预览</p>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 rounded-lg bg-white/5">
                        <p className="text-xl font-serif text-white">{preview.totalCount}</p>
                        <p className="text-xs text-purple-300/60">有效</p>
                      </div>
                      <div className="p-3 rounded-lg bg-green-500/10">
                        <p className="text-xl font-serif text-green-300">{preview.newIds.length}</p>
                        <p className="text-xs text-green-300/60">新增</p>
                      </div>
                      <div className="p-3 rounded-lg bg-yellow-500/10">
                        <p className="text-xl font-serif text-yellow-300">{preview.duplicateIds.length}</p>
                        <p className="text-xs text-yellow-300/60">重复</p>
                      </div>
                    </div>
                  </div>

                  {preview.skippedCount > 0 && (
                    <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                      <div className="flex items-start gap-3">
                        <AlertTriangle size={18} className="text-orange-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-orange-300">
                            跳过 {preview.skippedCount} 条数据
                          </p>
                          <p className="text-xs text-orange-300/70 mt-1">
                            {preview.invalidCount > 0 && `无效数据 ${preview.invalidCount} 条`}
                            {preview.invalidCount > 0 && preview.internalDuplicateCount > 0 && '，'}
                            {preview.internalDuplicateCount > 0 && `文件内重复 ID ${preview.internalDuplicateCount} 条`}
                            ，这些数据将不会写入。
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {preview.duplicateIds.length > 0 && (
                    <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                      <div className="flex items-start gap-3">
                        <AlertTriangle size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-yellow-300">
                            发现 {preview.duplicateIds.length} 个重复 ID
                          </p>
                          <p className="text-xs text-yellow-300/70 mt-1">
                            这些地点已存在于当前数据中，请选择导入模式处理重复数据。
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-purple-200">导入模式</p>
                    <div className="space-y-2">
                      <label
                        className={`flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all ${
                          importMode === 'merge'
                            ? 'bg-purple-500/15 border border-purple-400/40'
                            : 'bg-white/5 border border-purple-300/15 hover:bg-white/10'
                        }`}
                      >
                        <input
                          type="radio"
                          name="import-mode"
                          value="merge"
                          checked={importMode === 'merge'}
                          onChange={() => setImportMode('merge')}
                          className="mt-1"
                        />
                        <div>
                          <p className="text-sm font-medium text-white">合并模式</p>
                          <p className="text-xs text-purple-300/60 mt-1">
                            保留现有数据，新增地点添加到列表中，重复 ID 的地点将被更新。
                          </p>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all ${
                          importMode === 'replace'
                            ? 'bg-red-500/15 border border-red-400/40'
                            : 'bg-white/5 border border-purple-300/15 hover:bg-white/10'
                        }`}
                      >
                        <input
                          type="radio"
                          name="import-mode"
                          value="replace"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="mt-1"
                        />
                        <div>
                          <p className="text-sm font-medium text-white flex items-center gap-2">
                            替换模式
                            <Trash2 size={14} className="text-red-400" />
                          </p>
                          <p className="text-xs text-red-300/60 mt-1">
                            删除所有现有梦境地点，用导入的数据完全替换。此操作不可撤销！
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded-xl bg-white/5 border border-purple-300/10">
                    <div className="p-3 border-b border-purple-300/10">
                      <p className="text-xs font-medium text-purple-200/60">
                        数据预览（前 {Math.min(preview.data.length, 5)} 条）
                      </p>
                    </div>
                    <div className="divide-y divide-purple-300/5">
                      {preview.data.slice(0, 5).map((loc) => (
                        <div key={loc.id} className="p-3 flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: loc.emotionColor }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{loc.name}</p>
                            <p className="text-xs text-purple-300/50 truncate">{loc.atmosphere}</p>
                          </div>
                          {preview.duplicateIds.includes(loc.id) && (
                            <span className="text-xs text-yellow-400/70 flex-shrink-0 px-2 py-0.5 rounded-full bg-yellow-500/10">
                              重复
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    {preview.data.length > 5 && (
                      <div className="p-3 text-center">
                        <p className="text-xs text-purple-300/40">
                          还有 {preview.data.length - 5} 条数据未显示
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {preview && !importResult && (
                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => {
                      setPreview(null);
                      setError(null);
                    }}
                    className="flex-1 py-3 px-4 rounded-lg text-sm font-medium text-purple-200/70 bg-white/5 border border-purple-300/20 hover:bg-white/10 transition-all"
                  >
                    重新选择
                  </button>
                  <button
                    onClick={handleImport}
                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 transition-all hover:scale-105 ${
                      importMode === 'replace'
                        ? 'bg-red-500 hover:bg-red-600'
                        : ''
                    }`}
                    style={
                      importMode !== 'replace'
                        ? {
                            background: 'linear-gradient(135deg, rgba(155, 89, 182, 0.9) 0%, rgba(100, 50, 150, 0.9) 100%)',
                            boxShadow: '0 4px 15px rgba(155, 89, 182, 0.3)',
                          }
                        : {}
                    }
                  >
                    {importMode === 'replace' ? '确认替换' : '确认导入'}
                  </button>
                </div>
              )}

              {importResult && (
                <div className="pt-2">
                  <button
                    onClick={closeDialog}
                    className="w-full py-3 px-4 rounded-lg text-sm font-medium text-white transition-all hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, rgba(155, 89, 182, 0.9) 0%, rgba(100, 50, 150, 0.9) 100%)',
                      boxShadow: '0 4px 15px rgba(155, 89, 182, 0.3)',
                    }}
                  >
                    完成
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {renderConfirmDialog()}
    </>
  );
}
