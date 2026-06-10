import { useState, useMemo } from 'react';
import { X, Check, Tags, CircleDot, Layers, Sparkles } from 'lucide-react';
import { useDreamStore, filterLocations } from '@/store/dreamStore';
import { applyLayout, LAYOUT_INFO, LayoutType } from '@/utils/layouts';
import { hexToRgba } from '@/utils/storage';

interface LayoutDialogProps {
  open: boolean;
  onClose: () => void;
  onApplied?: (description: string) => void;
}

export function LayoutDialog({ open, onClose, onApplied }: LayoutDialogProps) {
  const locations = useDreamStore((state) => state.locations);
  const relations = useDreamStore((state) => state.relations);
  const filters = useDreamStore((state) => state.filters);
  const applyLayoutToLocations = useDreamStore((state) => state.applyLayoutToLocations);

  const [selectedLayout, setSelectedLayout] = useState<LayoutType>('tag-cluster');
  const [isApplying, setIsApplying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const filteredLocations = useMemo(
    () => filterLocations(locations, relations, filters),
    [locations, relations, filters]
  );

  const hasActiveFilters =
    !!filters.searchText.trim() ||
    !!filters.frequency ||
    filters.selectedTags.length > 0 ||
    filters.selectedPeople.length > 0 ||
    filters.selectedRelationTypes.length > 0;

  const targetLocations = hasActiveFilters ? filteredLocations : locations;

  const preview = useMemo(() => {
    if (targetLocations.length === 0) return null;
    return applyLayout(selectedLayout, targetLocations);
  }, [selectedLayout, targetLocations]);

  if (!open) return null;

  const handleClose = () => {
    setIsConfirming(false);
    onClose();
  };

  const handleApply = () => {
    if (!preview || preview.positions.size === 0) return;
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }
    setIsApplying(true);
    setTimeout(() => {
      applyLayoutToLocations(preview.positions);
      setIsApplying(false);
      setIsSuccess(true);
      setIsConfirming(false);
      setTimeout(() => {
        setIsSuccess(false);
        onApplied?.(preview.description);
        handleClose();
      }, 500);
    }, 300);
  };

  const getLayoutIcon = (type: LayoutType) => {
    switch (type) {
      case 'tag-cluster':
        return <Tags size={22} />;
      case 'frequency-ring':
        return <CircleDot size={22} />;
      case 'time-layer':
        return <Layers size={22} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div
        className="relative w-full max-w-lg rounded-2xl animate-scale-in overflow-hidden"
        style={{
          background: `linear-gradient(145deg, ${hexToRgba('#1e1e3f', 0.95)} 0%, ${hexToRgba('#0f0f2a', 0.98)} 100%)`,
          border: '1px solid rgba(150, 130, 200, 0.2)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 100px rgba(100, 50, 150, 0.2)',
        }}
      >
        <div
          className="relative h-20 flex items-center justify-between px-6"
          style={{
            background: `linear-gradient(135deg, ${hexToRgba('#8b5cf6', 0.25)} 0%, transparent 100%)`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: hexToRgba('#8b5cf6', 0.3),
                border: `1px solid ${hexToRgba('#8b5cf6', 0.5)}`,
              }}
            >
              <Sparkles size={20} className="text-purple-200" />
            </div>
            <div>
              <h2 className="text-lg font-serif text-white">自动布局</h2>
              <p className="text-xs text-purple-300/60">
                选择一种方式整理你的梦境地点
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 gap-3">
            {(Object.keys(LAYOUT_INFO) as LayoutType[]).map((type) => {
              const info = LAYOUT_INFO[type];
              const isSelected = selectedLayout === type;
              return (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedLayout(type);
                    setIsConfirming(false);
                  }}
                  className={`relative p-4 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-purple-500/20 border-purple-400/50'
                      : 'bg-white/5 border-purple-300/15 hover:bg-white/10'
                  }`}
                  style={{
                    border: `1px solid ${
                      isSelected
                        ? hexToRgba('#8b5cf6', 0.5)
                        : hexToRgba('#9b87c8', 0.15)
                    }`,
                    boxShadow: isSelected
                      ? `0 0 30px ${hexToRgba('#8b5cf6', 0.2)}`
                      : 'none',
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected
                          ? 'text-purple-100'
                          : 'text-purple-300/70'
                      }`}
                      style={{
                        backgroundColor: isSelected
                          ? hexToRgba('#8b5cf6', 0.35)
                          : hexToRgba('#ffffff', 0.05),
                        border: `1px solid ${
                          isSelected
                            ? hexToRgba('#8b5cf6', 0.6)
                            : hexToRgba('#9b87c8', 0.2)
                        }`,
                      }}
                    >
                      {getLayoutIcon(type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium ${
                            isSelected ? 'text-white' : 'text-purple-100'
                          }`}
                        >
                          {info.name}
                        </span>
                        {isSelected && (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{
                              backgroundColor: '#8b5cf6',
                            }}
                          >
                            <Check size={12} className="text-white" />
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-purple-300/60 mt-1 leading-relaxed">
                        {info.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div
            className="p-4 rounded-xl"
            style={{
              backgroundColor: hexToRgba('#ffffff', 0.03),
              border: `1px solid ${hexToRgba('#9b87c8', 0.12)}`,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-purple-300/60">布局预览</span>
              <span className="text-xs text-purple-200/80 font-mono">
                {targetLocations.length} 个地点
              </span>
            </div>
            <p className="text-sm text-purple-100/90">
              {preview?.description || (hasActiveFilters ? '当前筛选条件下没有可见地点' : '暂无可用地点')}
            </p>
            {hasActiveFilters && targetLocations.length > 0 ? (
              <p className="text-xs text-amber-300/70 mt-2">
                ⚠ 当前有筛选条件激活，将仅对可见节点应用布局
              </p>
            ) : null}
            {hasActiveFilters && targetLocations.length === 0 ? (
              <p className="text-xs text-amber-300/70 mt-2">
                当前筛选条件下没有可见节点，请调整筛选后再应用布局
              </p>
            ) : null}
            {isConfirming && preview ? (
              <p className="text-xs text-purple-100/80 mt-3 p-3 rounded-lg bg-purple-500/15 border border-purple-300/20">
                确认要应用「{LAYOUT_INFO[selectedLayout].name}」吗？这会更新 {targetLocations.length} 个地点的坐标并保存。
              </p>
            ) : null}
          </div>

          <div className="pt-2 flex gap-3">
            <button
              onClick={handleClose}
              disabled={isApplying || isSuccess}
              className="flex-1 py-3 px-4 rounded-lg text-sm font-medium text-purple-200/70 bg-white/5 border border-purple-300/20 hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              onClick={handleApply}
              disabled={!preview || preview.positions.size === 0 || isApplying || isSuccess}
              className="flex-1 py-3 px-4 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                backgroundColor: isSuccess ? '#10b981' : '#8b5cf6',
                boxShadow: isSuccess
                  ? '0 4px 15px rgba(16, 185, 129, 0.4)'
                  : `0 4px 15px ${hexToRgba('#8b5cf6', 0.4)}`,
              }}
            >
              {isSuccess ? (
                <>
                  <Check size={16} />
                  应用成功
                </>
              ) : isApplying ? (
                <>
                  <Sparkles size={16} className="animate-spin" />
                  应用中...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  {isConfirming ? '确认应用' : '应用布局'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
