import { useState, useRef, useCallback, useMemo } from 'react';
import { Download, Upload, X, AlertTriangle, Check, FileJson, Trash2, Link, MapPin, Filter, Copy, SkipForward, RefreshCw } from 'lucide-react';
import { useDreamStore } from '@/store/dreamStore';
import type { ConflictResolution, LocationConflictResolutions, RelationConflictResolutions } from '@/store/dreamStore';
import type { DreamLocation, DreamRelation } from '@/types';
import { hexToRgba } from '@/utils/storage';

interface ImportPreview {
  locations: DreamLocation[];
  relations: DreamRelation[];
  duplicateLocationIds: string[];
  newLocationIds: string[];
  duplicateRelationIds: string[];
  newRelationIds: string[];
  totalLocationCount: number;
  totalRelationCount: number;
  invalidLocationCount: number;
  invalidRelationCount: number;
  internalDuplicateLocationCount: number;
  internalDuplicateRelationCount: number;
  skippedLocationCount: number;
  skippedRelationCount: number;
  orphanRelations: DreamRelation[];
  relationsReferencingDuplicateLocations: string[];
}

type ImportMode = 'merge' | 'replace';
type ConfirmDialogType = 'replace' | 'export-empty' | null;
type ExportDataType = 'all' | 'locations' | 'relations';

interface ExportData {
  version: string;
  exportedAt: string;
  locations: DreamLocation[];
  relations: DreamRelation[];
}

export function ImportExport() {
  const exportLocations = useDreamStore((state) => state.exportLocations);
  const importLocations = useDreamStore((state) => state.importLocations);
  const exportRelations = useDreamStore((state) => state.exportRelations);
  const importRelations = useDreamStore((state) => state.importRelations);
  const locations = useDreamStore((state) => state.locations);
  const relations = useDreamStore((state) => state.relations);
  const getFilteredLocations = useDreamStore((state) => state.getFilteredLocations);
  const getFilteredRelations = useDreamStore((state) => state.getFilteredRelations);
  const filters = useDreamStore((state) => state.filters);

  const [showDialog, setShowDialog] = useState(false);
  const [exportType, setExportType] = useState<ExportDataType>('all');
  const [exportFilteredOnly, setExportFilteredOnly] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [importResult, setImportResult] = useState<{
    locations: { added: number; updated: number; skipped: number; savedAsNew: number };
    relations: { added: number; updated: number; skipped: number; savedAsNew: number; remapped: number };
  } | null>(null);
  const [locationDefaultResolution, setLocationDefaultResolution] = useState<ConflictResolution>('overwrite');
  const [relationDefaultResolution, setRelationDefaultResolution] = useState<ConflictResolution>('overwrite');
  const [isDragging, setIsDragging] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogType>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLLabelElement>(null);

  const hasActiveFilters = useMemo(() => {
    return !!filters.searchText.trim() || !!filters.frequency || filters.selectedTags.length > 0;
  }, [filters]);

  const filteredCount = useMemo(() => {
    if (!hasActiveFilters) return { locations: locations.length, relations: relations.length };
    const filteredLocs = getFilteredLocations();
    const filteredRels = getFilteredRelations();
    return { locations: filteredLocs.length, relations: filteredRels.length };
  }, [hasActiveFilters, locations.length, relations.length, getFilteredLocations, getFilteredRelations]);

  const effectiveFilteredOnly = exportFilteredOnly && hasActiveFilters;

  const validateDreamLocation = (item: unknown): item is DreamLocation & { tags?: string[] } => {
    if (typeof item !== 'object' || item === null) return false;
    const loc = item as Record<string, unknown>;
    const hasTags = loc.tags === undefined || (Array.isArray(loc.tags) && loc.tags.every((t: unknown) => typeof t === 'string'));
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
      typeof loc.updatedAt === 'string' &&
      hasTags
    );
  };

  const validateDreamRelation = (item: unknown): item is DreamRelation => {
    if (typeof item !== 'object' || item === null) return false;
    const rel = item as Record<string, unknown>;
    const validTypes = ['相似', '延续', '反复出现', '人物相关'];
    return (
      typeof rel.id === 'string' &&
      typeof rel.fromId === 'string' &&
      typeof rel.toId === 'string' &&
      typeof rel.type === 'string' &&
      validTypes.includes(rel.type) &&
      typeof rel.description === 'string' &&
      typeof rel.createdAt === 'string' &&
      typeof rel.updatedAt === 'string'
    );
  };

  const parseImportData = useCallback((parsed: unknown): { locations: DreamLocation[]; relations: DreamRelation[] } | null => {
    if (Array.isArray(parsed)) {
      const locations = parsed.filter(validateDreamLocation).map((loc) => ({
        ...loc,
        tags: loc.tags || [],
      }));
      if (locations.length > 0) {
        return { locations, relations: [] };
      }
      return null;
    }

    if (typeof parsed === 'object' && parsed !== null) {
      const obj = parsed as Record<string, unknown>;
      const locations = Array.isArray(obj.locations)
        ? obj.locations.filter(validateDreamLocation).map((loc) => ({
            ...loc,
            tags: loc.tags || [],
          }))
        : [];
      const relations = Array.isArray(obj.relations)
        ? obj.relations.filter(validateDreamRelation)
        : [];

      if (locations.length > 0 || relations.length > 0) {
        return { locations, relations };
      }
    }

    return null;
  }, []);

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

        const data = parseImportData(parsed);
        if (!data || (data.locations.length === 0 && data.relations.length === 0)) {
          setError('文件中没有找到有效的梦境数据');
          return;
        }

        const { locations: importLocations, relations: importRelations } = data;

        const currentLocationIds = new Set(locations.map((loc) => loc.id));
        const locationIds = new Set<string>();
        let internalDuplicateLocationCount = 0;
        const validLocations: DreamLocation[] = [];

        importLocations.forEach((loc) => {
          if (locationIds.has(loc.id)) {
            internalDuplicateLocationCount++;
            return;
          }
          locationIds.add(loc.id);
          validLocations.push(loc);
        });

        const relationIds = new Set<string>();
        let internalDuplicateRelationCount = 0;
        const validRelations: DreamRelation[] = [];
        const orphanRelations: DreamRelation[] = [];

        importRelations.forEach((rel) => {
          if (relationIds.has(rel.id)) {
            internalDuplicateRelationCount++;
            return;
          }

          const fromExists = locationIds.has(rel.fromId) || currentLocationIds.has(rel.fromId);
          const toExists = locationIds.has(rel.toId) || currentLocationIds.has(rel.toId);

          if (!fromExists || !toExists) {
            orphanRelations.push(rel);
            return;
          }

          relationIds.add(rel.id);
          validRelations.push(rel);
        });

        const existingLocationIds = new Set(locations.map((loc) => loc.id));
        const duplicateLocationIds: string[] = [];
        const newLocationIds: string[] = [];

        validLocations.forEach((loc) => {
          if (existingLocationIds.has(loc.id)) {
            duplicateLocationIds.push(loc.id);
          } else {
            newLocationIds.push(loc.id);
          }
        });

        const existingRelationIds = new Set(relations.map((rel) => rel.id));
        const duplicateRelationIds: string[] = [];
        const newRelationIds: string[] = [];

        validRelations.forEach((rel) => {
          if (existingRelationIds.has(rel.id)) {
            duplicateRelationIds.push(rel.id);
          } else {
            newRelationIds.push(rel.id);
          }
        });

        const parsedObj = !Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null
          ? (parsed as Record<string, unknown>)
          : null;

        const locationsArray = parsedObj && Array.isArray(parsedObj.locations)
          ? parsedObj.locations as unknown[]
          : [];
        const relationsArray = parsedObj && Array.isArray(parsedObj.relations)
          ? parsedObj.relations as unknown[]
          : [];

        const invalidLocationCount = Array.isArray(parsed)
          ? parsed.filter((item) => !validateDreamLocation(item)).length
          : locationsArray.filter((item) => !validateDreamLocation(item)).length;

        const invalidRelationCount = relationsArray.filter((item) => !validateDreamRelation(item)).length;

        const duplicateLocationIdSet = new Set(duplicateLocationIds);
        const relationsReferencingDuplicateLocations: string[] = validRelations
          .filter((rel) => duplicateLocationIdSet.has(rel.fromId) || duplicateLocationIdSet.has(rel.toId))
          .map((rel) => rel.id);

        setPreview({
          locations: validLocations,
          relations: validRelations,
          duplicateLocationIds,
          newLocationIds,
          duplicateRelationIds,
          newRelationIds,
          totalLocationCount: validLocations.length,
          totalRelationCount: validRelations.length,
          invalidLocationCount,
          invalidRelationCount,
          internalDuplicateLocationCount,
          internalDuplicateRelationCount,
          skippedLocationCount: invalidLocationCount + internalDuplicateLocationCount,
          skippedRelationCount: invalidRelationCount + internalDuplicateRelationCount + orphanRelations.length,
          orphanRelations,
          relationsReferencingDuplicateLocations,
        });
      } catch {
        setError('读取文件时发生未知错误');
      }
    };

    reader.onerror = () => {
      setError('读取文件失败');
    };

    reader.readAsText(file);
  }, [locations, relations, parseImportData]);

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

  const buildExportData = (type: ExportDataType = exportType, filteredOnly: boolean = effectiveFilteredOnly): ExportData => {
    const locationsToExport = filteredOnly ? getFilteredLocations() : exportLocations();
    const relationsToExport = filteredOnly ? getFilteredRelations() : exportRelations();
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      locations: type === 'relations' ? [] : locationsToExport,
      relations: type === 'locations' ? [] : relationsToExport,
    };
  };

  const handleExport = (type: ExportDataType = exportType, filteredOnly = effectiveFilteredOnly) => {
    setExportType(type);
    setExportFilteredOnly(filteredOnly);
    const data = buildExportData(type, filteredOnly);
    const hasLocations = data.locations.length > 0;
    const hasRelations = data.relations.length > 0;

    if (!hasLocations && !hasRelations) {
      setConfirmDialog('export-empty');
      return;
    }

    doExport(data);
    setShowExportMenu(false);
  };

  const doExport = (data: ExportData | DreamLocation[]) => {
    const jsonData = Array.isArray(data) ? data : data;
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dream-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const previewLocationStats = useMemo(() => {
    if (!preview) return { added: 0, willUpdate: 0, willSkip: 0, willSaveAsNew: 0 };
    const added = preview.newLocationIds.length;
    const duplicateCount = preview.duplicateLocationIds.length;
    let willUpdate = 0;
    let willSkip = 0;
    let willSaveAsNew = 0;
    if (locationDefaultResolution === 'overwrite') willUpdate = duplicateCount;
    else if (locationDefaultResolution === 'skip') willSkip = duplicateCount;
    else willSaveAsNew = duplicateCount;
    return { added, willUpdate, willSkip, willSaveAsNew };
  }, [preview, locationDefaultResolution]);

  const previewRelationStats = useMemo(() => {
    if (!preview) return { added: 0, willUpdate: 0, willSkip: 0, willSaveAsNew: 0, willRemapRefs: 0 };
    const added = preview.newRelationIds.length;
    const duplicateCount = preview.duplicateRelationIds.length;
    let willUpdate = 0;
    let willSkip = 0;
    let willSaveAsNew = 0;
    if (relationDefaultResolution === 'overwrite') willUpdate = duplicateCount;
    else if (relationDefaultResolution === 'skip') willSkip = duplicateCount;
    else willSaveAsNew = duplicateCount;
    const willRemapRefs = locationDefaultResolution === 'saveAsNew' ? preview.relationsReferencingDuplicateLocations.length : 0;
    return { added, willUpdate, willSkip, willSaveAsNew, willRemapRefs };
  }, [preview, relationDefaultResolution, locationDefaultResolution]);

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

    const locationResolutions: LocationConflictResolutions = { default: locationDefaultResolution };
    const relationResolutions: RelationConflictResolutions = { default: relationDefaultResolution };

    const locationResult = importLocations(preview.locations, importMode, locationResolutions);
    const relationResult = importRelations(preview.relations, importMode, relationResolutions, locationResult.idRemap);

    setImportResult({
      locations: {
        added: locationResult.added,
        updated: locationResult.updated,
        skipped: locationResult.skipped + preview.invalidLocationCount + preview.internalDuplicateLocationCount,
        savedAsNew: locationResult.savedAsNew,
      },
      relations: {
        added: relationResult.added,
        updated: relationResult.updated,
        skipped: relationResult.skipped + preview.invalidRelationCount + preview.internalDuplicateRelationCount + preview.orphanRelations.length,
        savedAsNew: relationResult.savedAsNew,
        remapped: relationResult.locationRefRemappedCount,
      },
    });
    setConfirmDialog(null);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setPreview(null);
    setError(null);
    setImportResult(null);
    setImportMode('merge');
    setConfirmDialog(null);
    setLocationDefaultResolution('overwrite');
    setRelationDefaultResolution('overwrite');
  };

  const openDialog = () => {
    setShowDialog(true);
    setPreview(null);
    setError(null);
    setImportResult(null);
    setImportMode('merge');
    setConfirmDialog(null);
    setLocationDefaultResolution('overwrite');
    setRelationDefaultResolution('overwrite');
  };

  const handleConfirm = () => {
    if (confirmDialog === 'replace') {
      doImport();
    } else if (confirmDialog === 'export-empty') {
      doExport(buildExportData());
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
      message = `此操作将删除当前所有 ${locations.length} 个梦境地点和 ${relations.length} 条关系，并用导入的数据完全替换。此操作不可撤销！`;
      confirmText = '确认替换';
      isDanger = true;
    } else if (confirmDialog === 'export-empty') {
      title = '当前没有梦境数据';
      message = '目前还没有记录任何梦境数据，导出的文件将为空。是否继续导出？';
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
      <div className="flex items-center gap-2 relative">
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="p-2.5 rounded-xl text-purple-200/70 bg-white/5 border border-purple-300/20 hover:text-purple-100 hover:bg-white/10 transition-all group"
            title="导出梦境数据"
          >
            <Download size={18} className="transition-transform group-hover:-translate-y-0.5" />
          </button>

          {showExportMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowExportMenu(false)}
              />
              <div
                className="absolute top-full right-0 mt-2 w-60 rounded-xl overflow-hidden z-50 animate-scale-in"
                style={{
                  background: `linear-gradient(145deg, ${hexToRgba('#1e1e3f', 0.98)} 0%, ${hexToRgba('#0f0f2a', 0.99)} 100%)`,
                  border: '1px solid rgba(150, 130, 200, 0.2)',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                }}
              >
                {hasActiveFilters && (
                  <>
                    <div className="px-4 py-2 border-b border-purple-300/10 bg-purple-500/5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Filter size={12} className="text-purple-300" />
                        <span className="text-[11px] font-medium text-purple-300/70 uppercase tracking-wider">
                          导出筛选结果
                        </span>
                      </div>
                      <p className="text-[10px] text-purple-300/40">
                        当前筛选：{filteredCount.locations} 个地点 · {filteredCount.relations} 条关系
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        handleExport('all', true);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-purple-100 hover:bg-purple-500/10 transition-colors flex items-center gap-2 border-b border-purple-300/5"
                    >
                      <FileJson size={16} className="text-purple-300" />
                      <div className="flex-1">
                        <span>地点及关系</span>
                        <span className="text-[10px] text-purple-300/50 ml-2">
                          {filteredCount.locations} + {filteredCount.relations}
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        handleExport('locations', true);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-purple-100/80 hover:bg-white/10 transition-colors flex items-center gap-2 border-b border-purple-300/5"
                    >
                      <MapPin size={16} className="text-purple-300" />
                      <div className="flex-1">
                        <span>仅地点</span>
                        <span className="text-[10px] text-purple-300/50 ml-2">
                          {filteredCount.locations} 个
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        handleExport('relations', true);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-purple-100/80 hover:bg-white/10 transition-colors flex items-center gap-2"
                    >
                      <Link size={16} className="text-purple-300" />
                      <div className="flex-1">
                        <span>仅关系</span>
                        <span className="text-[10px] text-purple-300/50 ml-2">
                          {filteredCount.relations} 条
                        </span>
                      </div>
                    </button>

                    <div className="h-px bg-purple-300/10" />
                  </>
                )}

                <div className="px-4 py-2 border-b border-purple-300/10">
                  <span className="text-[11px] font-medium text-purple-300/50 uppercase tracking-wider">
                    全部导出
                  </span>
                </div>

                <button
                  onClick={() => {
                    handleExport('all', false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-purple-100/80 hover:bg-white/10 transition-colors flex items-center gap-2 border-b border-purple-300/5"
                >
                  <FileJson size={16} className="text-purple-300/60" />
                  <div className="flex-1">
                    <span>全部数据</span>
                    <span className="text-[10px] text-purple-300/40 ml-2">
                      {locations.length} + {relations.length}
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    handleExport('locations', false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-purple-100/80 hover:bg-white/10 transition-colors flex items-center gap-2 border-b border-purple-300/5"
                >
                  <MapPin size={16} className="text-purple-300/60" />
                  <div className="flex-1">
                    <span>仅地点</span>
                    <span className="text-[10px] text-purple-300/40 ml-2">
                      {locations.length} 个
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    handleExport('relations', false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-purple-100/80 hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <Link size={16} className="text-purple-300/60" />
                  <div className="flex-1">
                    <span>仅关系</span>
                    <span className="text-[10px] text-purple-300/40 ml-2">
                      {relations.length} 条
                    </span>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>

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
                      <div className="text-xs text-green-300/70 mt-2 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <MapPin size={12} />
                          <span>地点：</span>
                          {importResult.locations.added > 0 && <span className="text-green-300">新增 {importResult.locations.added}</span>}
                          {importResult.locations.updated > 0 && <span className="text-yellow-300">，更新 {importResult.locations.updated}</span>}
                          {importResult.locations.savedAsNew > 0 && <span className="text-blue-300">，另存 {importResult.locations.savedAsNew}</span>}
                          {importResult.locations.skipped > 0 && <span className="text-gray-400">，跳过 {importResult.locations.skipped}</span>}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link size={12} />
                          <span>关系：</span>
                          {importResult.relations.added > 0 && <span className="text-green-300">新增 {importResult.relations.added}</span>}
                          {importResult.relations.updated > 0 && <span className="text-yellow-300">，更新 {importResult.relations.updated}</span>}
                          {importResult.relations.savedAsNew > 0 && <span className="text-blue-300">，另存 {importResult.relations.savedAsNew}</span>}
                          {importResult.relations.remapped > 0 && <span className="text-cyan-300">，重映射 {importResult.relations.remapped}</span>}
                          {importResult.relations.skipped > 0 && <span className="text-gray-400">，跳过 {importResult.relations.skipped}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!preview && !importResult && (
                <div className="space-y-4">
                  <p className="text-sm text-purple-200/70">
                    选择一个 JSON 文件来导入梦境数据。支持导入地点和关系，导入时可以选择合并或替换现有数据。
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
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin size={14} className="text-purple-300" />
                        <p className="text-sm font-medium text-purple-200">地点</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="p-2 rounded-lg bg-white/5">
                          <p className="text-lg font-serif text-green-300">{importMode === 'replace' ? preview.locations.length : previewLocationStats.added}</p>
                          <p className="text-[10px] text-green-300/70">新增</p>
                        </div>
                        {importMode === 'merge' && previewLocationStats.willUpdate > 0 && (
                          <div className="p-2 rounded-lg bg-white/5">
                            <p className="text-lg font-serif text-yellow-300">{previewLocationStats.willUpdate}</p>
                            <p className="text-[10px] text-yellow-300/70">覆盖</p>
                          </div>
                        )}
                        {importMode === 'merge' && previewLocationStats.willSaveAsNew > 0 && (
                          <div className="p-2 rounded-lg bg-white/5">
                            <p className="text-lg font-serif text-blue-300">{previewLocationStats.willSaveAsNew}</p>
                            <p className="text-[10px] text-blue-300/70">另存</p>
                          </div>
                        )}
                        {importMode === 'merge' && previewLocationStats.willSkip > 0 && (
                          <div className="p-2 rounded-lg bg-white/5">
                            <p className="text-lg font-serif text-gray-400">{previewLocationStats.willSkip}</p>
                            <p className="text-[10px] text-gray-400/70">跳过</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Link size={14} className="text-blue-300" />
                        <p className="text-sm font-medium text-blue-200">关系</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="p-2 rounded-lg bg-white/5">
                          <p className="text-lg font-serif text-green-300">{importMode === 'replace' ? preview.relations.length : previewRelationStats.added}</p>
                          <p className="text-[10px] text-green-300/70">新增</p>
                        </div>
                        {importMode === 'merge' && previewRelationStats.willUpdate > 0 && (
                          <div className="p-2 rounded-lg bg-white/5">
                            <p className="text-lg font-serif text-yellow-300">{previewRelationStats.willUpdate}</p>
                            <p className="text-[10px] text-yellow-300/70">覆盖</p>
                          </div>
                        )}
                        {importMode === 'merge' && previewRelationStats.willSaveAsNew > 0 && (
                          <div className="p-2 rounded-lg bg-white/5">
                            <p className="text-lg font-serif text-blue-300">{previewRelationStats.willSaveAsNew}</p>
                            <p className="text-[10px] text-blue-300/70">另存</p>
                          </div>
                        )}
                        {importMode === 'merge' && previewRelationStats.willSkip > 0 && (
                          <div className="p-2 rounded-lg bg-white/5">
                            <p className="text-lg font-serif text-gray-400">{previewRelationStats.willSkip}</p>
                            <p className="text-[10px] text-gray-400/70">跳过</p>
                          </div>
                        )}
                        {importMode === 'merge' && previewRelationStats.willRemapRefs > 0 && (
                          <div className="p-2 rounded-lg bg-white/5">
                            <p className="text-lg font-serif text-cyan-300">{previewRelationStats.willRemapRefs}</p>
                            <p className="text-[10px] text-cyan-300/70">重映射</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {(preview.skippedLocationCount > 0 || preview.skippedRelationCount > 0) && (
                    <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                      <div className="flex items-start gap-3">
                        <AlertTriangle size={18} className="text-orange-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-orange-300">
                            无效数据将被跳过
                          </p>
                          <p className="text-xs text-orange-300/70 mt-1 space-y-0.5">
                            {preview.skippedLocationCount > 0 && (
                              <span className="block">地点：{preview.skippedLocationCount} 条（无效 {preview.invalidLocationCount} + 文件内重复 {preview.internalDuplicateLocationCount}）</span>
                            )}
                            {preview.skippedRelationCount > 0 && (
                              <span className="block">关系：{preview.skippedRelationCount} 条（无效 {preview.invalidRelationCount} + 文件内重复 {preview.internalDuplicateRelationCount} + 孤立 {preview.orphanRelations.length}）</span>
                            )}
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
                            保留现有数据，可针对重复 ID 选择冲突处理策略。
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
                            删除所有现有梦境地点和关系，用导入的数据完全替换。此操作不可撤销！
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {importMode === 'merge' && (preview.duplicateLocationIds.length > 0 || preview.duplicateRelationIds.length > 0) && (
                    <div className="space-y-4">
                      <p className="text-sm font-medium text-purple-200 flex items-center gap-2">
                        <AlertTriangle size={14} className="text-yellow-400" />
                        冲突处理策略
                      </p>

                      {preview.duplicateLocationIds.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-purple-300/70">
                            发现 <span className="text-yellow-300 font-medium">{preview.duplicateLocationIds.length}</span> 个重复地点 ID，选择处理方式：
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {([
                              { value: 'skip', label: '跳过', icon: SkipForward, color: 'gray' },
                              { value: 'overwrite', label: '覆盖', icon: RefreshCw, color: 'yellow' },
                              { value: 'saveAsNew', label: '另存为新', icon: Copy, color: 'blue' },
                            ] as const).map(({ value, label, icon: Icon, color }) => (
                              <label
                                key={value}
                                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl cursor-pointer transition-all border ${
                                  locationDefaultResolution === value
                                    ? color === 'gray'
                                      ? 'bg-gray-500/20 border-gray-400/40'
                                      : color === 'yellow'
                                      ? 'bg-yellow-500/20 border-yellow-400/40'
                                      : 'bg-blue-500/20 border-blue-400/40'
                                    : 'bg-white/5 border-purple-300/15 hover:bg-white/10'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="location-resolution"
                                  value={value}
                                  checked={locationDefaultResolution === value}
                                  onChange={() => setLocationDefaultResolution(value)}
                                  className="sr-only"
                                />
                                <Icon
                                  size={16}
                                  className={
                                    color === 'gray'
                                      ? 'text-gray-300'
                                      : color === 'yellow'
                                      ? 'text-yellow-300'
                                      : 'text-blue-300'
                                  }
                                />
                                <span
                                  className={`text-xs font-medium ${
                                    color === 'gray'
                                      ? 'text-gray-200'
                                      : color === 'yellow'
                                      ? 'text-yellow-200'
                                      : 'text-blue-200'
                                  }`}
                                >
                                  {label}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {preview.duplicateRelationIds.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-purple-300/70">
                            发现 <span className="text-yellow-300 font-medium">{preview.duplicateRelationIds.length}</span> 条重复关系 ID，选择处理方式：
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {([
                              { value: 'skip', label: '跳过', icon: SkipForward, color: 'gray' },
                              { value: 'overwrite', label: '覆盖', icon: RefreshCw, color: 'yellow' },
                              { value: 'saveAsNew', label: '另存为新', icon: Copy, color: 'blue' },
                            ] as const).map(({ value, label, icon: Icon, color }) => (
                              <label
                                key={value}
                                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl cursor-pointer transition-all border ${
                                  relationDefaultResolution === value
                                    ? color === 'gray'
                                      ? 'bg-gray-500/20 border-gray-400/40'
                                      : color === 'yellow'
                                      ? 'bg-yellow-500/20 border-yellow-400/40'
                                      : 'bg-blue-500/20 border-blue-400/40'
                                    : 'bg-white/5 border-purple-300/15 hover:bg-white/10'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="relation-resolution"
                                  value={value}
                                  checked={relationDefaultResolution === value}
                                  onChange={() => setRelationDefaultResolution(value)}
                                  className="sr-only"
                                />
                                <Icon
                                  size={16}
                                  className={
                                    color === 'gray'
                                      ? 'text-gray-300'
                                      : color === 'yellow'
                                      ? 'text-yellow-300'
                                      : 'text-blue-300'
                                  }
                                />
                                <span
                                  className={`text-xs font-medium ${
                                    color === 'gray'
                                      ? 'text-gray-200'
                                      : color === 'yellow'
                                      ? 'text-yellow-200'
                                      : 'text-blue-200'
                                  }`}
                                >
                                  {label}
                                </span>
                              </label>
                            ))}
                          </div>
                          {locationDefaultResolution === 'saveAsNew' && preview.relationsReferencingDuplicateLocations.length > 0 && (
                            <p className="text-[11px] text-blue-300/70 flex items-start gap-1.5">
                              <Check size={12} className="mt-0.5 flex-shrink-0" />
                              将有 <span className="text-cyan-300 font-medium">{preview.relationsReferencingDuplicateLocations.length}</span> 条关系的地点引用会自动同步到新 ID。
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="max-h-48 overflow-y-auto rounded-xl bg-white/5 border border-purple-300/10">
                    <div className="p-3 border-b border-purple-300/10">
                      <p className="text-xs font-medium text-purple-200/60">
                        地点预览（前 {Math.min(preview.locations.length, 3)} 条）
                      </p>
                    </div>
                    <div className="divide-y divide-purple-300/5">
                      {preview.locations.slice(0, 3).map((loc) => (
                        <div key={loc.id} className="p-3 space-y-1">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: loc.emotionColor }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white truncate">{loc.name}</p>
                            </div>
                            {preview.duplicateLocationIds.includes(loc.id) && (
                              <span className="text-xs text-yellow-400/70 flex-shrink-0 px-2 py-0.5 rounded-full bg-yellow-500/10">
                                重复
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {preview.locations.length > 3 && (
                      <div className="p-2 text-center">
                        <p className="text-xs text-purple-300/40">
                          还有 {preview.locations.length - 3} 个地点未显示
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
